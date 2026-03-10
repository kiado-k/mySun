const CONSONANTS = [
    { char: 'ㄱ', index: 0 },
    { char: 'ㄴ', index: 2 },
    { char: 'ㄷ', index: 3 },
    { char: 'ㄹ', index: 5 },
    { char: 'ㅁ', index: 6 },
    { char: 'ㅂ', index: 7 },
    { char: 'ㅅ', index: 9 },
    { char: 'ㅇ', index: 11 },
    { char: 'ㅈ', index: 12 },
    { char: 'ㅊ', index: 14 },
    { char: 'ㅋ', index: 15 },
    { char: 'ㅌ', index: 16 },
    { char: 'ㅍ', index: 17 },
    { char: 'ㅎ', index: 18 }
];

const VOWELS = [
    { char: 'ㅏ', index: 0 },
    { char: 'ㅑ', index: 2 },
    { char: 'ㅓ', index: 4 },
    { char: 'ㅕ', index: 6 },
    { char: 'ㅗ', index: 8 },
    { char: 'ㅛ', index: 12 },
    { char: 'ㅜ', index: 13 },
    { char: 'ㅠ', index: 17 },
    { char: 'ㅡ', index: 18 },
    { char: 'ㅣ', index: 20 }
];

let selectedConsonant = null;
let selectedVowel = null;

const displayEl = document.getElementById('character-display');
const consonantsGrid = document.getElementById('consonants-grid');
const vowelsGrid = document.getElementById('vowels-grid');
const btnListen = document.getElementById('btn-listen');
const btnClear = document.getElementById('btn-clear');

function init() {
    renderButtons();
    setupEventListeners();
}

function renderButtons() {
    CONSONANTS.forEach(c => {
        const btn = document.createElement('button');
        btn.className = 'letter-btn consonant-btn';
        btn.textContent = c.char;
        btn.dataset.index = c.index;
        btn.dataset.type = 'consonant';
        btn.addEventListener('click', () => handleLetterClick(btn, c, 'consonant'));
        consonantsGrid.appendChild(btn);
    });

    VOWELS.forEach(v => {
        const btn = document.createElement('button');
        btn.className = 'letter-btn vowel-btn';
        btn.textContent = v.char;
        btn.dataset.index = v.index;
        btn.dataset.type = 'vowel';
        btn.addEventListener('click', () => handleLetterClick(btn, v, 'vowel'));
        vowelsGrid.appendChild(btn);
    });
}

function handleLetterClick(btnElement, letterObj, type) {
    if (type === 'consonant') {
        const prevSelected = document.querySelector('.consonant-btn.selected');
        if (prevSelected) prevSelected.classList.remove('selected');
        btnElement.classList.add('selected');
        selectedConsonant = letterObj;
    } else {
        const prevSelected = document.querySelector('.vowel-btn.selected');
        if (prevSelected) prevSelected.classList.remove('selected');
        btnElement.classList.add('selected');
        selectedVowel = letterObj;
    }

    updateDisplay();
}

function updateDisplay() {
    let charToDisplay = '';

    if (selectedConsonant && selectedVowel) {
        // Compose Hangul character
        // 한글 글자 조합 과정
        const cho = selectedConsonant.index;
        const jung = selectedVowel.index;
        const code = 0xAC00 + (cho * 21 * 28) + (jung * 28);
        charToDisplay = String.fromCharCode(code);
    } else if (selectedConsonant) {
        charToDisplay = selectedConsonant.char;
    } else if (selectedVowel) {
        charToDisplay = selectedVowel.char;
    } else {
        displayEl.innerHTML = '<span class="placeholder">자음과 모음을<br>눌러보세요!</span>';
        displayEl.style.color = '';
        return;
    }

    displayEl.textContent = charToDisplay;

    // Default color since it might have been changed by TTS
    // TTS로 인해 변경되었을 수 있으므로 기본 색상으로 복구
    displayEl.style.color = '';

    // Animate display container
    // 화면 표시 영역 애니메이션 효과
    displayEl.classList.remove('pop');
    void displayEl.offsetWidth; // trigger reflow to restart animation (애니메이션 재시작을 위한 리플로우 유도)
    displayEl.classList.add('pop');
}

function setupEventListeners() {
    btnClear.addEventListener('click', () => {
        selectedConsonant = null;
        selectedVowel = null;

        document.querySelectorAll('.letter-btn.selected').forEach(btn => {
            btn.classList.remove('selected');
        });

        updateDisplay();

        // Visual feedback for clear btn
        // 지우기 버튼의 시각적 피드백 효과
        btnClear.style.transform = 'scale(0.95)';
        setTimeout(() => btnClear.style.transform = '', 150);
    });

    // Handle Text to Speech
    // 음성 합성(TTS) 처리 로직
    btnListen.addEventListener('click', () => {
        const textToRead = displayEl.textContent.trim();
        const hasPlaceholder = displayEl.querySelector('.placeholder') !== null;

        if (!textToRead || hasPlaceholder) return;

        // Visual feedback for listen btn
        // 듣기 버튼의 시각적 피드백 효과
        btnListen.style.transform = 'scale(0.95)';
        setTimeout(() => btnListen.style.transform = '', 300);

        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel(); // Stop any currently playing audio (현재 재생 중인 음성 중단)

            const utterance = new SpeechSynthesisUtterance(textToRead);
            utterance.lang = 'ko-KR';
            utterance.rate = 0.5; // Talk clearly and slowly for kids (아이들을 위해 명확하고 천천히 읽어줌 : 값이 작을수록 느려짐)
            utterance.pitch = 1.3; // Higher, friendlier pitch (더 높고 친근한 목소리 톤)

            // Highlight text while speaking
            // 말하는 동안 글자 강조 표시
            displayEl.style.color = 'var(--secondary-color)';

            utterance.onend = () => {
                displayEl.style.color = '';
            };

            utterance.onerror = () => {
                displayEl.style.color = '';
            };

            window.speechSynthesis.speak(utterance);
        } else {
            alert('현재 브라우저에서는 듣기 기능(TTS)을 지원하지 않습니다.');
        }
    });
}

document.addEventListener('DOMContentLoaded', init);
