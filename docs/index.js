const startYear = 2000;
const currentYear = new Date().getFullYear();
const yearsPerPage = 10;
let currentPage = 1;
// Albums can be created ahead of time (e.g. 2027 before it arrives), so the
// grid starts from the highest existing future year rather than the calendar
// year. Resolved on load by probing upward from currentYear.
let topYear = currentYear;

function checkFolderExists(year) {
    return fetch(`./year/${year}/input.txt`)
        .then(response => response.status !== 404)
        .catch(() => false);
}

// Probe currentYear+1, +2, … to include albums created for future years.
async function resolveTopYear() {
    let y = currentYear;
    for (let ahead = currentYear + 1; ahead <= currentYear + 10; ahead++) {
        if (await checkFolderExists(ahead)) y = ahead;
        else break;
    }
    topYear = y;
}

function loadYears(page) {
    const yearList = document.getElementById('yearList');
    yearList.innerHTML = '';

    const start = (page - 1) * yearsPerPage;
    const end = start + yearsPerPage;

    const promises = [];
    for (let year = topYear - start; year > topYear - end && year >= startYear; year--) {
        promises.push(checkFolderExists(year).then(exists => ({ year, exists })));
    }

    Promise.all(promises).then(years => {
        years.forEach(year => {
            const li = document.createElement('li');
            li.className = 'year-item';
            if (year.exists) {
                const a = document.createElement('a');
                a.className = 'year-card available';
                a.href = `./year/${year.year}/${year.year}.html`;
                a.innerHTML = `<span class="year-number">${year.year}</span><span class="year-label">View album</span>`;
                li.appendChild(a);
            } else {
                const card = document.createElement('span');
                card.className = 'year-card unavailable';
                card.innerHTML = `<span class="year-number">${year.year}</span><span class="year-label">Coming soon</span>`;
                li.appendChild(card);
            }
            yearList.appendChild(li);
        });

        const availableCount = years.filter(y => y.exists).length;
        const statusText = document.getElementById('statusText');
        if (statusText) {
            statusText.textContent =
                `${years.length} items, ${availableCount} album${availableCount === 1 ? '' : 's'} available`;
        }

        document.getElementById('prevBtn').disabled = page === 1;
        document.getElementById('nextBtn').disabled = end >= (topYear - startYear + 1);
    });
}

document.getElementById('prevBtn').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        loadYears(currentPage);
    }
});

document.getElementById('nextBtn').addEventListener('click', () => {
    if (currentPage * yearsPerPage < (topYear - startYear + 1)) {
        currentPage++;
        loadYears(currentPage);
    }
});

// 초기 로드
resolveTopYear().then(() => loadYears(currentPage));
