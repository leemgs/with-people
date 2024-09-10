#!/usr/bin/env bash

# Check if an argument is provided
if [ $# -eq 0 ]; then
    echo "Error: Please provide a year as an argument."
    echo "Usage: $0 <year>"
    exit 1
fi

year_dir=$1

echo -e "[DEBUG]### Fetching change from the GitHub repo..."
git pull
cd ./year_dir/
ls -1 *.jpg > ./input.txt
echo -e "[DEBUG]### The input.txt file is generated as follows."
pwd
cat ./input.txt
echo -e "[DEBUG]### Commiting new changes ..........."
git add . 
git commit -a -s -m "added input.txt for image gallery"
echo -e "[DEBUG]### Uploading new change into the GitHub repo..."
git push origin
cd ..
