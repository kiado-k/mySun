const CHO_MAP = { 'ㄱ': 0, 'ㄴ': 2, 'ㄷ': 3, 'ㄹ': 5, 'ㅁ': 6, 'ㅂ': 7, 'ㅅ': 9, 'ㅇ': 11, 'ㅈ': 12, 'ㅊ': 14, 'ㅋ': 15, 'ㅌ': 16, 'ㅍ': 17, 'ㅎ': 18 };
const JUNG_MAP = { 'ㅏ': 0, 'ㅑ': 2, 'ㅓ': 4, 'ㅕ': 6, 'ㅗ': 8, 'ㅛ': 12, 'ㅜ': 13, 'ㅠ': 17, 'ㅡ': 18, 'ㅣ': 20 };
const JONG_MAP = { 'ㄱ': 1, 'ㄴ': 4, 'ㄷ': 7, 'ㄹ': 8, 'ㅁ': 16, 'ㅂ': 17, 'ㅅ': 19, 'ㅇ': 21, 'ㅈ': 22, 'ㅊ': 23, 'ㅋ': 24, 'ㅌ': 25, 'ㅍ': 26, 'ㅎ': 27 };

const JAMOS_CHO = Object.keys(CHO_MAP);
const JAMOS_JUNG = Object.keys(JUNG_MAP);

const QUIZ_DATA = [
    { word: '오리', emoji: '🦆' }, { word: '나비', emoji: '🦋' }, { word: '우유', emoji: '🥛' }, { word: '기차', emoji: '🚂' },
    { word: '포도', emoji: '🍇' }, { word: '오이', emoji: '🥒' }, { word: '사자', emoji: '🦁' }, { word: '모자', emoji: '🧢' },
    { word: '바나나', emoji: '🍌' }, { word: '수박', emoji: '🍉' }, { word: '사과', emoji: '🍎' }, { word: '하마', emoji: '🦛' },
    { word: '나무', emoji: '🌳' }, { word: '구두', emoji: '👠' }, { word: '파리', emoji: '🪰' }, { word: '피아노', emoji: '🎹' },
    { word: '거미', emoji: '🕷️' }, { word: '고기', emoji: '🥩' }, { word: '바지', emoji: '👖' },
    { word: '치마', emoji: '👗' }, { word: '개미', emoji: '🐜' }, { word: '다리', emoji: '🦵' },
    { word: '지도', emoji: '🗺️' }, { word: '초코', emoji: '🍫' }, { word: '키위', emoji: '🥝' }, { word: '토끼', emoji: '🐰' },
    { word: '가방', emoji: '🎒' }, { word: '우산', emoji: '☔' }, { word: '달', emoji: '🌙' }, { word: '별', emoji: '⭐' },
    { word: '해', emoji: '☀️' }, { word: '신발', emoji: '👟' }, { word: '빵', emoji: '🍞' }, { word: '물', emoji: '💧' },
    { word: '집', emoji: '🏠' }, { word: '눈', emoji: '❄️' }
];

let randomizedQuiz = [];
let currentIdx = 0;
let inputSequence = [];
let isFeedbackShowing = false;
let hasFailedCurrent = false; // 현재 문제에서 틀린 적이 있는지 추적

const inputEl = document.getElementById('user-input');
const imageEl = document.getElementById('quiz-image');
const choGrid = document.getElementById('consonants-grid');
const jungGrid = document.getElementById('vowels-grid');
const btnCheck = document.getElementById('btn-check');
const btnClear = document.getElementById('btn-clear');
const btnNext = document.getElementById('btn-next');

function init() {
    shuffleQuiz();
    renderButtons();
    loadQuiz();
    setupEventListeners();
}

function shuffleQuiz() {
    randomizedQuiz = [...QUIZ_DATA].sort(() => Math.random() - 0.5);
}

function renderButtons() {
    choGrid.innerHTML = '';
    jungGrid.innerHTML = '';
    JAMOS_CHO.forEach(char => choGrid.appendChild(createBtn(char, 'consonant-btn')));
    JAMOS_JUNG.forEach(char => jungGrid.appendChild(createBtn(char, 'vowel-btn')));
}

function createBtn(char, className) {
    const btn = document.createElement('button');
    btn.className = `letter-btn ${className}`;
    btn.textContent = char;
    btn.addEventListener('click', () => {
        if (isFeedbackShowing) return;
        inputSequence.push(char);
        updateDisplay();
        btn.style.transform = 'scale(0.9)';
        setTimeout(() => btn.style.transform = '', 100);
    });
    return btn;
}

