#!/usr/bin/env python3

import sys
import os
import subprocess
import glob

def run_command(command):
    process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
    output, error = process.communicate()
    if process.returncode != 0:
        print(f"Error executing command: {command}")
        print(error.decode('utf-8'))
        sys.exit(1)
    return output.decode('utf-8')

if __name__ == "__main__":
    # Check if an argument is provided
    if len(sys.argv) != 2:
        print("Error: Please provide a year as an argument.")
        print(f"Usage: {sys.argv[0]} <year>")
        sys.exit(1)

    year_dir = sys.argv[1]

    print("[DEBUG]### Fetching change from the GitHub repo...")
    run_command("git pull")

    try:
        os.chdir(year_dir)
    except FileNotFoundError:
        print(f"Error: Directory {year_dir} not found.")
        sys.exit(1)

    # Generate input.txt
    with open('input.txt', 'w') as f:
        for jpg_file in glob.glob('*.jpg'):
            f.write(f"{jpg_file}\n")

    print("[DEBUG]### The input.txt file is generated as follows.")
    print(os.getcwd())
    with open('input.txt', 'r') as f:
        print(f.read())

    print("[DEBUG]### Commiting new changes ...........")
    run_command("git config --global user.email 'leemgs@gmail.com'")
    run_command("git config --global user.name 'Geunsik Lim'")
    run_command("git add .")
    run_command('git commit -a -s -m "added input.txt for image gallery"')

    print("[DEBUG]### Uploading new change into the GitHub repo...")
    run_command("git push origin")

    os.chdir('..')
