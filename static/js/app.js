// Main Application Entry Point
import { loadReadingText } from './modules/reading.js';
import { loadSpeakingPhrase } from './modules/speaking.js';
import './utils/profiles.js'; // Profile management system

// API Base URL
const API_BASE = '';

// Current state
let currentVocab = null;
let currentTab = 'home';

// Initialize app
window.onload = async function () {
    registerServiceWorker();
    initializeProfile(); // Initialize user profile system
    await loadUserStats();
    await loadDailyWisdom();
    switchTab('home');
};

// Service Worker Registration
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/static/service-worker.js')
            .then(reg => console.log('✅ Service Worker registered'))
            .catch(err => console.log('❌ SW registration failed:', err));
    }
}

// Tab Navigation
window.switchTab = function (tabId) {
    currentTab = tabId;

    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));

    // Show selected tab
    const tab = document.getElementById(`tab-${tabId}`);
    if (tab) {
        tab.classList.add('active');
    }

    // Update navbar highlighting
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('text-yellow-500');
        btn.classList.add('text-slate-500');
    });

    // Highlight active button
    const activeBtn = document.querySelector(`button[onclick="switchTab('${tabId}')"]`);
    if (activeBtn) {
        activeBtn.classList.remove('text-slate-500');
        activeBtn.classList.add('text-yellow-500');
    }

    // Load content for specific tabs
    console.log('Switching to tab:', tabId);
    if (tabId === 'vocab') {
        loadVocabCard();
    } else if (tabId === 'grammar') {
        if (window.loadGrammarDrill) {
            window.loadGrammarDrill();
        } else {
            console.error('loadGrammarDrill is not defined on window');
        }
    } else if (tabId === 'reading') {
        if (window.loadReadingText) {
            window.loadReadingText();
        }
    } else if (tabId === 'speaking') {
        if (window.loadSpeakingPhrase) {
            window.loadSpeakingPhrase();
        }
    }
};

// Initialize Profile System
function initializeProfile() {
    // Profile system will auto-create default profile if none exists
    const profile = window.profileManager.getActiveProfile();
    console.log('Active profile:', profile.name);
}

