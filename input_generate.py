#!/usr/bin/env python3
import sys
import os
import subprocess
import glob

# ANSI escape code for blue text
BLUE = '\033[94m'
RESET = '\033[0m'

def print_blue(message):
    print(f"{BLUE}{message}{RESET}")

def run_command(command):
    process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
    output, error = process.communicate()
    if process.returncode != 0:
        print_blue(f"Error executing command: {command}")
        print_blue(error.decode('utf-8'))
        sys.exit(1)
    return output.decode('utf-8')

if __name__ == "__main__":
    # Check if an argument is provided
    if len(sys.argv) != 2:
        print_blue("Error: Please provide a year as an argument.")
        print_blue(f"Usage: {sys.argv[0]} <year>")
        sys.exit(1)

    year_dir = sys.argv[1]

    print_blue("[DEBUG]### Fetching change from the GitHub repo...")
    run_command("git pull")

    try:
        os.chdir(year_dir)
    except FileNotFoundError:
        print_blue(f"Error: Directory {year_dir} not found.")
        sys.exit(1)

    # Generate input.txt with sorted jpg files
    jpg_files = glob.glob('*.jpg')
    sorted_jpg_files = sorted(jpg_files)

    with open('input.txt', 'w') as f:
        for jpg_file in sorted_jpg_files:
            f.write(f"{jpg_file}\n")

    print_blue("[DEBUG]### The input.txt file is generated as follows.")
    print_blue(os.getcwd())
    with open('input.txt', 'r') as f:
        print_blue(f.read())

    print_blue("[DEBUG]### Commiting new changes ...........")
    run_command("git config --global user.email 'leemgs@gmail.com'")
    run_command("git config --global user.name 'Geunsik Lim'")
    run_command("git add .")
    run_command('git commit -a -s -m "added sorted input.txt for image gallery"')

    print_blue("[DEBUG]### Uploading new change into the GitHub repo...")
    run_command("git push origin")

    os.chdir('..')
