let vocabularyData = [];
let quizList = [];
let currentQuestion = null;
let timerInterval = null;
let timeLeft = 10;
let startTime = 0;
let isAnswering = false;
let isQuizActive = false;
let stats = { total: 0, correct: 0, wrong: 0, mistakes: [] };

// UI Elements
const setupScreen = document.getElementById('setupScreen');
const studyScreen = document.getElementById('studyScreen');
const resultScreen = document.getElementById('resultScreen');

const l1Filter = document.getElementById('l1Filter');
const l2Filter = document.getElementById('l2Filter');
const l3Filter = document.getElementById('l3Filter');

// Audio Context for synthetic sounds
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  if (type === 'correct') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
    osc.frequency.exponentialRampToValueAtTime(1046.50, audioCtx.currentTime + 0.1); // C6
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
  } else {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, audioCtx.currentTime); // A3
    osc.frequency.linearRampToValueAtTime(110, audioCtx.currentTime + 0.2); // A2
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.4);
  }
}

// 🏁 Init
async function init() {
  try {
    const response = await fetch('../dt/work_list.json');
    vocabularyData = await response.json();
    populateFilters();
  } catch (error) {
    console.error('Data loading failed:', error);
  }
}

// 🔀 Filter Logic
function populateFilters() {
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
      const l2Items = vocabularyData.filter(i => i.parent_id === val);
      l2Items.forEach(item => {
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
      const l3Items = vocabularyData.filter(i => i.parent_id === val);
      l3Items.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.id;
        opt.textContent = `${item.eng} (${item.kor})`;
        l3Filter.appendChild(opt);
      });
    }
  });
}

// 🚀 Start Quiz
document.getElementById('startStudy').addEventListener('click', () => {
  const l1Val = l1Filter.value;
  const l2Val = l2Filter.value;
  const l3Val = l3Filter.value;

  let filtered = vocabularyData.filter(item => item.root_lv === 4);

  if (l3Val !== 'all') {
    filtered = filtered.filter(i => i.parent_id === l3Val);
  } else if (l2Val !== 'all') {
    const l3Ids = vocabularyData.filter(i => i.parent_id === l2Val).map(i => i.id);
    filtered = filtered.filter(i => l3Ids.includes(i.parent_id));
  } else if (l1Val !== 'all') {
    const l2Ids = vocabularyData.filter(i => i.parent_id === l1Val).map(i => i.id);
    const l3Ids = vocabularyData.filter(i => l2Ids.includes(i.parent_id)).map(i => i.id);
    filtered = filtered.filter(i => l3Ids.includes(i.parent_id));
  }

  if (filtered.length < 4) {
    alert('퀴즈를 만드려면 최소 4개의 단어가 필요합니다. 범위를 넓혀주세요.');
    return;
  }

  quizList = filtered;
  stats = { total: 0, correct: 0, wrong: 0, mistakes: [] };
  startTime = Date.now();
  isAnswering = false;
  
  setupScreen.classList.remove('active');
  studyScreen.classList.add('active');
  updateScoreUI();
  isQuizActive = true;
  
  nextQuestion();
});

// 📝 Next Question
function nextQuestion() {
  if (!isQuizActive) return;
  if (timerInterval) clearInterval(timerInterval);
  isAnswering = false;
  
  // Pick random word
  const target = quizList[Math.floor(Math.random() * quizList.length)];
  currentQuestion = target;
  
  // Smart Distractors: Try to find words in the same L3 category first
  let candidates = quizList.filter(i => i.parent_id === target.parent_id && i.id !== target.id);
  
  // If not enough in same group, pick from the whole quizList
  if (candidates.length < 3) {
    candidates = quizList.filter(i => i.id !== target.id);
  }
  
  const distractors = candidates
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
  
  const options = [target, ...distractors].sort(() => Math.random() - 0.5);
  
  // UI Update
  document.getElementById('questionText').textContent = target.eng;

  const grid = document.getElementById('optionsGrid');
  grid.innerHTML = '';
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = opt.kor;
    btn.onclick = () => {
      if (!isAnswering) checkAnswer(opt.id === target.id);
    };
    grid.appendChild(btn);
  });

  // Timer reset
  timeLeft = 10;
  document.getElementById('timerText').textContent = timeLeft;
  document.getElementById('timerBar').style.width = '100%';
  
  timerInterval = setInterval(() => {
    timeLeft--;
    document.getElementById('timerText').textContent = timeLeft;
    document.getElementById('timerBar').style.width = `${(timeLeft / 10) * 100}%`;
    
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      checkAnswer(false, true); // Timeout case
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
    if (!stats.mistakes.find(m => m.id === currentQuestion.id)) {
      stats.mistakes.push(currentQuestion);
    }
    playSound('wrong');
    const msg = isTimeout ? `시간 초과!<br><span class="answer-detail">정답: ${currentQuestion.kor}</span>` : `틀렸어요!<br><span class="answer-detail">정답: ${currentQuestion.kor}</span>`;
    showFeedback(false, msg);
  }
  
  updateScoreUI();
  setTimeout(nextQuestion, 1500);
}

function updateScoreUI() {
  document.getElementById('currentScore').textContent = `${stats.correct} / ${stats.total}`;
}

// 🎭 Feedback Animation
function showFeedback(isCorrect, msg) {
  const overlay = document.getElementById('feedbackOverlay');
  const icon = document.getElementById('feedbackIcon');
  const msgEl = document.getElementById('feedbackMsg');
  
  overlay.className = `feedback-overlay active ${isCorrect ? 'correct' : 'wrong'}`;
  icon.textContent = isCorrect ? '🎉' : '😢';
  msgEl.innerHTML = msg;
  
  setTimeout(() => {
    overlay.classList.remove('active');
  }, 1300);
}

// 🏁 Finish & Result
document.getElementById('quitBtn').addEventListener('click', finishQuiz);
document.getElementById('restartBtn').addEventListener('click', () => {
  resultScreen.classList.remove('active');
  setupScreen.classList.add('active');
});

function finishQuiz() {
  isQuizActive = false;
  if (timerInterval) clearInterval(timerInterval);
  
  const totalTime = Math.floor((Date.now() - startTime) / 1000);
  const successRate = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
  
  document.getElementById('finalTotal').textContent = stats.total;
  document.getElementById('finalCorrect').textContent = stats.correct;
  document.getElementById('finalWrong').textContent = stats.wrong;
  document.getElementById('finalSuccessRate').textContent = `${successRate}%`;
  document.getElementById('finalTime').textContent = `${totalTime}s`;
  
  // Render Wrong List
  const container = document.getElementById('wrongListContainer');
  const listEl = document.getElementById('wrongList');
  listEl.innerHTML = '';
  
  if (stats.mistakes.length > 0) {
    stats.mistakes.forEach(item => {
      const div = document.createElement('div');
      div.className = 'wrong-item';
      div.innerHTML = `
        <span class="w-eng">${item.eng}</span>
        <span class="w-kor">${item.kor}</span>
      `;
      listEl.appendChild(div);
    });
    container.style.display = 'block';
  } else {
    container.style.display = 'none';
  }
  
  studyScreen.classList.remove('active');
  resultScreen.classList.add('active');
}

init();