// Load User Stats from Profile
async function loadUserStats() {
    try {
        const profile = window.profileManager.getActiveProfile();

        document.getElementById('user-streak').innerHTML = `<i class="fas fa-fire mr-1"></i> ${profile.streak} Days`;
        document.getElementById('user-xp').textContent = profile.xp;

        // Also update from backend API
        const response = await fetch(`${API_BASE}/api/user/stats`);
        const data = await response.json();
        // Note: Backend stats are just for reference, profile is source of truth
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Load Daily Wisdom
async function loadDailyWisdom() {
    try {
        const response = await fetch(`${API_BASE}/api/user/wisdom`);
        const data = await response.json();

        document.getElementById('daily-wisdom').textContent = data.tip;
    } catch (error) {
        console.error('Error loading wisdom:', error);
    }
}

// Vocabulary Functions
async function loadVocabCard() {
    const container = document.getElementById('vocab-card-container');
    container.innerHTML = '<div class="flex items-center justify-center h-full"><div class="loader"></div></div>';

    try {
        const response = await fetch(`${API_BASE}/api/vocab/next?topic=general`);
        const data = await response.json();

        if (data.action === 'generate') {
            // No content cached
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full text-center p-6">
                    <i class="fas fa-box-open text-6xl text-slate-700 mb-4"></i>
                    <p class="text-slate-400 mb-4">No vocabulary cached yet.</p>
                    <button onclick="generateVocab()" class="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-lg font-bold">
                        Generate 50 Words
                    </button>
                </div>
            `;
            return;
        }

        currentVocab = data;
        renderVocabCard(data);
    } catch (error) {
        console.error('Error loading vocab:', error);
        container.innerHTML = '<p class="text-red-400">Error loading vocabulary</p>';
    }
}

function renderVocabCard(word) {
    const container = document.getElementById('vocab-card-container');

    let borderClass = 'border-yellow-500';
    if (word.gender === 'masculine') borderClass = 'border-masculine';
    if (word.gender === 'feminine') borderClass = 'border-feminine';
    if (word.gender === 'neutral') borderClass = 'border-neutral';

    container.innerHTML = `
        <div id="active-card" class="w-full h-full bg-slate-800 rounded-3xl border-2 ${borderClass} flex flex-col items-center justify-center p-6 shadow-2xl relative overflow-hidden card-transition">
            <div class="absolute top-4 right-4 text-xs font-bold uppercase tracking-widest opacity-50 text-white">${word.gender}</div>
            <h2 class="text-3xl font-bold text-white mb-2 text-center">${word.german}</h2>
            <p class="text-slate-400 text-lg mb-8 text-center">${word.english}</p>
            <div class="w-full bg-slate-900/50 p-4 rounded-xl">
                <p class="text-sm text-slate-300 italic text-center">"${word.example}"</p>
            </div>
        </div>
    `;
}

window.handleSwipe = async function (known) {
    if (!currentVocab) return;

    const card = document.getElementById('active-card');
    const x = known ? 200 : -200;
    card.style.transform = `translateX(${x}px) rotate(${known ? 10 : -10}deg)`;
    card.style.opacity = '0';

    // Submit answer
    try {
        await fetch(`${API_BASE}/api/vocab/answer?vocab_id=${currentVocab.id}&known=${known}`, {
            method: 'POST'
        });

        // Award XP for correct answer
        if (known) {
            window.profileManager.awardXP(5, 'Vocab +5');
            await loadUserStats(); // Refresh stats display
        }
    } catch (error) {
        console.error('Error submitting answer:', error);
    }

    // Load next card
    setTimeout(() => {
        loadVocabCard();
    }, 300);
};

window.playVocabAudio = function () {
    if (!currentVocab) return;
    speakText(currentVocab.german);
};

async function generateVocab() {
    const container = document.getElementById('vocab-card-container');
    container.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full">
            <div class="loader mb-4"></div>
            <p class="text-slate-400 text-center">Generating vocabulary...<br>This may take 30-60 seconds</p>
        </div>
    `;

    try {
        const response = await fetch(`${API_BASE}/api/vocab/generate?topic=general&count=50`, {
            method: 'POST'
        });
        const data = await response.json();

        if (data.success) {
            loadVocabCard();
        } else {
            container.innerHTML = '<p class="text-red-400">Generation failed. Check API key in .env</p>';
        }
    } catch (error) {
        console.error('Error generating vocab:', error);
        container.innerHTML = '<p class="text-red-400">Error: ' + error.message + '</p>';
    }
}

// Text-to-Speech
function speakText(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'de-DE';
    window.speechSynthesis.speak(utterance);
}

// Grammar Functions
window.loadGrammarDrill = async function () {
    console.log('loadGrammarDrill called');
    const container = document.getElementById('grammar-container');
    if (!container) {
        console.error('grammar-container not found');
        return;
    }
    container.innerHTML = '<div class="flex items-center justify-center h-full"><div class="loader"></div></div>';

    try {
        console.log('Fetching grammar drill...');
        const response = await fetch(`${API_BASE}/api/grammar/drill`);
        const data = await response.json();
        console.log('Grammar drill data:', data);

        if (data.action === 'generate') {
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full text-center p-6">
                    <i class="fas fa-hammer text-6xl text-slate-700 mb-4"></i>
                    <p class="text-slate-400 mb-4">No grammar drills cached.</p>
                    <button onclick="generateGrammar()" class="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-lg font-bold">
                        Generate Drills
                    </button>
                </div>
            `;
            return;
        }

        renderGrammarDrill(data);
    } catch (error) {
        console.error('Error loading grammar:', error);
        container.innerHTML = '<p class="text-red-400 text-center">Error loading grammar drill</p>';
    }
}

let currentDrill = null;
let selectedWords = [];

function renderGrammarDrill(drill) {
    currentDrill = drill;
    selectedWords = [];
    const container = document.getElementById('grammar-container');

    container.innerHTML = `
        <div class="flex flex-col h-full max-w-lg mx-auto p-4">
            <!-- Instruction -->
            <div class="mb-6 text-center">
                <span class="text-xs font-bold text-yellow-500 uppercase tracking-widest">Sentence Builder</span>
                <h3 class="text-xl text-white mt-2">${drill.instruction}</h3>
                <p class="text-slate-400 text-sm italic mt-1">${drill.rule || ''}</p>
            </div>

            <!-- Answer Drop Zone -->
            <div id="answer-zone" class="bg-slate-800/50 rounded-xl p-4 min-h-[80px] mb-6 flex flex-wrap gap-2 border-2 border-dashed border-slate-700 transition-all">
                <p class="text-slate-600 w-full text-center py-2 instruction-text">Tap words effectively to build a sentence</p>
            </div>

            <!-- Validation Message -->
            <div id="grammar-feedback" class="hidden mb-4 p-3 rounded-lg text-center font-bold"></div>

            <!-- Word Bank -->
            <div id="word-bank" class="flex flex-wrap gap-2 justify-center mb-auto">
                ${drill.scrambled.map((word, index) => `
                    <button onclick="selectWord('${word.replace(/'/g, "\\'")}', this)" class="word-chip bg-slate-700 text-white px-4 py-2 rounded-lg font-medium active:scale-95 transition-transform hover:bg-slate-600">
                        ${word}
                    </button>
                `).join('')}
            </div>

            <!-- Controls -->
            <div class="mt-4 grid grid-cols-2 gap-4">
                <button onclick="resetDrill()" class="bg-slate-700 text-slate-300 py-3 rounded-xl font-bold">Reset</button>
                <button onclick="checkGrammarAnswer()" class="bg-green-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-green-900/20">Check</button>
            </div>
        </div>
    `;
}

window.selectWord = function (word, btnElement) {
    const answerZone = document.getElementById('answer-zone');
    const instruction = answerZone.querySelector('.instruction-text');

    if (instruction) instruction.remove();

    // Create new chip in answer zone
    const chip = document.createElement('button');
    chip.className = 'bg-yellow-500 text-slate-900 px-4 py-2 rounded-lg font-bold animate-pop';
    chip.textContent = word;
    chip.onclick = function () {
        // Return to bank (simplified: just remove and unhide original)
        this.remove();
        btnElement.classList.remove('opacity-0', 'pointer-events-none');
        selectedWords = selectedWords.filter(w => w !== word); // This logic is imperfect for duplicate words, but fine for prototype
    };

    answerZone.appendChild(chip);

    // Hide original button
    btnElement.classList.add('opacity-0', 'pointer-events-none');
    selectedWords.push(word);
};

window.resetDrill = function () {
    if (currentDrill) renderGrammarDrill(currentDrill);
};

window.checkGrammarAnswer = async function () {
    if (!currentDrill) return;

    try {
        const response = await fetch(`${API_BASE}/api/grammar/check?exercise_id=${currentDrill.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(selectedWords)
        });
        const result = await response.json();

        const feedback = document.getElementById('grammar-feedback');
        feedback.classList.remove('hidden', 'bg-red-500/20', 'text-red-400', 'bg-green-500/20', 'text-green-400');

        if (result.correct) {
            feedback.classList.add('bg-green-500/20', 'text-green-400');
            feedback.textContent = result.feedback;
            speakText(result.correct_answer);

            // Award XP for correct answer
            window.profileManager.awardXP(10, 'Grammar +10');
            await loadUserStats();

            setTimeout(loadGrammarDrill, 2000);
        } else {
            feedback.classList.add('bg-red-500/20', 'text-red-400');
            feedback.textContent = result.feedback;
        }
    } catch (error) {
        console.error('Check failed:', error);
    }
};

window.generateGrammar = async function () {
    const container = document.getElementById('grammar-container');
    container.innerHTML = '<div class="loader"></div><p class="text-center mt-4 text-slate-400">Generating exercises...</p>';

    try {
        await fetch(`${API_BASE}/api/grammar/generate?count=10`, { method: 'POST' });
        loadGrammarDrill();
    } catch (e) {
        container.innerHTML = '<p class="text-red-400 text-center">Generation failed.</p>';
    }
};

// Settings Modal
window.toggleSettings = function () {
    document.getElementById('settings-modal').classList.toggle('hidden');
};
