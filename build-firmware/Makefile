FIRMWARE_BRANCH := master

clean:
	rm -rf out stage

clone:
	npm cache clean
	npm install

	rm -rf stage out
	mkdir -p stage
	cd stage ;\
		git clone https://github.com/tessel/firmware.git -b $(FIRMWARE_BRANCH)
	cd stage/firmware ;\
		make update

build: clean clone
	# Tag version.
	cd stage/firmware ;\
		git reset --hard HEAD ;\
		node ../../../tagversion.js

	# build
	make -C stage/firmware arm 

	# Move to root staging folder
	mkdir -p ../stage || true
	cp stage/firmware/out/Release/tessel-firmware.bin ../stage
	cp stage/firmware/out/Release/tessel-firmware.elf ../stage

	echo 'Build success, output at continuous/stage/tessel-firmware.bin'

	cd stage/firmware ;\
		LASTFIRMWARE=$(git tag | egrep "^firmware\-\d+\-\d+\-\d+$" | sort -r | head -n 1) ;\
		echo "# Changes since $(LASTFIRMWARE)" > ../../../stage/tessel-firmware-changelog.md ;\
		git log "$(LASTFIRMWARE)..master" --pretty="* [%h](https://github.com/tessel/firmware/commit/%h) %s" >> ../../../stage/tessel-firmware-changelog.md ;\
		echo 'Compiled changelog.'

test:
	cd stage/firmware ;\
		make deploy ;\
		sleep 10 ;\
		npm test

publish:
	echo 'Pushing firmware tag...'
	cd stage/firmware ;\
		git push origin "$(shell make read-tag)" -f ;\
		git push origin master


# READING

read-commit:
	@cd stage/firmware && \
		git rev-parse HEAD

read-tag:
	@cd stage/firmware && \
		git describe 
