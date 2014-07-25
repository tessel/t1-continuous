WIFI_VER:=1.28
MIN_CLI:=0.3.0
FIRMWARE_BRANCH:=master


# just names of folders
.PHONY: build-cli build-firmware test builds logs www publish-dry



clean-cli:
	cd build-cli && make clean

build-cli:
	cd build-cli && make build

test-cli:
	cd build-cli && make test






clean-firmware:
	cd build-firmware && make clean

build-firmware:
	cd build-firmware && make build FIRMWARE_BRANCH=$(FIRMWARE_BRANCH)

test-firmware:
	cd build-firmware && make test






clean: clean-cli clean-firmware
	rm -rf stage

build: clean build-cli build-firmware

test: test-cli test-firmware

publish-dry:
	@echo "$(tput setaf 1)Tagging firmware release with wifi version $(WIFI_VER), min cli version $(MIN_CLI) $(tput sgr0)"

	$(eval FIRMWARE_COMMIT=$(shell cd build-firmware && make read-commit))
	$(eval FIRMWARE_TAG=$(shell cd build-firmware && make read-tag))
	$(eval CLI_COMMIT=$(shell cd build-cli && make read-commit))
	$(eval CLI_TAG=$(shell cd build-cli && make read-tag))

	@echo "FIRMWARE_COMMIT=$(FIRMWARE_COMMIT)"
	@echo "FIRMWARE_TAG=$(FIRMWARE_TAG)"
	@echo "CLI_COMMIT=$(CLI_COMMIT)"
	@echo "CLI_TAG=$(CLI_TAG)"

publish: publish-dry
	(cd build-firmware && make publish) || true
	(cd build-cli && make publish) || true

	node publish.js \
		-c "$(CLI_COMMIT)" -C "$(CLI_TAG)" --min "$(MIN_CLI)" \
		-f "$(FIRMWARE_COMMIT)" -F "$(FIRMWARE_TAG)" \
		-w "$(WIFI_VER)"

publish-cli: publish-dry
	(cd build-cli && make publish) || true

	node publish.js \
		-c "$(CLI_COMMIT)" -C "$(CLI_TAG)" --min "$(MIN_CLI)"