function updateDisplay() {
    inputEl.textContent = composeHangul(inputSequence);
    inputEl.style.color = '';
}

function composeHangul(sequence) {
    let result = "";
    let i = 0;
    while (i < sequence.length) {
        let cho = -1, jung = -1, jong = 0;
        if (i < sequence.length && sequence[i] in CHO_MAP) {
            cho = CHO_MAP[sequence[i]];
            i++;
        } else {
            result += sequence[i] || "";
            i++;
            continue;
        }
        if (i < sequence.length && sequence[i] in JUNG_MAP) {
            jung = JUNG_MAP[sequence[i]];
            i++;
        } else {
            result += sequence[i - 1];
            continue;
        }
        if (i < sequence.length && sequence[i] in JONG_MAP) {
            if (i + 1 < sequence.length && sequence[i + 1] in JUNG_MAP) {
            } else {
                jong = JONG_MAP[sequence[i]];
                i++;
            }
        }
        const code = 0xAC00 + (cho * 21 * 28) + (jung * 28) + jong;
        result += String.fromCharCode(code);
    }
    return result;
}

function loadQuiz() {
    const quiz = randomizedQuiz[currentIdx];
    if (imageEl.childNodes[0]) imageEl.childNodes[0].textContent = quiz.emoji;
    inputSequence = [];
    inputEl.textContent = "";
    inputEl.style.color = '';
    imageEl.style.transform = '';
    isFeedbackShowing = false;
    hasFailedCurrent = false; // 새로운 문제는 틀림 상태 초기화
}

function playSound(type) {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    if (type === 'correct') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(659.25, audioCtx.currentTime + 0.1);
        oscillator.frequency.exponentialRampToValueAtTime(783.99, audioCtx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    } else {
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(392.00, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(329.63, audioCtx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
    }

    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.4);
}

function speak(text, callback) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ko-KR';
        utterance.rate = 0.5;
        utterance.pitch = 1.3;
        if (callback) utterance.onend = callback;
        window.speechSynthesis.speak(utterance);
    } else if (callback) {
        callback();
    }
}

function checkAnswer() {
    if (isFeedbackShowing) return;

    const quiz = randomizedQuiz[currentIdx];
    const userInput = composeHangul(inputSequence);

    if (userInput === "") return;

    isFeedbackShowing = true;

    if (userInput === quiz.word) {
        inputEl.style.color = '#10b981';
        playSound('correct');
        imageEl.style.transform = 'scale(1.2)';

        setTimeout(() => {
            currentIdx = (currentIdx + 1) % randomizedQuiz.length;
            if (currentIdx === 0) shuffleQuiz();
            loadQuiz();
        }, 1200);
    } else {
        // 틀렸을 경우: 자기 단어 읽어주고 빨간색으로만 표시 (정답 공개 안 함)
        hasFailedCurrent = true;
        inputEl.style.color = '#ef4444';
        playSound('wrong');

        speak(userInput, () => {
            setTimeout(() => {
                inputEl.style.color = '';
                isFeedbackShowing = false;
            }, 100);
        });
    }
}

function setupEventListeners() {
    btnCheck.addEventListener('click', checkAnswer);

    btnClear.addEventListener('click', () => {
        if (isFeedbackShowing) return;
        if (inputSequence.length > 0) {
            inputSequence.pop();
            updateDisplay();
        }
    });

    btnNext.addEventListener('click', () => {
        if (isFeedbackShowing) return;
        currentIdx = (currentIdx + 1) % randomizedQuiz.length;
        if (currentIdx === 0) shuffleQuiz();
        loadQuiz();
    });

    imageEl.addEventListener('click', () => {
        if (isFeedbackShowing) return;
        const quiz = randomizedQuiz[currentIdx];

        if (hasFailedCurrent) {
            // 한 번이라도 틀린 후 이미지를 누르면: 정답을 보여주고 읽어줌 (교육적 힌트)
            speak(quiz.word);
            const originalText = inputEl.textContent;
            inputEl.textContent = quiz.word;
            inputEl.style.color = '#3b82f6'; // 힌트 색상 (파란색)

            setTimeout(() => {
                inputEl.textContent = originalText;
                inputEl.style.color = '';
            }, 2000);
        } else {
            // 아직 안 틀렸을 때는 정답만 읽어줌 (이미 기능하고 있던 부분)
            speak(quiz.word);
        }
    });
}

document.addEventListener('DOMContentLoaded', init);
