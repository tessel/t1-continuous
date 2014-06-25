#!/usr/bin/env node
;(function () {

function setPlatformCheck (platform, arch) {
	var checks = require('npm/node_modules/npm-install-checks');
	var checkPlatform = checks.checkPlatform;
	checks.checkPlatform = function () {
		var platcache = process.platform;
		var archcache = process.arch;
		if (platform) process.platform = platform;
		if (arch) process.arch = arch;
		var ret = checkPlatform.apply(this, arguments);
		process.platform = platcache;
		process.arch = archcache;
		return ret;
	}
}

var altplatform = null, altarch = null;
for (var i = 0; i < process.argv.length; i++) {
	if (process.argv[i].match(/^--alt-platform\b/)) {
		altplatform = process.argv[i].split('=')[1];
	} else if (process.argv[i].match(/^--alt-arch\b/)) {
		altarch = process.argv[i].split('=')[1];
	}
}
setPlatformCheck(altplatform, altarch);

// now just run the cli staight up
require('npm/bin/npm-cli');

})();