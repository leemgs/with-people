# with-people
Photo collection to archive memorable recollection in my life.

<li><a href=https://leemgs.github.io/with-people/>https://leemgs.github.io/with-people/</a></li>


# Getting Started

This project provides a web album system that allows users to easily manage their yearly photos automatically, without any coding, using free GitHub resources. Users only need to submit a Pull Request (PR) uploading their photos to year-specific folders. Once the PR is merged, all the necessary work for displaying the photos on the website is performed automatically.

## Supported image formats

The gallery supports a wide range of image formats (case-insensitive):

`*.jpg`, `*.jpeg`, `*.png`, `*.gif`, `*.bmp`, `*.webp`, `*.svg`, `*.tif`, `*.tiff`, `*.heic`, `*.avif`

Here's the simple procedure for users:

1. Let's assume you have a photo taken with your camera, named 20260918-140030.jpg (or any supported format such as 20260918-140030.png).
2. Upload this image file to the ./docs/year/2026/ folder.
3. Click the "Create a Pull Request" button.
4. After review, click the "Merge a Pull Request" button to merge the uploaded PR.
5. That's it! In about 3 minutes, when you access the website, you'll see your uploaded photo displayed in your web album.

This easy process allows you to maintain and showcase your yearly photo collections effortlessly through a simple GitHub workflow.

## Project layout

The published website lives under [`docs/`](docs/) (served by GitHub Pages),
while build tooling stays at the repository root:

```
docs/                     ← the website (GitHub Pages root)
  index.html/.css/.js     ← landing page (Linux Mint file-manager UI)
  admin.js                ← browser admin panel (see below)
  year/
    template.html         ← reusable, year-agnostic album page
    2009/ … 2026/         ← one folder per year: <YYYY>.html + input.txt + images
input_generate.py         ← regenerates input.txt for a year folder
.github/workflows/        ← auto-runs input_generate.py after a PR merge
```

> **GitHub Pages setting:** Settings → Pages → *Deploy from a branch* →
> branch `main`, folder **`/docs`**. Then the site is served at
> `https://leemgs.github.io/with-people/`.

## Admin panel (create years & manage photos from the browser)

Instead of editing files in the repo by hand, the site owner can click
**🔒 Admin** in the menu bar to:

1. **Connect** with a GitHub **fine-grained personal access token** scoped to
   this repository with **Contents: Read and write**. The token is stored only
   in your browser (`localStorage`) and is never committed — treat it like a
   password and don't use it on a shared computer.
2. **Create a new year** — pick a year (e.g. `2027`) from the dropdown; the
   folder, a copy of `year/template.html`, and an empty `input.txt` are
   committed for you.
3. **Manage photos** — upload, delete, or rename images for a year. `input.txt`
   is regenerated automatically on every change, and each action is a single
   commit via the GitHub API.

The classic PR-based workflow above still works; the admin panel is just a
faster path for the repository owner.
