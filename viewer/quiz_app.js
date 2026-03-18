// 2026-03-19 / 기능: 이미지 퀴즈 엔진 (2지 선다, 이미지 기반, TTS 지원)

let vocabularyData = [];
let quizList = [];
let currentQuestion = null;
let stats = { correct: 0, total: 0 };
let isAnswering = false;
let startTime = Date.now();
let isQuizActive = true;
let quizMode = 'eng'; // 🔥 기본 영어 모드 (Eng)
let currentOptions = []; // 현재 옵션 저장 (토글 시 필요)

// 🔊 Audio Engine (from memorize/app.js)
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

function speak(text, lang = 'en-US') {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const uttr = new SpeechSynthesisUtterance(text);
    uttr.lang = lang;
    uttr.rate = (lang === 'ko-KR' || text.length <= 3) ? 0.8 : 0.9;
    window.speechSynthesis.speak(uttr);
  }
}

// 🏁 Initialize
async function init() {
  try {
    const response = await fetch('../dt/work_list.json');
    vocabularyData = await response.json();

    // 🔥 Filter items that have images
    quizList = vocabularyData.filter(item => item.img && item.img.startsWith('/images/'));

    if (quizList.length === 0) {
      alert('퀴즈를 위한 이미지가 충분하지 않습니다.');
      window.location.href = 'index.html';
      return;
    }

    // Bind quit button
    document.getElementById('quitBtn').onclick = finishQuiz;

    nextQuestion();
  } catch (error) {
    console.error('Data loading failed:', error);
  }
}

function toggleQuizMode() {
  quizMode = (quizMode === 'kor') ? 'eng' : 'kor';
  
  const btnText = document.getElementById('langText');
  btnText.textContent = quizMode === 'kor' ? '한글 모드 (가)' : '영어 모드 (Eng)';
  
  const btn1 = document.getElementById('btn1');
  const btn2 = document.getElementById('btn2');
  if (btn1 && btn2 && currentOptions.length > 0) {
      btn1.textContent = quizMode === 'kor' ? currentOptions[0].kor : currentOptions[0].eng;
      btn2.textContent = quizMode === 'kor' ? currentOptions[1].kor : currentOptions[1].eng;
  }

  if (currentQuestion) replayVoice();
}

// 🔊 다시 듣기 (이미지 클릭 시 실행)
function replayVoice() {
    if (!currentQuestion) return;
    // 🔥 항상 영어 발음으로 고정 (🇺🇸 English Only)
    speak(currentQuestion.eng, 'en-US');
}

function nextQuestion() {
  isAnswering = false;
  
  const toast = document.getElementById('feedbackToast');
  if (toast) toast.classList.remove('active', 'correct', 'wrong');
  
  // ✨ 모든 피드백 및 버튼 상태 초기화 (버그 수정 핵심)
  const btns = document.querySelectorAll('.quiz-btn');
  btns.forEach(b => {
      b.style.pointerEvents = 'auto'; // 확실한 재활성화
      b.classList.remove('correct-choice', 'wrong-choice');
      b.blur();
  });

  // Random pick
  const targetIndex = Math.floor(Math.random() * quizList.length);
  currentQuestion = quizList[targetIndex];

  // Distractor (Another random item but not the same)
  let distractor;
  do {
    distractor = quizList[Math.floor(Math.random() * quizList.length)];
  } while (distractor.id === currentQuestion.id);

  // Mix options
  currentOptions = [currentQuestion, distractor].sort(() => Math.random() - 0.5);

  // Update UI
  const imgEl = document.getElementById('quizImage');
  imgEl.src = `..${currentQuestion.img}`;
  imgEl.onload = () => {
    // 🔊 영/한 모드 상관없이 항상 영어 발음 재생
    replayVoice();
  };

  const btn1 = document.getElementById('btn1');
  const btn2 = document.getElementById('btn2');

  btn1.textContent = quizMode === 'kor' ? currentOptions[0].kor : currentOptions[0].eng;
  btn2.textContent = quizMode === 'kor' ? currentOptions[1].kor : currentOptions[1].eng;

  btn1.onclick = (e) => checkAnswer(currentOptions[0].id === currentQuestion.id, e.target);
  btn2.onclick = (e) => checkAnswer(currentOptions[1].id === currentQuestion.id, e.target);
}

function checkAnswer(isCorrect, clickedBtn) {
  if (isAnswering || !isQuizActive) return;
  isAnswering = true;
  stats.total++;
  
  const btns = document.querySelectorAll('.quiz-btn');
  btns.forEach(b => b.style.pointerEvents = 'none');

  const toast = document.getElementById('feedbackToast');
  toast.classList.remove('correct', 'wrong');
  
  if (isCorrect) {
    stats.correct++;
    playSound('correct');
    clickedBtn.classList.add('correct-choice'); // 버튼 초록색
    toast.textContent = '정답입니다! ✨';
    toast.classList.add('active', 'correct');
    document.getElementById('correctCount').textContent = stats.correct;
  } else {
    playSound('wrong');
    clickedBtn.classList.add('wrong-choice'); // 클릭한 버튼 빨간색
    
    // 정답인 버튼 찾아서 초록색으로 표시 (btn1, btn2만 한정)
    [document.getElementById('btn1'), document.getElementById('btn2')].forEach((btn, idx) => {
        if (currentOptions[idx] && currentOptions[idx].id === currentQuestion.id) {
            btn.classList.add('correct-choice');
        }
    });

    toast.textContent = '틀렸어요 😢';
    toast.classList.add('active', 'wrong');
  }

  setTimeout(nextQuestion, 1600);
}

function finishQuiz() {
  isQuizActive = false;
  const totalTime = Math.floor((Date.now() - startTime) / 1000);
  const successRate = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;

  document.getElementById('finalTime').textContent = `${totalTime}s`;
  document.getElementById('finalTotal').textContent = stats.total;
  document.getElementById('finalSuccessRate').textContent = `${successRate}%`;

  document.getElementById('resultScreen').style.display = 'flex';
}

init();
