#!/usr/bin/env python3
"""Generate a sorted input.txt of image files for a year folder, then commit and push it.

Usage: input_generate.py <year>
"""
import os
import subprocess
import sys

# ANSI escape codes for colored output.
BLUE = '\033[94m'
RED = '\033[91m'
RESET = '\033[0m'

# Image formats rendered by the gallery (see <year>/<year>.html). Case-insensitive.
IMAGE_EXTENSIONS = (
    'jpg', 'jpeg', 'png', 'gif', 'bmp',
    'webp', 'svg', 'tif', 'tiff', 'heic', 'avif',
)

INPUT_FILE = 'input.txt'
COMMIT_MESSAGE = 'added sorted input.txt for image gallery'


def log(message):
    print(f"{BLUE}{message}{RESET}")


def error(message):
    print(f"{RED}{message}{RESET}", file=sys.stderr)


def run_command(command, *, allow_failure=False):
    """Run a command given as a list of args (no shell). Returns the CompletedProcess.

    Exits the program on failure unless allow_failure is set.
    """
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode != 0 and not allow_failure:
        error(f"Error executing command: {' '.join(command)}")
        error(result.stderr.strip())
        sys.exit(1)
    return result


def collect_image_files(directory='.'):
    """Return a sorted list of image file names in the given directory."""
    images = [
        entry for entry in os.listdir(directory)
        if os.path.isfile(os.path.join(directory, entry))
        and os.path.splitext(entry)[1].lstrip('.').lower() in IMAGE_EXTENSIONS
    ]
    return sorted(images)


def write_input_file(image_files):
    """Write one image file name per line to INPUT_FILE."""
    with open(INPUT_FILE, 'w', encoding='utf-8') as f:
        for image_file in image_files:
            f.write(f"{image_file}\n")


def main(argv):
    if len(argv) != 2:
        error("Error: Please provide a year as an argument.")
        error(f"Usage: {argv[0]} <year>")
        return 1

    year_dir = argv[1]
    if not os.path.isdir(year_dir):
        error(f"Error: Directory '{year_dir}' not found.")
        return 1

    log("[DEBUG]### Fetching change from the GitHub repo...")
    run_command(["git", "pull"])

    os.chdir(year_dir)

    log("[DEBUG]### Scanning image files...")
    image_files = collect_image_files()
    write_input_file(image_files)

    log(f"[DEBUG]### {INPUT_FILE} generated in {os.getcwd()} ({len(image_files)} images):")
    log("\n".join(image_files) if image_files else "(no image files found)")

    log("[DEBUG]### Committing new changes...")
    run_command(["git", "config", "--global", "user.email", "leemgs@gmail.com"])
    run_command(["git", "config", "--global", "user.name", "Geunsik Lim"])
    run_command(["git", "add", "."])

    commit = run_command(
        ["git", "commit", "-a", "-s", "-m", COMMIT_MESSAGE],
        allow_failure=True,
    )
    if commit.returncode != 0:
        log("[DEBUG]### Nothing to commit; input.txt is already up to date. Skipping push.")
        return 0

    log("[DEBUG]### Uploading new change into the GitHub repo...")
    run_command(["git", "push", "origin"])
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
