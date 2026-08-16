/* =========================================================================
 * Admin panel — manage year folders and photos directly from the browser
 * using the GitHub API. No backend required; runs on GitHub Pages.
 *
 * The repo owner supplies a fine-grained personal access token (Contents:
 * read & write, scoped to this repo). It is kept only in localStorage and
 * used to commit changes via the Git Data API, so each action is a single
 * atomic commit (image + regenerated input.txt together, large files ok).
 * ========================================================================= */
(function () {
    'use strict';

    const REPO = { owner: 'leemgs', name: 'with-people', branch: 'main' };
    const YEAR_BASE = 'docs/year';          // path within the repo
    const TEMPLATE_PATH = 'docs/year/template.html';
    const TOKEN_KEY = 'wp_gh_token';
    const MIN_YEAR = 2000;
    const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'tif', 'tiff', 'heic', 'avif'];

    let token = localStorage.getItem(TOKEN_KEY) || '';

    // ----- small DOM helpers -------------------------------------------------
    const $ = (id) => document.getElementById(id);
    const el = {};
    function cacheEls() {
        ['adminMenu', 'adminOverlay', 'adminClose', 'tokenInput', 'connectBtn',
         'disconnectBtn', 'connStatus', 'createSection', 'newYearSelect',
         'createYearBtn', 'createStatus', 'manageSection', 'manageYearSelect',
         'uploadInput', 'uploadBtn', 'uploadQueue', 'manageStatus',
         'photoList'].forEach(id => { el[id] = $(id); });
    }
    function setStatus(node, msg, kind) {
        node.textContent = msg || '';
        node.className = 'admin-status' + (kind ? ' ' + kind : '');
    }
    function isImage(name) {
        const ext = name.split('.').pop().toLowerCase();
        return IMAGE_EXTS.includes(ext);
    }

    // ----- base64 (UTF-8 safe for text; byte-exact for binary) ---------------
    function textToBase64(str) {
        return btoa(unescape(encodeURIComponent(str)));
    }
    function bytesToBase64(bytes) {
        let binary = '';
        const chunk = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
        }
        return btoa(binary);
    }

    // ----- GitHub REST helper ------------------------------------------------
    async function gh(path, options) {
        options = options || {};
        let res;
        try {
            res = await fetch('https://api.github.com' + path, {
                method: options.method || 'GET',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Accept': 'application/vnd.github+json',
                    'X-GitHub-Api-Version': '2022-11-28'
                },
                body: options.body ? JSON.stringify(options.body) : undefined
            });
        } catch (e) {
            throw new Error('Could not reach the GitHub API. Check your network or browser privacy settings and try again.');
        }
        if (!res.ok) {
            let detail = '';
            try { detail = (await res.json()).message || ''; } catch (e) { /* ignore */ }
            throw new Error(`GitHub API ${res.status}: ${detail || res.statusText}`);
        }
        return res.status === 204 ? null : res.json();
    }

    // GitHub treats the repository endpoint with a trailing slash as a
    // different (404) route. Keep the base URL slash-free when p is empty.
    const repoPath = (p) => `/repos/${REPO.owner}/${REPO.name}${p ? `/${p}` : ''}`;

    // List entries of a repo directory ([] if it does not exist).
    async function listDir(dirPath) {
        try {
            return await gh(repoPath(`contents/${dirPath}?ref=${REPO.branch}`));
        } catch (e) {
            if (/404/.test(e.message)) return [];
            throw e;
        }
    }

    /* Commit one or more file changes as a single commit via the Git Data API.
     * changes: [{ path, base64 } | { path, blobSha } | { path, remove: true }]
     */
    async function commitChanges(changes, message) {
        const ref = await gh(repoPath(`git/ref/heads/${REPO.branch}`));
        const baseSha = ref.object.sha;
        const baseCommit = await gh(repoPath(`git/commits/${baseSha}`));

        const tree = [];
        for (const c of changes) {
            if (c.remove) {
                tree.push({ path: c.path, mode: '100644', type: 'blob', sha: null });
            } else if (c.blobSha) {
                tree.push({ path: c.path, mode: '100644', type: 'blob', sha: c.blobSha });
            } else {
                const blob = await gh(repoPath('git/blobs'), {
                    method: 'POST', body: { content: c.base64, encoding: 'base64' }
                });
                tree.push({ path: c.path, mode: '100644', type: 'blob', sha: blob.sha });
            }
        }

        const newTree = await gh(repoPath('git/trees'), {
            method: 'POST', body: { base_tree: baseCommit.tree.sha, tree }
        });
        const newCommit = await gh(repoPath('git/commits'), {
            method: 'POST', body: { message, tree: newTree.sha, parents: [baseSha] }
        });
        await gh(repoPath(`git/refs/heads/${REPO.branch}`), {
            method: 'PATCH', body: { sha: newCommit.sha }
        });
    }

    // Sorted image list for a year -> input.txt content (matches input_generate.py).
    function buildInputTxt(imageNames) {
        return imageNames.slice().sort().map(n => n).join('\n') + (imageNames.length ? '\n' : '');
    }

    async function imagesForYear(year) {
        const entries = await listDir(`${YEAR_BASE}/${year}`);
        return entries.filter(e => e.type === 'file' && isImage(e.name));
    }

    // ----- data: which year folders already exist ---------------------------
    let existingYears = [];
    async function loadExistingYears() {
        const entries = await listDir(YEAR_BASE);
        existingYears = entries
            .filter(e => e.type === 'dir' && /^\d{4}$/.test(e.name))
            .map(e => parseInt(e.name, 10))
            .sort((a, b) => b - a);
        return existingYears;
    }

    // ----- UI: connection ----------------------------------------------------
    function reflectConnection() {
        const connected = !!token;
        el.disconnectBtn.hidden = !connected;
        el.connectBtn.textContent = connected ? 'Update token' : 'Connect';
        el.createSection.hidden = !connected;
        el.manageSection.hidden = !connected;
        if (connected) el.tokenInput.value = '';
    }

    async function connect() {
        const val = el.tokenInput.value.trim();
        if (val) token = val;
        if (!token) { setStatus(el.connStatus, 'Please paste a token first.', 'err'); return; }
        setStatus(el.connStatus, 'Verifying token…');
        try {
            const repo = await gh(repoPath(''));
            if (!repo.permissions || !repo.permissions.push) {
                throw new Error('This token cannot write to the repo (needs Contents: write).');
            }
            localStorage.setItem(TOKEN_KEY, token);
            setStatus(el.connStatus, `Connected as writer to ${repo.full_name}.`, 'ok');
            reflectConnection();
            await refreshYears();
        } catch (e) {
            token = '';
            localStorage.removeItem(TOKEN_KEY);
            reflectConnection();
            setStatus(el.connStatus, e.message, 'err');
        }
    }

    function disconnect() {
        token = '';
        localStorage.removeItem(TOKEN_KEY);
        setStatus(el.connStatus, 'Disconnected. Token removed from this browser.', 'ok');
        reflectConnection();
    }

    // ----- UI: year selectors ------------------------------------------------
    async function refreshYears() {
        await loadExistingYears();
        // New-year candidates: any year from MIN_YEAR..(thisYear+3) not yet present.
        const thisYear = new Date().getFullYear();
        const have = new Set(existingYears);
        const candidates = [];
        for (let y = thisYear + 3; y >= MIN_YEAR; y--) {
            if (!have.has(y)) candidates.push(y);
        }
        el.newYearSelect.innerHTML = candidates
            .map(y => `<option value="${y}">${y}</option>`).join('');

        el.manageYearSelect.innerHTML = existingYears
            .map(y => `<option value="${y}">${y}</option>`).join('');
        if (existingYears.length) await loadPhotos();
        else el.photoList.innerHTML = '';
    }

    // ----- create a new year -------------------------------------------------
    async function createYear() {
        const year = el.newYearSelect.value;
        if (!year) return;
        el.createYearBtn.disabled = true;
        setStatus(el.createStatus, `Creating ${year}…`);
        try {
            const res = await fetch(TEMPLATE_PATH.replace(/^docs\//, ''));
            if (!res.ok) throw new Error('Could not load year template.');
            const templateHtml = await res.text();
            await commitChanges([
                { path: `${YEAR_BASE}/${year}/${year}.html`, base64: textToBase64(templateHtml) },
                { path: `${YEAR_BASE}/${year}/input.txt`, base64: textToBase64('') }
            ], `Create ${year} album folder`);
            setStatus(el.createStatus, `Created ${year}. (GitHub Pages may take ~1 min to publish.)`, 'ok');
            await refreshYears();
            el.manageYearSelect.value = year;
            await loadPhotos();
        } catch (e) {
            setStatus(el.createStatus, e.message, 'err');
        } finally {
            el.createYearBtn.disabled = false;
        }
    }

    // ----- list photos of the selected year ----------------------------------
    async function loadPhotos() {
        const year = el.manageYearSelect.value;
        if (!year) { el.photoList.innerHTML = ''; return; }
        setStatus(el.manageStatus, 'Loading photos…');
        try {
            const imgs = await imagesForYear(year);
            renderPhotos(year, imgs);
            setStatus(el.manageStatus,
                `${imgs.length} photo${imgs.length === 1 ? '' : 's'} in ${year}.`, 'ok');
        } catch (e) {
            setStatus(el.manageStatus, e.message, 'err');
        }
    }

    function renderPhotos(year, imgs) {
        if (!imgs.length) {
            el.photoList.innerHTML = '<li class="photo-empty">No photos yet — upload some above.</li>';
            return;
        }
        el.photoList.innerHTML = '';
        imgs.slice().sort((a, b) => a.name.localeCompare(b.name)).forEach(img => {
            const li = document.createElement('li');
            li.className = 'photo-item';

            const thumbnail = document.createElement('img');
            thumbnail.className = 'photo-thumb';
            thumbnail.src = `./year/${year}/${encodeURIComponent(img.name)}?v=${img.sha}`;
            thumbnail.alt = '';
            thumbnail.loading = 'lazy';

            const name = document.createElement('span');
            name.className = 'photo-name';
            name.textContent = img.name;

            const actions = document.createElement('span');
            actions.className = 'photo-actions';
            const replaceButton = actionButton('Replace', () => replacePhoto(year, img));
            const renameButton = actionButton('Rename', () => renamePhoto(year, img));
            const deleteButton = actionButton('Delete', () => deletePhoto(year, img), 'danger');
            actions.append(replaceButton, renameButton, deleteButton);
            li.append(thumbnail, name, actions);
            el.photoList.appendChild(li);
        });
    }

    function actionButton(label, onClick, kind) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `admin-btn small${kind ? ` ${kind}` : ''}`;
        button.textContent = label;
        button.addEventListener('click', onClick);
        return button;
    }

    // ----- upload ------------------------------------------------------------
    let pendingUploads = [];

    function clearUploadQueue() {
        pendingUploads = [];
        el.uploadInput.value = '';
        el.uploadQueue.innerHTML = '';
        el.uploadBtn.disabled = true;
    }

    function stageUploadFiles(fileList) {
        pendingUploads = Array.from(fileList)
            .filter(file => isImage(file.name))
            .map(file => ({ file, name: file.name }));
        el.uploadQueue.innerHTML = '';

        pendingUploads.forEach((upload, index) => {
            const item = document.createElement('li');
            item.className = 'upload-queue-item';
            const label = document.createElement('label');
            label.textContent = `File ${index + 1}`;
            const input = document.createElement('input');
            input.type = 'text';
            input.value = upload.name;
            input.setAttribute('aria-label', `Filename for ${upload.file.name}`);
            input.addEventListener('input', () => { upload.name = input.value.trim(); });
            label.appendChild(input);
            item.appendChild(label);
            el.uploadQueue.appendChild(item);
        });

        el.uploadBtn.disabled = !pendingUploads.length;
        setStatus(el.manageStatus, pendingUploads.length
            ? `Review ${pendingUploads.length} filename(s), then click Upload selected.`
            : 'Choose one or more supported image files.', pendingUploads.length ? '' : 'err');
    }

    function validateUploadNames(uploads, existingNames) {
        const names = uploads.map(upload => upload.name);
        if (names.some(name => !name || name === '.' || name === '..' || /[\\/]/.test(name))) {
            throw new Error('Each image needs a valid filename without / or \\.');
        }
        if (names.some(name => !isImage(name))) {
            throw new Error('Every filename must end with a supported image extension.');
        }
        const changedExtension = uploads.find(upload =>
            upload.name.split('.').pop().toLowerCase() !== upload.file.name.split('.').pop().toLowerCase());
        if (changedExtension) {
            throw new Error(`Keep the .${changedExtension.file.name.split('.').pop().toLowerCase()} extension for ${changedExtension.file.name}.`);
        }
        if (new Set(names).size !== names.length) {
            throw new Error('Selected images must use unique filenames.');
        }
        const conflict = names.find(name => existingNames.includes(name));
        if (conflict) {
            throw new Error(`"${conflict}" already exists. Choose another name or use Replace.`);
        }
        return names;
    }

    async function uploadFiles() {
        const year = el.manageYearSelect.value;
        if (!year || !pendingUploads.length) {
            setStatus(el.manageStatus, 'Select a year and image files first.', 'err');
            return;
        }
        el.uploadBtn.disabled = true;
        setStatus(el.manageStatus, `Uploading ${pendingUploads.length} file(s)…`);
        try {
            const current = (await imagesForYear(year)).map(image => image.name);
            const names = validateUploadNames(pendingUploads, current);
            const changes = [];
            for (const upload of pendingUploads) {
                const buf = new Uint8Array(await upload.file.arrayBuffer());
                changes.push({ path: `${YEAR_BASE}/${year}/${upload.name}`, base64: bytesToBase64(buf) });
            }
            // regenerate input.txt from current + newly uploaded names
            changes.push({ path: `${YEAR_BASE}/${year}/input.txt`,
                base64: textToBase64(buildInputTxt(current.concat(names))) });

            await commitChanges(changes, `Add ${pendingUploads.length} photo(s) to ${year}`);
            setStatus(el.manageStatus, `Uploaded ${pendingUploads.length} file(s).`, 'ok');
            clearUploadQueue();
            await loadPhotos();
        } catch (e) {
            setStatus(el.manageStatus, e.message, 'err');
            el.uploadBtn.disabled = false;
        }
    }

    // ----- replace image contents while preserving its published URL --------
    function chooseReplacement(img) {
        return new Promise(resolve => {
            const picker = document.createElement('input');
            picker.type = 'file';
            picker.accept = `.${img.name.split('.').pop()},image/*`;
            picker.addEventListener('change', () => resolve(picker.files[0] || null), { once: true });
            picker.addEventListener('cancel', () => resolve(null), { once: true });
            picker.click();
        });
    }

    async function replacePhoto(year, img) {
        const file = await chooseReplacement(img);
        if (!file) return;

        const currentExt = img.name.split('.').pop().toLowerCase();
        const replacementExt = file.name.split('.').pop().toLowerCase();
        if (currentExt !== replacementExt) {
            setStatus(el.manageStatus,
                `Choose a .${currentExt} file to replace ${img.name}, or upload it as a new photo.`, 'err');
            return;
        }

        setStatus(el.manageStatus, `Replacing ${img.name}…`);
        try {
            const bytes = new Uint8Array(await file.arrayBuffer());
            await commitChanges([
                { path: `${YEAR_BASE}/${year}/${img.name}`, base64: bytesToBase64(bytes) }
            ], `Replace ${img.name} in ${year}`);
            setStatus(el.manageStatus, `Replaced ${img.name}.`, 'ok');
            await loadPhotos();
        } catch (e) {
            setStatus(el.manageStatus, e.message, 'err');
        }
    }

    // ----- delete ------------------------------------------------------------
    async function deletePhoto(year, img) {
        if (!confirm(`Delete "${img.name}" from ${year}? This cannot be undone.`)) return;
        setStatus(el.manageStatus, `Deleting ${img.name}…`);
        try {
            const remaining = (await imagesForYear(year))
                .map(i => i.name).filter(n => n !== img.name);
            await commitChanges([
                { path: `${YEAR_BASE}/${year}/${img.name}`, remove: true },
                { path: `${YEAR_BASE}/${year}/input.txt`, base64: textToBase64(buildInputTxt(remaining)) }
            ], `Delete ${img.name} from ${year}`);
            setStatus(el.manageStatus, `Deleted ${img.name}.`, 'ok');
            await loadPhotos();
        } catch (e) {
            setStatus(el.manageStatus, e.message, 'err');
        }
    }

    // ----- rename (reuse the existing blob at a new path, then drop the old) --
    async function renamePhoto(year, img) {
        const ext = img.name.includes('.') ? img.name.split('.').pop() : '';
        const proposed = img.name;
        const input = prompt(`Rename "${img.name}" to:`, proposed);
        if (input === null) return;
        const newName = input.trim();
        if (!newName || newName === img.name) return;
        if (!isImage(newName)) {
            setStatus(el.manageStatus, `New name must keep an image extension (e.g. .${ext || 'jpg'}).`, 'err');
            return;
        }
        setStatus(el.manageStatus, `Renaming to ${newName}…`);
        try {
            const names = (await imagesForYear(year)).map(i => i.name);
            if (names.includes(newName)) throw new Error(`"${newName}" already exists.`);
            const updated = names.filter(n => n !== img.name).concat(newName);
            await commitChanges([
                { path: `${YEAR_BASE}/${year}/${newName}`, blobSha: img.sha },   // content-addressed: reuse blob
                { path: `${YEAR_BASE}/${year}/${img.name}`, remove: true },
                { path: `${YEAR_BASE}/${year}/input.txt`, base64: textToBase64(buildInputTxt(updated)) }
            ], `Rename ${img.name} -> ${newName} in ${year}`);
            setStatus(el.manageStatus, `Renamed to ${newName}.`, 'ok');
            await loadPhotos();
        } catch (e) {
            setStatus(el.manageStatus, e.message, 'err');
        }
    }

    // ----- open / close ------------------------------------------------------
    function openAdmin() {
        el.adminOverlay.hidden = false;
        reflectConnection();
        if (token) { connect(); }   // auto-verify stored token & load years
    }
    function closeAdmin() { el.adminOverlay.hidden = true; }

    // ----- wire up -----------------------------------------------------------
    document.addEventListener('DOMContentLoaded', function () {
        cacheEls();
        el.adminMenu.addEventListener('click', openAdmin);
        el.adminClose.addEventListener('click', closeAdmin);
        el.adminOverlay.addEventListener('click', (e) => {
            if (e.target === el.adminOverlay) closeAdmin();
        });
        el.connectBtn.addEventListener('click', connect);
        el.disconnectBtn.addEventListener('click', disconnect);
        el.createYearBtn.addEventListener('click', createYear);
        el.manageYearSelect.addEventListener('change', () => {
            clearUploadQueue();
            loadPhotos();
        });
        el.uploadInput.addEventListener('change', (e) => stageUploadFiles(e.target.files));
        el.uploadBtn.addEventListener('click', uploadFiles);
    });
})();
