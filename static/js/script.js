let allArticles = [];
let currentLocalPage = 1;
const pageSize = 10;

function initSearch() {
  const maxPagesSelect = document.getElementById('max_pages');
  const maxPages = parseInt(maxPagesSelect.value) || 1;
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
  loadingDiv.classList.remove('d-none');

  fetch('/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyword: keyword, max_pages: maxPages })
  })
  .then(response => response.json())
  .then(data => {
    loadingDiv.classList.add('d-none');

    if (data.error) {
      resultsDiv.innerHTML = `<div class="alert alert-warning">${data.error}</div>`;
      hidePagination();
      return;
    }

    allArticles = data.results;
    renderLocalPage();
    renderPagination();
  })
  .catch(error => {
    loadingDiv.classList.add('d-none');
    console.error('오류 발생:', error);
    resultsDiv.innerHTML = `<div class="alert alert-danger">검색 중 오류가 발생했습니다.</div>`;
    hidePagination();
  });
}

function renderLocalPage() {
  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = '';

  const total = allArticles.length;
  if (total === 0) {
    resultsDiv.innerHTML = `<div class="alert alert-info">검색 결과가 없습니다.</div>`;
    hidePagination();
    return;
  }

  const totalLocalPages = Math.ceil(total / pageSize);
  if (currentLocalPage < 1) currentLocalPage = 1;
  if (currentLocalPage > totalLocalPages) currentLocalPage = totalLocalPages;

  const startIndex = (currentLocalPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const pageArticles = allArticles.slice(startIndex, endIndex);

  pageArticles.forEach(item => {
    // Bootstrap Card
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card news-card';

    const cardBody = document.createElement('div');
    cardBody.className = 'card-body';

    // 언론사/작성일 상단
    const topLineDiv = document.createElement('div');
    topLineDiv.className = 'mb-2 d-flex align-items-center';

    // 언론사
    const mediaBadge = document.createElement('span');
    mediaBadge.className = 'media-badge me-2';
    mediaBadge.textContent = item.media || '언론사 없음';

    // 작성일
    const dateEl = document.createElement('span');
    dateEl.className = 'text-muted small';
    dateEl.textContent = `작성일: ${item.pubDate}`;

    topLineDiv.appendChild(mediaBadge);
    topLineDiv.appendChild(dateEl);

    // 제목
    const titleEl = document.createElement('h5');
    titleEl.className = 'card-title mt-2 news-title';

    const linkEl = document.createElement('a');
    linkEl.href = item.link;
    linkEl.target = '_blank';
    linkEl.textContent = item.title;
    titleEl.appendChild(linkEl);

    // 설명
    const descEl = document.createElement('p');
    descEl.className = 'card-text mt-2';
    descEl.textContent = item.description;

    cardBody.appendChild(topLineDiv);
    cardBody.appendChild(titleEl);
    cardBody.appendChild(descEl);

    cardDiv.appendChild(cardBody);
    resultsDiv.appendChild(cardDiv);
  });
}

function renderPagination() {
  const paginationDiv = document.getElementById('pagination');
  const paginationUl = document.getElementById('pagination-ul');

  const total = allArticles.length;
  if (total === 0) {
    hidePagination();
    return;
  }

  const totalLocalPages = Math.ceil(total / pageSize);
  if (totalLocalPages <= 1) {
    hidePagination();
    return;
  }

  paginationDiv.classList.remove('d-none');
  paginationUl.innerHTML = '';

  // createPageItem for Bootstrap pagination
  function createPageItem(text, disabled, active, onClick) {
    const li = document.createElement('li');
    li.className = 'page-item';
    if (disabled) li.classList.add('disabled');
    if (active) li.classList.add('active');
  
    const btn = document.createElement('button');
    btn.className = 'page-link custom-page-link'; 
    // custom 클래스 추가
  
    btn.type = 'button';
    btn.textContent = text;
    if (!disabled) {
      btn.addEventListener('click', onClick);
    }
  
    li.appendChild(btn);
    return li;
  }

  // 맨 앞
  paginationUl.appendChild(
    createPageItem('<<', currentLocalPage===1, false, () => {
      currentLocalPage = 1;
      renderLocalPage();
      renderPagination();
    })
  );

  // 이전
  paginationUl.appendChild(
    createPageItem('<', currentLocalPage===1, false, () => {
      if (currentLocalPage>1) {
        currentLocalPage--;
        renderLocalPage();
        renderPagination();
      }
    })
  );

  // 페이지 번호 (1..n)
  for (let i=1; i<=totalLocalPages; i++) {
    paginationUl.appendChild(
      createPageItem(
        i, 
        false, 
        (i===currentLocalPage),
        () => {
          currentLocalPage = i;
          renderLocalPage();
          renderPagination();
        }
      )
    );
  }

  // 다음
  paginationUl.appendChild(
    createPageItem('>', currentLocalPage===totalLocalPages, false, () => {
      if (currentLocalPage<totalLocalPages) {
        currentLocalPage++;
        renderLocalPage();
        renderPagination();
      }
    })
  );

  // 맨 끝
  paginationUl.appendChild(
    createPageItem('>>', currentLocalPage===totalLocalPages, false, () => {
      currentLocalPage = totalLocalPages;
      renderLocalPage();
      renderPagination();
    })
  );
}

function hidePagination() {
  const paginationDiv = document.getElementById('pagination');
  paginationDiv.classList.add('d-none');
  const paginationUl = document.getElementById('pagination-ul');
  if (paginationUl) paginationUl.innerHTML = '';
}
