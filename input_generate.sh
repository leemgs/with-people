#!/usr/bin/env bash

ls -1 *.jpg > ./input.txt
echo -e "The input.txt file is generated as follows."
cat ./input.txt

echo -e "sbumitting a new commit ..........."
git add . 
git commit -a -s -m "added input.txt for image gallery"
git push origin
