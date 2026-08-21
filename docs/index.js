const startYear = 2000;
const currentYear = new Date().getFullYear();
const yearsPerPage = 10;
let currentPage = 1;
// Albums can be created ahead of time (e.g. 2027 before it arrives), so the
// grid starts from the highest existing future year rather than the calendar
// year. Resolved on load by probing upward from currentYear.
let topYear = currentYear;

const LANGUAGE_KEY = 'wp_language';
const translations = {
    en: {
        heroTitle: 'Photo Gallery', heroAccent: 'with My Loved Ones',
        subtitle: 'A curated collection of cherished memories',
        message: "Despite our rigorous selection criteria, congratulations on earning a proud spot in the album of my life's cherished memories. You've made it, and I couldn't be happier to have you as part of these unforgettable moments!",
        browseByYear: 'Browse by Year', previous: 'Previous', next: 'Next',
        browseStatus: 'Browse the albums by year', viewAlbum: 'View album',
        comingSoon: 'Coming soon', albumsAvailable: (total, count) =>
            `${total} items, ${count} album${count === 1 ? '' : 's'} available`,
        languageLabel: 'Language', themeTitle: 'Toggle day / night',
        adminTitle: 'Manage years & photos', day: '☀️ Day', night: '🌙 Night'
    },
    ko: {
        heroTitle: '사진 갤러리', heroAccent: '소중한 사람들과 함께',
        subtitle: '소중한 추억을 정성껏 모은 공간입니다',
        message: '엄선된 소중한 추억의 앨범에 함께해 주신 여러분을 진심으로 환영합니다. 잊지 못할 순간의 한 페이지를 함께 채울 수 있어 정말 행복합니다!',
        browseByYear: '연도별 앨범', previous: '이전', next: '다음',
        browseStatus: '연도별 앨범을 둘러보세요', viewAlbum: '앨범 보기',
        comingSoon: '준비 중', albumsAvailable: (total, count) =>
            `전체 ${total}개 중 ${count}개 앨범을 볼 수 있습니다`,
        languageLabel: '언어 선택', themeTitle: '낮/밤 테마 전환',
        adminTitle: '연도와 사진 관리', day: '☀️ 낮', night: '🌙 밤'
    }
};
let currentLanguage = localStorage.getItem(LANGUAGE_KEY) === 'ko' ? 'ko' : 'en';

function t(key) { return translations[currentLanguage][key]; }

function applyLanguage(language, reloadYears = true) {
    currentLanguage = language === 'ko' ? 'ko' : 'en';
    localStorage.setItem(LANGUAGE_KEY, currentLanguage);
    document.documentElement.lang = currentLanguage;
    document.querySelectorAll('[data-i18n]').forEach(node => {
        node.textContent = t(node.dataset.i18n);
    });
    document.querySelectorAll('.language-option').forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.lang === currentLanguage));
    });
    const languageSwitch = document.querySelector('.language-switch');
    if (languageSwitch) languageSwitch.setAttribute('aria-label', t('languageLabel'));
    const themeToggle = document.getElementById('themeToggle');
    const adminMenu = document.getElementById('adminMenu');
    if (themeToggle) {
        themeToggle.title = t('themeTitle');
        themeToggle.textContent = document.body.classList.contains('night') ? t('day') : t('night');
    }
    if (adminMenu) adminMenu.title = t('adminTitle');
    if (reloadYears && document.getElementById('yearList').children.length) loadYears(currentPage);
}

document.querySelectorAll('.language-option').forEach(button => {
    button.addEventListener('click', () => applyLanguage(button.dataset.lang));
});
applyLanguage(currentLanguage, false);

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
                a.innerHTML = `<span class="year-number">${year.year}</span><span class="year-label">${t('viewAlbum')}</span>`;
                li.appendChild(a);
            } else {
                const card = document.createElement('span');
                card.className = 'year-card unavailable';
                card.innerHTML = `<span class="year-number">${year.year}</span><span class="year-label">${t('comingSoon')}</span>`;
                li.appendChild(card);
            }
            yearList.appendChild(li);
        });

        const availableCount = years.filter(y => y.exists).length;
        const statusText = document.getElementById('statusText');
        if (statusText) {
            statusText.textContent = t('albumsAvailable')(years.length, availableCount);
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
