**[UNMAINTAINED] This library does not have a maintainer. The source code and repository will be kept at this URL indefinitely. If you'd like to help maintain this codebase, create an issue on this repo explaining why you'd like to become a maintainer and tag @tessel/maintainers in the body.**

# Build scripts for Tessel CLI and Firmware

To publish, you need an .env.json file in this directory that looks like:

```js
{
"cloudfront":"...",
"region": ".",
"accessKeyId": "...",
"secretAccessKey": "..."
}
```

## Use

```
make build
make test
make publish-dry
make publish
```

To test, requires a Tessel plugged in.
