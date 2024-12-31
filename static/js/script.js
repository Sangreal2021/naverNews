let allArticles = [];
let currentLocalPage = 1;
const pageSize = 10; // 한 페이지당 10개

function initSearch() {
    const selectBox = document.getElementById('max_pages');
    const maxPages = parseInt(selectBox.value) || 1;
    const keyword = document.getElementById('keyword').value.trim();

    if (!keyword) {
        alert('검색어를 입력하세요.');
        return;
    }

    allArticles = [];
    currentLocalPage = 1;

    const resultsDiv = document.getElementById('results');
    const loadingDiv = document.getElementById('loading');
    resultsDiv.innerHTML = '';
    loadingDiv.classList.remove('hidden');

    fetch('/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: keyword, max_pages: maxPages })
    })
    .then(response => response.json())
    .then(data => {
        loadingDiv.classList.add('hidden');
        if (data.error) {
            resultsDiv.innerHTML = `<p>${data.error}</p>`;
            hidePagination();
            return;
        }

        allArticles = data.results;
        renderLocalPage(); // 첫 로컬 페이지 렌더
    })
    .catch(error => {
        loadingDiv.classList.add('hidden');
        console.error('오류 발생:', error);
        resultsDiv.innerHTML = '<p>검색 중 오류가 발생했습니다.</p>';
        hidePagination();
    });
}

// 로컬 페이지(페이지네이션)
function renderLocalPage() {
    const resultsDiv = document.getElementById('results');
    const paginationDiv = document.getElementById('pagination');
    const pageInfoSpan = document.getElementById('pageInfo');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');

    resultsDiv.innerHTML = '';

    const totalArticles = allArticles.length;
    if (totalArticles === 0) {
        resultsDiv.innerHTML = '<p>검색 결과가 없습니다.</p>';
        hidePagination();
        return;
    }

    const totalLocalPages = Math.ceil(totalArticles / pageSize);

    if (currentLocalPage > totalLocalPages) currentLocalPage = totalLocalPages;
    if (currentLocalPage < 1) currentLocalPage = 1;

    const startIndex = (currentLocalPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageArticles = allArticles.slice(startIndex, endIndex);

    pageArticles.forEach(item => {
        const newsDiv = document.createElement('div');
        newsDiv.className = 'news-item';

        // 제목 + 링크
        const titleEl = document.createElement('h2');
        const linkEl = document.createElement('a');
        linkEl.href = item.link;
        linkEl.target = '_blank';
        linkEl.textContent = item.title;
        titleEl.appendChild(linkEl);

        // 언론사명
        const mediaEl = document.createElement('p');
        mediaEl.textContent = `언론사: ${item.media}`;

        // 작성일
        const pubDateEl = document.createElement('p');
        pubDateEl.textContent = `작성일: ${item.pubDate}`;

        // 설명
        const descEl = document.createElement('p');
        descEl.textContent = item.description;

        newsDiv.appendChild(titleEl);
        newsDiv.appendChild(mediaEl);
        newsDiv.appendChild(pubDateEl);
        newsDiv.appendChild(descEl);

        resultsDiv.appendChild(newsDiv);
    });

    pageInfoSpan.textContent = `페이지 ${currentLocalPage} / ${totalLocalPages}`;
    prevBtn.disabled = (currentLocalPage <= 1);
    nextBtn.disabled = (currentLocalPage >= totalLocalPages);

    paginationDiv.classList.remove('hidden');
}

function prevPage() {
    if (currentLocalPage > 1) {
        currentLocalPage--;
        renderLocalPage();
    }
}

function nextPage() {
    const totalLocalPages = Math.ceil(allArticles.length / pageSize);
    if (currentLocalPage < totalLocalPages) {
        currentLocalPage++;
        renderLocalPage();
    }
}

function hidePagination() {
    document.getElementById('pagination').classList.add('hidden');
}
