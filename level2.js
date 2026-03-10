const CHO = [
    { char: 'ㄱ', index: 0 }, { char: 'ㄴ', index: 2 }, { char: 'ㄷ', index: 3 },
    { char: 'ㄹ', index: 5 }, { char: 'ㅁ', index: 6 }, { char: 'ㅂ', index: 7 }, { char: 'ㅅ', index: 9 },
    { char: 'ㅇ', index: 11 }, { char: 'ㅈ', index: 12 }, { char: 'ㅊ', index: 14 },
    { char: 'ㅋ', index: 15 }, { char: 'ㅌ', index: 16 }, { char: 'ㅍ', index: 17 }, { char: 'ㅎ', index: 18 }
];

const JUNG = [
    { char: 'ㅏ', index: 0 }, { char: 'ㅑ', index: 2 }, { char: 'ㅓ', index: 4 },
    { char: 'ㅕ', index: 6 }, { char: 'ㅗ', index: 8 }, { char: 'ㅛ', index: 12 },
    { char: 'ㅜ', index: 13 }, { char: 'ㅠ', index: 17 }, { char: 'ㅡ', index: 18 },
    { char: 'ㅣ', index: 20 }
];

const JONG = [
    { char: '없음', index: 0 }, { char: 'ㄱ', index: 1 }, { char: 'ㄴ', index: 4 },
    { char: 'ㄷ', index: 7 }, { char: 'ㄹ', index: 8 }, { char: 'ㅁ', index: 16 },
    { char: 'ㅂ', index: 17 }, { char: 'ㅅ', index: 19 }, { char: 'ㅇ', index: 21 },
    { char: 'ㅈ', index: 22 }, { char: 'ㅊ', index: 23 }, { char: 'ㅋ', index: 24 },
    { char: 'ㅌ', index: 25 }, { char: 'ㅍ', index: 26 }, { char: 'ㅎ', index: 27 }
];

let selectedCho = null;
let selectedJung = null;
let selectedJong = JONG[0];

const displayEl = document.getElementById('character-display');
const choGrid = document.getElementById('consonants-grid');
const jungGrid = document.getElementById('vowels-grid');
const jongGrid = document.getElementById('batchim-grid');
const btnListen = document.getElementById('btn-listen');
const btnClear = document.getElementById('btn-clear');

function init() {
    renderButtons();
    setupEventListeners();
}

function renderButtons() {
    CHO.forEach(c => {
        const btn = createBtn(c, 'consonant-btn', 'cho');
        choGrid.appendChild(btn);
    });

    JUNG.forEach(v => {
        const btn = createBtn(v, 'vowel-btn', 'jung');
        jungGrid.appendChild(btn);
    });

    JONG.forEach(j => {
        const btn = createBtn(j, 'batchim-btn', 'jong');
        if (j.index === 0) btn.classList.add('selected');
        jongGrid.appendChild(btn);
    });
}

function createBtn(obj, className, type) {
    const btn = document.createElement('button');
    btn.className = `letter-btn ${className}`;
    btn.textContent = obj.char;

    btn.addEventListener('click', () => {
        document.querySelectorAll(`.${className}`).forEach(b => {
            b.classList.remove('selected');
            b.style.transform = '';
        });
        btn.classList.add('selected');

        if (type === 'cho') selectedCho = obj;
        if (type === 'jung') selectedJung = obj;
        if (type === 'jong') selectedJong = obj;
        updateDisplay();
    });
    return btn;
}

function updateDisplay() {
    if (selectedCho && selectedJung) {
        const code = 0xAC00 + (selectedCho.index * 21 * 28) + (selectedJung.index * 28) + selectedJong.index;
        displayEl.textContent = String.fromCharCode(code);
    } else if (selectedCho) {
        displayEl.textContent = selectedCho.char;
    } else if (selectedJung) {
        displayEl.textContent = selectedJung.char;
    } else {
        displayEl.innerHTML = '<span class="placeholder">자음, 모음, 받침을<br>눌러보세요!</span>';
    }

    displayEl.classList.remove('pop');
    void displayEl.offsetWidth;
    displayEl.classList.add('pop');
}

function setupEventListeners() {
    btnClear.addEventListener('click', () => {
        selectedCho = null;
        selectedJung = null;
        selectedJong = JONG[0];
        document.querySelectorAll('.letter-btn').forEach(b => b.classList.remove('selected'));
        const defaultBatchim = document.querySelectorAll('.batchim-btn')[0];
        if (defaultBatchim) defaultBatchim.classList.add('selected');
        updateDisplay();
    });

    btnListen.addEventListener('click', () => {
        const text = displayEl.textContent.trim();
        if (!text || displayEl.querySelector('.placeholder')) return;

        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'ko-KR';
            utterance.rate = 0.5;
            utterance.pitch = 1.3;
            displayEl.style.color = 'var(--secondary-color)';
            utterance.onend = () => displayEl.style.color = '';
            window.speechSynthesis.speak(utterance);
        }
    });
}

document.addEventListener('DOMContentLoaded', init);
