require('shelljs/global')

var semver = require('semver')
var witwip = require('witwip');
var fs = require('fs');

String.prototype.splitlines = function () {
	return this.split(/\r?\n/g).filter(function (line) {
		return line.length;
	});
}

// cd('repo')

// Get a list of tags.
var tags = exec('git tag -l', {silent: true}).output.splitlines().filter(function (tag) {
	return semver.valid(tag);
}).sort().reverse();

// Get current tag.
var latest = tags[0] || 'v0.0.1';

// From list of commits since previous tag, determine next version bump.
var since = exec('git rev-list ' + latest + '..HEAD --oneline', {silent: true}).output.splitlines();

var next = latest;
var hasmajor = since.some(function (line) {
	return line.indexOf('[major]') > -1;
}) ? 1 : 0;
var hasminor = since.some(function (line) {
	return line.indexOf('[minor]') > -1;
}) ? 1 : 0;
var haspatch = since.length;

if (hasmajor) {
	next = semver.inc(next, 'major');
} else if (hasminor) {
	next = semver.inc(next, 'minor');
} else if (haspatch) {
	next = semver.inc(next, 'patch');
}
next = next.replace(/^v?/, 'v');

// Output.
console.log(next);
if (semver.eq(next, latest)) {
	console.error('(version exists, checking out now.)')
	exec('git reset --hard ' + next, {silent: true});
	process.exit(0);
}
console.error('(version doesn\'t exist, creating.)')

// If we need to update package.json and tag a release, do so.
witwip(process.cwd(), function (err, pkgPath, pkgData) {
	if (err) {
		console.error('Error in tagversion.js:', err);
	}
	if (typeof pkgPath == 'string') {
		pkgData = require(pkgPath);
		pkgData.version = next;
		fs.writeFileSync(pkgPath, JSON.stringify(pkgData, null, '  ') + '\n', 'utf-8');
		exec('git add package.json', {silent: true})
		exec('git commit -m ' + next, {silent: true})
		exec('git tag -a ' + next + ' -m ' + next, {silent: true})
	}
})
