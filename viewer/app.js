let vocabularyData = [];

// 📥 데이터 로드
async function init() {
  try {
    const response = await fetch('../viewer/dt/work_list.json');
    vocabularyData = await response.json();

    // 🔥 이미지가 있는 단어만 1차 필터링
    vocabularyData = vocabularyData.filter(item => {
      // L1~L3는 카테고리이므로 유지하되, L4(단어)는 이미지가 있어야 함
      if (item.root_lv === 4) {
        return item.img && item.img.startsWith('../images/');
      }
      return true;
    });

    // 분류 드롭다운 설정
    populateFilters();

    // 전체 렌더링 (L4만)
    renderGrid(vocabularyData.filter(item => item.root_lv === 4));

  } catch (error) {
    console.error('데이터 로드 실패:', error);
    document.getElementById('gridContainer').innerHTML = `
      <div class="no-results">
        데이터를 불러올 수 없습니다. <br>
        (로컬 파일 접근은 웹 서버 실행 시에만 가능할 수 있습니다)
      </div>`;
  }
}

// 🔊 음성 지원 엔진 (TTS)
function speak(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const uttr = new SpeechSynthesisUtterance(text);
    uttr.lang = 'en-US';
    uttr.rate = text.length <= 3 ? 0.75 : 0.9;
    window.speechSynthesis.speak(uttr);
  }
}

// 🔀 필터링 드롭다운 항목 채우기
function populateFilters() {
  const l1Select = document.getElementById('l1_filter');
  const l2Select = document.getElementById('l2_filter');
  const l3Select = document.getElementById('l3_filter');

  // 중복 제거 및 정렬
  const l1Items = [...new Set(vocabularyData.filter(i => i.root_lv === 1).map(i => i))];
  const l2Items = [...new Set(vocabularyData.filter(i => i.root_lv === 2).map(i => i))];
  const l3Items = [...new Set(vocabularyData.filter(i => i.root_lv === 3).map(i => i))];

  // L1 채우기
  l1Items.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.id;
    opt.textContent = item.kor;
    l1Select.appendChild(opt);
  });

  // L2 채우기
  l2Items.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.id;
    opt.textContent = item.kor;
    l2Select.appendChild(opt);
  });

  // L3 채우기
  l3Items.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.id;
    opt.textContent = item.kor;
    l3Select.appendChild(opt);
  });
}

// 🔍 검색 로직 (조합)
function performSearch() {
  const l1Val = document.getElementById('l1_filter').value;
  const l2Val = document.getElementById('l2_filter').value;
  const l3Val = document.getElementById('l3_filter').value;
  const langKey = document.getElementById('lang_filter').value; // 'eng' or 'kor'
  const searchText = document.getElementById('searchInput').value.toLowerCase();

  let filtered = vocabularyData.filter(item => item.root_lv === 4);

  // 1. 분류 필터링 (기계적인 매칭보다 id-parentId 관계를 사용하는게 안전하지만, 현재 데이터 구조상 direct parent 매칭)
  // (실제 데이터는 L4의 parent가 L3이므로 L3 필터링이 우선순위가 높음)
  if (l3Val !== 'all') {
    filtered = filtered.filter(item => item.parent_id === l3Val);
  } else if (l2Val !== 'all') {
    // L2를 부모로 가진 L3들을 찾아서 필터링
    const targetL3Ids = vocabularyData.filter(i => i.parent_id === l2Val).map(i => i.id);
    filtered = filtered.filter(item => targetL3Ids.includes(item.parent_id));
  } else if (l1Val !== 'all') {
    const targetL2Ids = vocabularyData.filter(i => i.parent_id === l1Val).map(i => i.id);
    const targetL3Ids = vocabularyData.filter(i => targetL2Ids.includes(i.parent_id)).map(i => i.id);
    filtered = filtered.filter(item => targetL3Ids.includes(item.parent_id));
  }

  // 2. 검색어 필터링
  if (searchText) {
    filtered = filtered.filter(item => {
      const targetVal = String(item[langKey]).toLowerCase();
      return targetVal.includes(searchText);
    });
  }

  renderGrid(filtered);
}

// 🧱 그리드 렌더링
function renderGrid(data) {
  const container = document.getElementById('gridContainer');
  container.innerHTML = '';

  if (data.length === 0) {
    container.innerHTML = '<div class="no-results">검색 결과가 없습니다.</div>';
    return;
  }

  data.forEach(item => {
    const card = document.createElement('div');
    card.className = 'vocab-card';
    card.onclick = () => speak(item.eng); // 🔥 카드 클릭 시 음성 출력
    card.innerHTML = `
      <div class="icon-wrapper">
        <div class="card-speaker">🔊</div>
        ${item.img
        ? `<img src="..${item.img.replace('.WebP', '.webp')}" loading="lazy" onerror="this.style.display='none';">`
        : `<div class="placeholder-icon">${getIconForParent(item.parent_id)}</div>`
      }
      </div>
      <div class="eng-text">${item.eng}</div>
      <div class="kor-text">${item.kor}</div>
      <div class="level-tag">${item.parent_id}</div>
    `;
    container.appendChild(card);
  });
}

function getIconForParent(parentId) {
  if (parentId.includes('animals')) return '🐾';
  if (parentId.includes('food')) return '🍎';
  if (parentId.includes('school')) return '🏫';
  if (parentId.includes('weather')) return '☁️';
  if (parentId.includes('body')) return '👤';
  return '📁';
}

// 🏁 리스너 등록
document.querySelectorAll('select').forEach(s => s.addEventListener('change', performSearch));
document.getElementById('searchInput').addEventListener('input', performSearch);

// 실행
init();
