#!/bin/bash

set -e
rm -rf repo
mkdir repo
cd repo
git init
echo "every rose has its thorn" >> README.md
echo '{"name":"package","version":"v0.0.0"}' >> package.json
git add .
git commit -am "initial commit"
git tag -a v0.0.1 -m "v0.0.1"

echo "just like every night has its dawn" >> README.md
git add .
git commit -am "need to get the people going"
git tag -a v0.0.2 -m "v0.0.2"

echo "every cowboy sings a sad sad song" >> README.md
git add .
git commit -am "what does it mean [major]"
git tag -a vfaketag -m "vfaketag"

# node analyze.js
