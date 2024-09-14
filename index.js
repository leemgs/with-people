const startYear = 1990;
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
            if (year.exists) {
                const a = document.createElement('a');
                a.href = `./${year.year}/${year.year}.html`;
                a.textContent = `${year.year} Year`;
                li.appendChild(a);
            } else {
                li.textContent = `${year.year} Year (Not Available)`;
            }
            yearList.appendChild(li);
        });

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
