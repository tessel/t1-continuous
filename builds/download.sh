aws s3 cp s3://builds.tessel.io/builds.json _builds.json
cat _builds.json | python -mjson.tool > builds.json
rm _builds.json
