var fs = require('fs')
	, aws = require('aws-sdk')
  , path = require('path')
  , osenv = require('osenv')
  , crypto = require('crypto')
  ;
// aws.config.loadFromPath(path.join(osenv.home(), "/.aws/config"));
aws.config.loadFromPath('./.env.json');
var configs = JSON.parse(fs.readFileSync('./.env.json'));
var cloudFrontId = configs.cloudfront;

var s3 = new aws.S3();
var cf = new aws.CloudFront();

var bucketPath = 'builds.tessel.io';
var publishKey = "builds.json";
var paths = {cli: "stage/tessel-cli.tar.gz"
  , cliLog: "stage/tessel-cli-changelog.md"
  , firmware: "stage/tessel-firmware.bin"
  , firmwareLog: "stage/tessel-firmware-changelog.md"
  , elf: "stage/tessel-firmware.elf"
  , wifi: "stage/tessel-cc3k-patch.bin"};

var argv = require("nomnom")
  .option('firmware', {
    abbr: 'f',
    help: 'set the firmware version.',
  })
  .option('cli', {
    abbr: 'c',
    help: 'sets the cli version.'
  })
  .option('min', {
    help: 'sets the minimum cli version'
  })
  .option('max', {
    help: 'sets the maximum cli version'
  })
  .option('cache',{
    help: 'sets the cache amount in days. Defaults to 5.'
  })
  .option('wifi', {
    abbr: 'w',
    help: 'sets the wifi version to be matched with firmware'
  })
  .option('refresh', {
    abbr: 'r',
    flag: true,
    help: "refreshes the builds.json file without adding in any new binaries"
  })
  .parse();

var invalidations = [];

if (argv.refresh){
  return getBucket(bucketPath);
}

if (!(argv.firmware && argv.F) && !(argv.cli && argv.C)) return console.log("Specify either firmware or cli version");

// look for the files
function checkFiles(){
  if (!fs.existsSync(path.resolve(paths.cli)) && !fs.existsSync(path.resolve(paths.firmware))) {
    console.log("Either", paths.cli, "or", paths.firmware, "needs to be present");
    return false;
  }

  if (fs.existsSync(path.resolve(paths.cli)) && !fs.existsSync(path.resolve(paths.cliLog))) {
    console.log("Need", paths.cliLog, "to be present");
    return false;
  }

  if (fs.existsSync(path.resolve(paths.firmware)) && (
    !fs.existsSync(path.resolve(paths.firmwareLog)) ||
    !fs.existsSync(path.resolve(paths.elf))
    )) {
    console.log("Need", paths.firmwareLog, "and", paths.elf, "to be present");
    return false;
  }

  return true;
}

// grab list of available builds and build times
function getBucket(bucket, next){
  var jsonBlob = [];

  s3.listObjects({Bucket:bucket, Prefix: "firmware", Delimiter: ".md"}, function(err, s3data){

    if (err) throw err;
    // get the metadata associated with each item
    var count = 0;
    var list = s3data.Contents;
    list.forEach(function(item){
      if (item.Size == 0 || item.Key.indexOf(".bin")  == -1) {
        count++;
        return;
      }
      
      s3.headObject({Bucket:bucket, Key: item.Key}, function(err, head){
        count++;

        jsonBlob.push({url: item.Key
        , modified: new Date(item.LastModified).valueOf()
        , version: head.Metadata.version ? head.Metadata.version : null
        , min_cli: head.Metadata.min_cli ? head.Metadata.min_cli : 0
        , max_cli: head.Metadata.max_cli ? head.Metadata.min_cli : "*"
        , wifi: head.Metadata.wifi ? head.Metadata.wifi : "1.26"});

        if (count >= list.length){
          upload(jsonBlob, publishKey, bucket, function(md5){
            // execute invalidations
            invalidateCache(md5);
          });
        }
      });
      

    });
  });
}

function pushInvalidation(filepath) {
  invalidations.push("/"+filepath);
}

