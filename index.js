const startYear = 2000;
const currentYear = new Date().getFullYear();
const yearsPerPage = 10;
let currentPage = 1;

function checkFolderExists(year) {
    return fetch(`./${year}/input.txt`)
        .then(response => {
            if (response.status === 404) {
                return false;
            } else {
                return true;
            }
        })
        .catch(() => false);
}

function loadYears(page) {
    const yearList = document.getElementById('yearList');
    yearList.innerHTML = '';

    const start = (page - 1) * yearsPerPage;
    const end = start + yearsPerPage;

    const promises = [];
    for (let year = currentYear - start; year > currentYear - end && year >= startYear; year--) {
        promises.push(checkFolderExists(year).then(exists => ({ year, exists })));
    }

    Promise.all(promises).then(years => {
        years.forEach(year => {
            const li = document.createElement('li');
            li.className = 'year-item';
            if (year.exists) {
                const a = document.createElement('a');
                a.className = 'year-card available';
                a.href = `./${year.year}/${year.year}.html`;
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
        document.getElementById('nextBtn').disabled = end >= (currentYear - startYear + 1);
    });
}

document.getElementById('prevBtn').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        loadYears(currentPage);
    }
});

document.getElementById('nextBtn').addEventListener('click', () => {
    if (currentPage * yearsPerPage < (currentYear - startYear + 1)) {
        currentPage++;
        loadYears(currentPage);
    }
});

// 초기 로드
loadYears(currentPage);
