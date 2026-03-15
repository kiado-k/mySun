let vocabularyData = [];
let quizList = [];
let unplayedList = [];
let currentQuestion = null;
let timerInterval = null;
let timeLeft = 10;
let startTime = 0;
let isAnswering = false;
let isQuizActive = false;
let stats = { total: 0, correct: 0, wrong: 0, mistakes: [] };
let globalMistakeCounts = {};

// 📊 Google Sheets Integration
const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbypZ9O1FFtN9AmzgaLSKa28tOAHezEce30cK2wf96NggPwRUUN7d_gJKXDnkV_GcLnE/exec';

async function saveToGoogleSheet(wordData) {
  if (!GOOGLE_SHEET_URL || GOOGLE_SHEET_URL.includes('YOUR_WEB_APP_URL')) return;

  try {
    // We send as text/plain + no-cors to avoid CORS preflight while still sending JSON string.
    // Google Apps Script doPost(e) will find the string in e.postData.contents.
    await fetch(GOOGLE_SHEET_URL, {
      method: 'POST',
      mode: 'no-cors',
      cache: 'no-cache',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({
        eng: wordData.eng,
        kor: wordData.kor
      })
    });
    console.log('Successfully requested save to Google Sheets:', wordData.eng);
  } catch (error) {
    console.error('Failed to save to Google Sheets:', error);
  }
}
// UI Elements (Optional references - we will get them safely)
const getEl = (id) => document.getElementById(id);

// Audio Context
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playSound(type) {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  if (type === 'correct') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } else {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  }
}

function speak(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const uttr = new SpeechSynthesisUtterance(text);
    uttr.lang = 'en-US';
    // Short words (3 chars or less) get a slower rate to be more distinct
    uttr.rate = text.length <= 3 ? 0.75 : 0.9;
    window.speechSynthesis.speak(uttr);
  }
}

// 🏁 Init
async function init() {
  try {
    const response = await fetch('../WordQuiz/dt/work_list.json');
    vocabularyData = await response.json();

    // Page specific setups
    if (getEl('l1Filter')) populateFilters();
    if (getEl('quitBtn')) getEl('quitBtn').onclick = finishQuiz;
  } catch (error) {
    console.error('Data loading failed:', error);
  }
}

async function fetchGlobalMistakeCounts() {
  if (!GOOGLE_SHEET_URL) return;
  try {
    const response = await fetch(GOOGLE_SHEET_URL);
    const data = await response.json();
    const counts = {};
    data.forEach(row => {
      const eng = row[1];
      if (eng) counts[eng] = (counts[eng] || 0) + 1;
    });
    globalMistakeCounts = counts;
  } catch (e) {
    console.error('Failed to fetch global mistake counts:', e);
  }
}

async function loadMistakes() {
  const listEl = getEl('globalWrongList');
  if (!listEl) return;

  listEl.innerHTML = '<div class="empty-msg">데이터를 불러오는 중...</div>';
  if (!GOOGLE_SHEET_URL) {
    listEl.innerHTML = '<div class="empty-msg">구글 시트 URL이 설정되지 않았습니다.</div>';
    return;
  }

  try {
    const response = await fetch(GOOGLE_SHEET_URL);
    const data = await response.json();

    listEl.innerHTML = '';
    if (!data || data.length === 0) {
      listEl.innerHTML = '<div class="empty-msg">기록된 오답이 없습니다.</div>';
      return;
    }

    const counts = {};
    const wordMap = {};

    // Aggregate counts from all history
    data.forEach(row => {
      const eng = row[1];
      const kor = row[2];
      if (eng) {
        counts[eng] = (counts[eng] || 0) + 1;
        wordMap[eng] = kor;
      }
    });

    const uniqueMistakes = Object.keys(counts).map(eng => ({
      eng,
      kor: wordMap[eng],
      count: counts[eng]
    })).sort((a, b) => b.count - a.count); // Most missed first

    uniqueMistakes.forEach(item => {
      const div = document.createElement('div');
      div.className = 'wrong-item mistake-row';
      div.innerHTML = `
        <div class="mistake-info-wrapper">
          <span class="m-count badge-small">${item.count}회</span>
          <div class="mistake-text">
            <span class="w-eng">${item.eng}</span>
            <span class="w-kor">${item.kor}</span>
          </div>
        </div>
      `;
      div.onclick = () => speak(item.eng);
      listEl.appendChild(div);
    });
  } catch (error) {
    listEl.innerHTML = '<div class="empty-msg">데이터를 불러오지 못했습니다.</div>';
  }
}

// 🔀 Filter Logic
function populateFilters() {
  const l1Filter = getEl('l1Filter');
  const l2Filter = getEl('l2Filter');
  const l3Filter = getEl('l3Filter');

  const l1Items = vocabularyData.filter(i => i.root_lv === 1);
  l1Items.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.id;
    opt.textContent = `${item.eng} (${item.kor.split('.')[1]?.trim() || item.kor})`;
    l1Filter.appendChild(opt);
  });

  l1Filter.addEventListener('change', () => {
    const val = l1Filter.value;
    l2Filter.innerHTML = '<option value="all">전체 (All)</option>';
    l3Filter.innerHTML = '<option value="all">전체 (All)</option>';
    if (val !== 'all') {
      vocabularyData.filter(i => i.parent_id === val).forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.id;
        opt.textContent = `${item.eng} (${item.kor})`;
        l2Filter.appendChild(opt);
      });
    }
  });

  l2Filter.addEventListener('change', () => {
    const val = l2Filter.value;
    l3Filter.innerHTML = '<option value="all">전체 (All)</option>';
    if (val !== 'all') {
      vocabularyData.filter(i => i.parent_id === val).forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.id;
        opt.textContent = `${item.eng} (${item.kor})`;
        l3Filter.appendChild(opt);
      });
    }
  });
}