function invalidateCache(hash, next){
  // see http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/CloudFront.html#createInvalidation-property
  var params = {
    DistributionId: cloudFrontId, 
    InvalidationBatch: {
      CallerReference: hash, 
      Paths: {
        Quantity: invalidations.length, 
        Items: invalidations
      }
    }
  };

  cf.createInvalidation(params, function(err, cfres){
    if (err) throw err;

    console.log("Invalidating cache for", invalidations);
    next && next();

  });
}

function upload(slug, key, bucket, next){
  // slug this file over to s3
  var dataBlob = JSON.stringify(slug);

  s3.putObject({
    Bucket: bucket
    , Key: key
    , ACL: "public-read"
    , Body:dataBlob }
  , function(err, s3data){
    if (err) throw err;
    pushInvalidation(key);

    console.log("Done. Updated json blob");
    // use the md5 as the identifier for invalidation
    var md5 = crypto.createHash('md5').update(dataBlob).digest('base64');
    next && next(md5);
  });
}

function fileUpload(filepath, key, bucket, metadata, next) {
  var cache = argv.cache || 5;

  s3.putObject({
    Bucket: bucket
    , Key: key
    , ACL: "public-read"
    , CacheControl: "max-age="+3600*24*cache
    , Metadata:metadata
    , Body:fs.readFileSync(filepath)}
  , function(err, s3data){
    if (err) throw err;
    if (key.indexOf("current") != -1){
      // need to invalidate all things that have "current" in the name
      pushInvalidation(key);
    } 
    console.log("Uploaded", filepath, "to", key, "with metadata", metadata);
    next && next();
  });
}

function getDateString (date) {
  return date.getUTCFullYear()
    + '-' + ('00' + (date.getMonth() + 1)).slice(-2)
    + '-' + ('00' + date.getDate()).slice(-2);
}

function publish(){
  
  if (!checkFiles()) return;
  var files = Object.keys(paths);
  var count = 0;

  argv.wifi = String(argv.wifi);
  // publish firmware, cli, etc
  ['v', 'current'].forEach(function (date) {
    files.forEach(function(fileType){
      if (fs.existsSync(paths[fileType])) {
        var metadata = {};
        var basename = path.basename(paths[fileType]);

        var seg = date;
        if (['firmware', 'firmwareLog'].indexOf(fileType) != -1 ){
          if (seg == 'v') seg = argv.F.replace(/^v/, '');
        } else if(['elf'].indexOf(fileType) != -1){
          if (seg == 'v') seg = argv.F.replace(/^v/, '');
        } else if (['cli', 'cliLog'].indexOf(fileType) != -1){ 
          if (seg == 'v') seg = argv.C.replace(/^v/, '');
        }

        var keyPath = basename.split(".")[0]+"-"+seg+"."+basename.replace(/^[^\.]+\./, '');

        if (['firmware', 'firmwareLog'].indexOf(fileType) != -1 ){
          keyPath = 'firmware/'+keyPath;
        } else if (['cli', 'cliLog'].indexOf(fileType) != -1){
          keyPath = 'cli/'+keyPath;
        } else if(['elf'].indexOf(fileType) != -1){
          keyPath = 'elves/'+keyPath;
        } else if(['wifi'].indexOf(fileType) != -1){
          keyPath = 'wifi/'+argv.wifi+'.bin';
        }

        if (['firmware','elf','firmwareLog'].indexOf(fileType) != -1){
          metadata.version = argv.firmware;
          if (argv.min != undefined) metadata.min_cli = argv.min;
          if (argv.max != undefined) metadata.max_cli = argv.max;
          metadata.wifi = argv.wifi;
        } else if (['cli', 'cliLog'].indexOf(fileType) != -1){
          metadata.version = argv.cli;
        } else if (['wifi'].indexOf(fileType) != -1){
          metadata.wifi = argv.wifi;
        }
        fileUpload(paths[fileType], keyPath, bucketPath, metadata, function(){
          count++;
          if (count >= files.length*2){ // multiply by 2 because there's the "current" date builds and the actual dated builds
            getBucket(bucketPath);
          }
        });
      } else {
        count++;
      }
      
    });
  });
}

publish();
