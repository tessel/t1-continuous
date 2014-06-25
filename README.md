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
