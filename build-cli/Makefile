CLI_BRANCH := master

clean:
	rm -rf out stage

clone:
	npm cache clean
	npm install

	rm -rf stage || true
	mkdir -p stage || true
	cd stage ;\
		git clone https://github.com/tessel/cli.git package -b $(CLI_BRANCH)

	# Install all platform extensions for now.
	# Strip git dpeendencies to not have trouble on reinstall.
	cd stage/package ;\
		../../lib/npm-altcheck.js install --ignore-scripts --loglevel=http --force

build: clean clone
	# Create staging folder
	mkdir -p out || true

	# Bundle all dependencies and tag version.
	../node_modules/.bin/bundle-deps stage/package
	cd stage/package ;\
		git add package.json ;\
		node ../../../tagversion.js

	# Package tessel-cli as a tar achive manually (not using npm pack)
	cd stage ;\
		tar --exclude="./.git" --exclude="./.bin" -cvf tessel-cli.tar.gz package

	# Move to root staging folder
	mkdir -p ../stage || true
	cp stage/tessel-cli.tar.gz ../stage

	echo 'Build success, output at continuous/stage/tessel-cli.tar.gz'

	cd stage/package ;\
		LASTCLI=$(shell git tag | egrep "^cli\-\d+\-\d+\-\d+$" | sort -r | head -n 1) ;\
		echo "# Changes since $(LASTCLI)\n" > ../../../stage/tessel-cli-changelog.md ;\
		git log "$(LASTCLI)..master" --pretty="* [%h](https://github.com/tessel/cli/commit/%h) %s" >> ../../../stage/tessel-cli-changelog.md ;\
		echo 'Compiled changelog.'

test:
	cd stage/package ;\
		npm test

publish:
	echo 'Pushing cli tag...'
	cd stage/package ;\
		npm publish || true ;\
		git push origin "$(shell make read-tag)" -f ;\
		git push origin master


# READING

read-commit:
	@cd stage/package && \
		git rev-parse HEAD

read-tag:
	@cd stage/package && \
		git describe