// 📝 Next Question
function nextQuestion() {
  if (!isQuizActive) return;
  if (timerInterval) clearInterval(timerInterval);
  isAnswering = false;
  if (!unplayedList || unplayedList.length === 0) {
    // Refill and shuffle when all words have been played
    unplayedList = [...quizList].sort(() => Math.random() - 0.5);
  }

  const target = unplayedList.pop();
  currentQuestion = target;

  setTimeout(() => {
    if (isQuizActive && !isAnswering) speak(target.eng);
  }, 500);

  let candidates = quizList.filter(i => i.parent_id === target.parent_id && i.id !== target.id);
  if (candidates.length < 3) candidates = quizList.filter(i => i.id !== target.id);

  const distractors = candidates.sort(() => Math.random() - 0.5).slice(0, 3);
  const options = [target, ...distractors].sort(() => Math.random() - 0.5);

  const qText = getEl('questionText');
  if (qText) qText.textContent = target.eng;

  const grid = getEl('optionsGrid');
  if (grid) {
    grid.innerHTML = '';
    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.textContent = opt.kor;
      btn.onclick = () => { if (!isAnswering) checkAnswer(opt.id === target.id); };
      grid.appendChild(btn);
    });
  }

  timeLeft = 10;
  const tText = getEl('timerText');
  const tBar = getEl('timerBar');
  if (tText) tText.textContent = timeLeft;
  if (tBar) tBar.style.width = '100%';

  timerInterval = setInterval(() => {
    timeLeft--;
    if (tText) tText.textContent = timeLeft;
    if (tBar) tBar.style.width = `${(timeLeft / 10) * 100}%`;
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      checkAnswer(false, true);
    }
  }, 1000);
}

// ✅ Check Answer
function checkAnswer(isCorrect, isTimeout = false) {
  if (timerInterval) clearInterval(timerInterval);
  if (isAnswering) return;

  isAnswering = true;
  stats.total++;

  if (isCorrect) {
    stats.correct++;
    playSound('correct');
    showFeedback(true, '정답입니다!');
  } else {
    stats.wrong++;
    if (!stats.mistakes.find(m => m.id === currentQuestion.id)) stats.mistakes.push(currentQuestion);
    playSound('wrong');

    // Update local count for immediate feedback
    globalMistakeCounts[currentQuestion.eng] = (globalMistakeCounts[currentQuestion.eng] || 0) + 1;

    // Original style feedback but WITHOUT the 'Total Missed' part as requested
    const msg = isTimeout
      ? `시간 초과!<br><span class="answer-detail">정답: ${currentQuestion.kor}</span>`
      : `틀렸어요!<br><span class="answer-detail">정답: ${currentQuestion.kor}</span>`;

    showFeedback(false, msg);
    saveToGoogleSheet(currentQuestion);
  }

  updateScoreUI();
  setTimeout(nextQuestion, 1500);
}

function updateScoreUI() {
  const el = getEl('currentScore');
  if (el) el.textContent = `${stats.correct} / ${stats.total}`;
}

function showFeedback(isCorrect, msg) {
  const overlay = getEl('feedbackOverlay');
  const icon = getEl('feedbackIcon');
  const msgEl = getEl('feedbackMsg');
  if (!overlay || !icon || !msgEl) return;

  overlay.className = `feedback-overlay active ${isCorrect ? 'correct' : 'wrong'}`;
  icon.textContent = isCorrect ? '🎉' : '😢';
  msgEl.innerHTML = msg;
  setTimeout(() => { overlay.classList.remove('active'); }, 1300);
}

function finishQuiz() {
  isQuizActive = false;
  if (timerInterval) clearInterval(timerInterval);

  const totalTime = Math.floor((Date.now() - startTime) / 1000);
  const successRate = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;

  if (getEl('finalTotal')) getEl('finalTotal').textContent = stats.total;
  if (getEl('finalCorrect')) getEl('finalCorrect').textContent = stats.correct;
  if (getEl('finalWrong')) getEl('finalWrong').textContent = stats.wrong;
  if (getEl('finalSuccessRate')) getEl('finalSuccessRate').textContent = `${successRate}%`;
  if (getEl('finalTime')) getEl('finalTime').textContent = `${totalTime}s`;

  const container = getEl('wrongListContainer');
  const listEl = getEl('wrongList');
  if (listEl) {
    listEl.innerHTML = '';
    stats.mistakes.forEach(item => {
      const div = document.createElement('div');
      div.className = 'result-wrong-item'; // Unique class for quiz results
      div.innerHTML = `
        <span class="r-eng">${item.eng}</span>
        <span class="r-kor">${item.kor}</span>
      `;
      listEl.appendChild(div);
    });
    if (container) container.style.display = stats.mistakes.length > 0 ? 'block' : 'none';
  }

  const resultScr = getEl('resultScreen');
  if (resultScr) resultScr.style.display = 'flex';
}

init();
