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
// Tab Navigation
window.switchTab = function (tabId) {
    // 0. Close Lesson Modal if open (Fixes navigation issue)
    if (typeof closeLesson === 'function') closeLesson();

    // Handle specific practice modes by redirecting to practice tab
    if (['grammar', 'reading', 'speaking'].includes(tabId)) {
        switchTab('practice');
        setTimeout(() => openPracticeMode(tabId), 10); // Small delay to ensure tab switch completes
        return;
    }

    currentTab = tabId;

    // 1. Reset Navbar Styling
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('text-yellow-500', 'text-green-500', 'text-primary', 'text-indigo-400', 'text-white');
        btn.classList.add('text-slate-500');
    });

    // 2. Highlight Active Button
    const activeBtn = document.getElementById(`nav-${tabId}`);
    if (activeBtn) {
        activeBtn.classList.remove('text-slate-500');
        // Apply specific color based on tab
        const activeColor = tabId === 'home' ? 'text-yellow-500' :
            tabId === 'vocab' ? 'text-green-500' :
                tabId === 'practice' ? 'text-primary' :
                    'text-indigo-400';
        activeBtn.classList.add(activeColor);
    }

    // 3. Hide All Tabs
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
        content.classList.remove('flex');
        content.classList.remove('active');
    });

    // 4. Show Selected Tab
    const selectedTab = document.getElementById(`tab-${tabId}`);
    if (selectedTab) {
        selectedTab.classList.remove('hidden');
        selectedTab.classList.add('flex');
        selectedTab.classList.add('active');
    }

    // Reset Scroll Position
    const mainContainer = document.querySelector('main');
    if (mainContainer) mainContainer.scrollTop = 0;

    // 5. specific logic
    if (tabId === 'learn') {
        loadCurriculum();
    } else if (tabId === 'vocab') {
        loadVocabCard();
    } else if (tabId === 'practice') {
        backToPracticeHub();
    }
};

// Practice Hub Interaction
// Practice Hub Interaction
window.openPracticeMode = function (mode) {
    // Hide Hub
    const hub = document.getElementById('practice-hub');
    if (hub) hub.classList.add('hidden');

    // Show Header
    const header = document.getElementById('practice-nav-header');
    if (header) header.classList.remove('hidden');

    // Hide all practice containers
    ['grammar-container', 'reading-container', 'speaking-container'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    // Show selected container
    const container = document.getElementById(`${mode}-container`);
    if (container) {
        container.classList.remove('hidden');
        container.classList.add('flex');
    }

    // Reset Scroll Position
    const mainContainer = document.querySelector('main');
    if (mainContainer) mainContainer.scrollTop = 0;

    // Trigger Loaders
    if (mode === 'grammar' && window.loadGrammarDrill) window.loadGrammarDrill();
    if (mode === 'reading' && window.loadReadingText) window.loadReadingText();
    if (mode === 'speaking' && window.loadSpeakingPhrase) window.loadSpeakingPhrase();
};

window.backToPracticeHub = function () {
    // Hide Header
    const header = document.getElementById('practice-nav-header');
    if (header) header.classList.add('hidden');

    // Hide all practice containers
    ['grammar-container', 'reading-container', 'speaking-container'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    // Show Hub
    const hub = document.getElementById('practice-hub');
    if (hub) hub.classList.remove('hidden');

    // Reset Scroll Position
    const mainContainer = document.querySelector('main');
    if (mainContainer) mainContainer.scrollTop = 0;
};

// Initialize Profile System
function initializeProfile() {
    updateProfileDisplay();
    checkStreak(); // Check and update streak on load

    // Listen for profile changes
    window.addEventListener('profileChanged', (e) => {
        updateProfileDisplay();
        loadUserStats();
        // Reload current tab content to reflect new user state if needed
        if (currentTab === 'vocab') loadVocabCard();
    });

    // Listen for updates (XP gain, etc)
    window.addEventListener('profileUpdated', (e) => {
        updateProfileDisplay();
    });
}

function updateProfileDisplay() {
    const profile = window.profileManager.getActiveProfile();

    // Update Header
    document.getElementById('profile-name').textContent = profile.name;
    document.getElementById('profile-level').textContent = `LEVEL ${profile.level}`;

    const avatar = document.getElementById('profile-avatar');
    avatar.textContent = profile.name.charAt(0).toUpperCase();
    avatar.style.background = profile.color; // Use profile color
    if (profile.color.startsWith('#')) {
        // Add subtle gradient if it's a hex color
        avatar.style.backgroundImage = `linear-gradient(135deg, ${profile.color}, ${adjustColor(profile.color, -20)})`;
    }
}

// Check for daily streak on load
async function checkStreak() {
    const result = window.profileManager.updateStreak();
    if (result.bonusXP > 0) {
        // Show streak notification
        window.profileManager.showXPAnimation(result.bonusXP, result.message);
    }
}

// Profile Menu Functions
window.toggleProfileMenu = function () {
    const menu = document.getElementById('profile-menu');
    menu.classList.toggle('hidden');

    if (!menu.classList.contains('hidden')) {
        renderProfileList();
    }
};

function renderProfileList() {
    const profiles = window.profileManager.getProfiles();
    const active = window.profileManager.getActiveProfile();
    const list = document.getElementById('profile-list');

    list.innerHTML = profiles.map(p => `
        <button onclick="switchProfile('${p.id}')" class="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition ${p.id === active.id ? 'bg-white/10 ring-1 ring-white/20' : ''}">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs" style="background: ${p.color}; background-image: linear-gradient(135deg, ${p.color}, ${adjustColor(p.color, -20)})">
                ${p.name.charAt(0).toUpperCase()}
            </div>
            <div class="flex-1 text-left">
                <div class="text-sm font-medium text-white">${p.name}</div>
                <div class="text-[10px] text-slate-400">Level ${p.level} • ${p.xp} XP</div>
            </div>
            ${p.id === active.id ? '<i class="fas fa-check text-green-500"></i>' : ''}
        </button>
    `).join('');
}

window.switchProfile = function (profileId) {
    window.profileManager.setActiveProfile(profileId);
    window.toggleProfileMenu(); // Close menu
};

window.createNewProfile = function () {
    const name = prompt("Enter name for new profile:");
    if (name) {
        try {
            const newProfile = window.profileManager.createProfile(name);
            window.profileManager.setActiveProfile(newProfile.id);
            window.toggleProfileMenu();
        } catch (e) {
            alert(e.message);
        }
    }
};

// Helper to darken color for gradient
function adjustColor(color, amount) {
    return '#' + color.replace(/^#/, '').replace(/../g, color => ('0' + Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
}

// Load User Stats from Profile
async function loadUserStats() {
    try {
        const profile = window.profileManager.getActiveProfile();

        document.getElementById('user-streak').innerHTML = `
            ${profile.streak} <span class="text-sm font-normal opacity-50">days</span>
        `;
        document.getElementById('user-xp').innerHTML = `
            ${profile.xp} <span class="text-sm font-normal opacity-50">XP</span>
        `;

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

    let borderColor = 'border-green-500/50';
    let glowShadow = 'shadow-glow-green';
    let genderLabel = 'Neutral';
    let iconColorBg = 'bg-green-400';
    let article = '';
    let articleColor = 'text-green-400/80';
    let btnBg = 'bg-green-500/20';
    let btnBorder = 'border-green-500/40';
    let btnHover = 'hover:bg-green-500/40';
    let btnGlow = 'group-hover:shadow-[0_0_15px_rgba(34,197,94,0.4)]';
    let btnText = 'text-green-100';
    let contextHighlight = 'text-green-300';
    let gradientFrom = 'from-green-500/5';

    if (word.gender === 'masculine' || word.gender === 'der') {
        borderColor = 'border-blue-500/50';
        glowShadow = 'shadow-glow-blue-strong';
        genderLabel = 'Masculine';
        iconColorBg = 'bg-blue-400';
        article = 'der';
        articleColor = 'text-blue-400/80';
        btnBg = 'bg-blue-500/20';
        btnBorder = 'border-blue-500/40';
        btnHover = 'hover:bg-blue-500/40';
        btnGlow = 'group-hover:shadow-[0_0_15px_rgba(59,130,246,0.4)]';
        btnText = 'text-blue-100';
        contextHighlight = 'text-blue-300';
        gradientFrom = 'from-blue-500/5';
    } else if (word.gender === 'feminine' || word.gender === 'die') {
        borderColor = 'border-red-500/50';
        glowShadow = 'shadow-glow-red';
        genderLabel = 'Feminine';
        iconColorBg = 'bg-red-400';
        article = 'die';
        articleColor = 'text-red-400/80';
        btnBg = 'bg-red-500/20';
        btnBorder = 'border-red-500/40';
        btnHover = 'hover:bg-red-500/40';
        btnGlow = 'group-hover:shadow-[0_0_15px_rgba(239,68,68,0.4)]';
        btnText = 'text-red-100';
        contextHighlight = 'text-red-300';
        gradientFrom = 'from-red-500/5';
    } else if (word.gender === 'neutral' || word.gender === 'das') {
        article = 'das';
    }

    const exampleSentence = word.example || '';

    container.innerHTML = `
        <div id="active-card" class="glass-card relative w-full h-full rounded-3xl ${glowShadow} flex flex-col items-center justify-center p-8 overflow-hidden transition-transform duration-500 group ${borderColor}">
            <!-- Gradient overlay -->
            <div class="absolute inset-0 bg-gradient-to-tr ${gradientFrom} via-transparent to-white/5 pointer-events-none"></div>
            
            <!-- Gender badge top-right -->
            <div class="absolute top-6 right-6 z-20">
                <span class="px-3 py-1.5 rounded-full bg-white/5 backdrop-blur-md ${articleColor.replace('/80', '')} border border-white/10 text-[10px] font-bold tracking-widest uppercase shadow-sm">
                    ${word.topic || genderLabel}
                </span>
            </div>

            <!-- Gender icon top-left -->
            <div class="absolute top-6 left-6 opacity-30 z-20">
                <span class="w-2.5 h-2.5 rounded-full ${iconColorBg} inline-block"></span>
            </div>

            <!-- Main Content -->
            <div class="flex flex-col items-center text-center gap-8 z-10 mt-2 w-full">
                <div class="flex items-center justify-center gap-4 w-full">
                    <div class="flex flex-col items-center">
                        <h1 class="text-5xl font-bold tracking-tight text-white drop-shadow-xl flex items-baseline gap-3">
                            ${article ? `<span class="${articleColor} font-normal text-2xl tracking-normal">${article}</span>` : ''}${word.german}
                        </h1>
                    </div>
                    <button onclick="playVocabAudio()" class="flex items-center justify-center w-12 h-12 rounded-full ${btnBg} ${btnText} border ${btnBorder} ${btnHover} hover:scale-105 active:scale-95 transition-all backdrop-blur-sm ${btnGlow}">
                        <i class="fas fa-volume-up text-xl"></i>
                    </button>
                </div>
                
                <!-- Divider -->
                <div class="w-12 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                
                <!-- Translation -->
                <div>
                    <p class="text-xl text-slate-400 font-medium tracking-wide">${word.english}</p>
                </div>

                ${exampleSentence ? `
                <!-- Context (inside card) -->
                <div class="w-full glass-panel rounded-xl p-4 flex flex-col items-center text-center gap-2 relative overflow-hidden">
                    <div class="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                    <div class="flex items-center gap-2 ${articleColor.replace('/80', '/70')}">
                        <i class="fas fa-lightbulb text-xs"></i>
                        <span class="text-[10px] uppercase tracking-widest font-bold">Context</span>
                    </div>
                    <p class="text-sm text-white/90 font-medium leading-relaxed tracking-wide">"${exampleSentence}"</p>
                </div>
                ` : ''}
            </div>

            <!-- Swipe hint -->
            <div class="absolute bottom-3 left-0 right-0 flex justify-center items-center gap-2 opacity-30 text-[10px] uppercase tracking-widest text-white z-20">
                <i class="fas fa-hand-pointer animate-bounce"></i> Swipe or Tap Buttons
            </div>

            <!-- Bottom fade -->
            <div class="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t ${gradientFrom.replace('/5', '/10')} to-transparent pointer-events-none"></div>
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


// --- The Path (Curriculum) Logic ---

let currentChapters = [];
let currentLessonId = null;
let currentLessonData = null;

async function loadCurriculum() {
    try {
        const response = await fetch(`${API_BASE}/api/chapters`);
        const chapters = await response.json();
        currentChapters = chapters;
        renderChapterList(chapters);
    } catch (error) {
        console.error('Error loading curriculum:', error);
    }
}

function renderChapterList(chapters) {
    const list = document.getElementById('chapter-list');
    if (!list) return;

    // Find active chapter (first non-completed, non-locked)
    const activeChapter = chapters.find(c => !c.is_completed && !c.is_locked);
    const completedChapters = chapters.filter(c => c.is_completed);
    const lockedChapters = chapters.filter(c => c.is_locked);

    // Difficulty color map
    const diffColors = {
        'Beginner': { bg: 'bg-green-500/20', text: 'text-green-300', border: 'border-green-500/30' },
        'Intermediate': { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/30' },
        'Advanced': { bg: 'bg-orange-500/20', text: 'text-orange-300', border: 'border-orange-500/30' },
        'Expert': { bg: 'bg-red-500/20', text: 'text-red-300', border: 'border-red-500/30' }
    };

    let html = '<div class="relative"><div class="path-line"></div><div class="relative z-10">';

    // Active Chapter Banner (Stitch Screen 1 style)
    if (activeChapter) {
        const diff = diffColors[activeChapter.difficulty] || diffColors['Beginner'];
        const vocabCount = (activeChapter.content?.key_vocab || []).length;
        const algoCount = (activeChapter.content?.grammar_algorithms || []).length;
        const totalItems = vocabCount + algoCount;
        const completedItems = 0; // Future: track per-section progress
        const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
        const dashArray = 175.9;
        const dashOffset = dashArray - (dashArray * progressPercent / 100);

        // Extract focus tags from grammar_algorithms concepts
        const focusTags = (activeChapter.content?.grammar_algorithms || [])
            .slice(0, 3)
            .map(a => a.concept || a.rule_name || '')
            .filter(Boolean);

        html += `
            <div class="mb-8">
                <div class="glass-banner rounded-3xl p-6 relative overflow-hidden group border-t border-white/10">
                    <div class="absolute -right-20 -top-20 w-64 h-64 bg-blue-900/30 rounded-full blur-[60px] pointer-events-none"></div>
                    <div class="absolute -left-10 bottom-0 w-40 h-40 bg-primary/10 rounded-full blur-[40px] pointer-events-none"></div>
                    <div class="relative z-10">
                        <div class="flex justify-between items-start mb-6">
                            <div class="space-y-1">
                                <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider border border-primary/20 shadow-[0_0_10px_rgba(242,153,74,0.3)]">
                                    <span class="relative flex h-2 w-2">
                                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                        <span class="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                    </span>
                                    In Progress
                                </span>
                                <h2 class="text-3xl font-bold text-white leading-tight pt-2">Chapter ${activeChapter.id}</h2>
                                <p class="text-slate-300 font-medium">${activeChapter.title}</p>
                            </div>
                            <div class="relative h-16 w-16 flex items-center justify-center">
                                <svg class="transform -rotate-90 w-16 h-16">
                                    <circle class="text-slate-700" cx="32" cy="32" fill="transparent" r="28" stroke="currentColor" stroke-width="4"></circle>
                                    <circle class="text-primary" cx="32" cy="32" fill="transparent" r="28" stroke="currentColor" stroke-dasharray="${dashArray}" stroke-dashoffset="${dashOffset}" stroke-linecap="round" stroke-width="4" style="filter: drop-shadow(0 0 6px rgba(242,153,74,0.5))"></circle>
                                </svg>
                                <span class="absolute text-sm font-bold text-white">${progressPercent}%</span>
                            </div>
                        </div>
                        <div class="flex flex-wrap gap-2 mb-6">
                            <span class="px-2.5 py-1 ${diff.bg} rounded-md text-xs ${diff.text} border ${diff.border} backdrop-blur-sm">${activeChapter.difficulty || 'Beginner'}</span>
                            ${focusTags.map(tag => `<span class="px-2.5 py-1 bg-white/5 rounded-md text-xs text-slate-300 border border-white/10 backdrop-blur-sm">${tag}</span>`).join('')}
                        </div>
                        <div class="space-y-2 mb-6">
                            <div class="flex justify-between text-xs font-medium text-slate-400">
                                <span>Lesson Content</span>
                                <span class="text-primary">${vocabCount} Vocab • ${algoCount} Rules</span>
                            </div>
                            <div class="h-2.5 w-full bg-slate-800/50 rounded-full overflow-hidden border border-white/5">
                                <div class="h-full bg-gradient-to-r from-primary to-orange-400 rounded-full shadow-[0_0_12px_rgba(242,153,74,0.6)] relative" style="width: ${Math.max(progressPercent, 5)}%">
                                    <div class="absolute right-0 top-0 bottom-0 w-1 bg-white/20"></div>
                                </div>
                            </div>
                        </div>
                        <button onclick="openLesson(${activeChapter.id})" class="w-full py-3.5 bg-primary hover:bg-orange-400 text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group/btn">
                            <span>Continue Learning</span>
                            <span class="material-icons-round text-lg group-hover/btn:translate-x-1 transition-transform">arrow_forward</span>
                        </button>
                    </div>
                </div>
            </div>`;
    }

    // Chapter list with path dots
    html += '<div class="space-y-6 pl-8">';

    // Completed chapters
    completedChapters.forEach(chapter => {
        const diff = diffColors[chapter.difficulty] || diffColors['Beginner'];
        // Extract topic tags from grammar_algorithms
        const topics = (chapter.content?.grammar_algorithms || [])
            .slice(0, 3)
            .map(a => a.concept || '')
            .filter(Boolean)
            .join(' • ');

        html += `
            <div class="relative group" onclick="openLesson(${chapter.id})">
                <div class="absolute -left-[2.45rem] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-800 border-2 border-primary z-10 shadow-[0_0_10px_rgba(242,153,74,0.3)] flex items-center justify-center">
                    <div class="w-1.5 h-1.5 rounded-full bg-primary"></div>
                </div>
                <div class="glass p-5 rounded-2xl hover:bg-white/10 transition-all duration-300 cursor-pointer border-l-2 border-l-transparent hover:border-l-primary/50">
                    <div class="flex items-start justify-between mb-1">
                        <div>
                            <span class="text-xs font-semibold text-primary uppercase tracking-wide mb-1 block">Completed</span>
                            <h3 class="text-lg font-bold text-white">Chapter ${chapter.id}: ${chapter.title}</h3>
                        </div>
                        <div class="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center">
                            <span class="material-icons-round text-green-500 text-lg">check</span>
                        </div>
                    </div>
                    <p class="text-sm text-slate-400 mb-3 leading-relaxed">${chapter.summary}</p>
                    <div class="flex items-center gap-2">
                        <span class="px-2 py-0.5 ${diff.bg} rounded text-[10px] font-bold ${diff.text} border ${diff.border}">${chapter.difficulty || 'Beginner'}</span>
                        ${topics ? `<span class="text-xs text-slate-500 font-medium">${topics}</span>` : ''}
                    </div>
                </div>
            </div>`;
    });

    // Other unlocked chapters (not active, not completed)
    const otherUnlocked = chapters.filter(c => !c.is_completed && !c.is_locked && c !== activeChapter);
    otherUnlocked.forEach(chapter => {
        const diff = diffColors[chapter.difficulty] || diffColors['Beginner'];
        html += `
            <div class="relative group" onclick="openLesson(${chapter.id})">
                <div class="absolute -left-[2.45rem] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-800 border-2 border-slate-600 group-hover:border-primary transition-colors z-10"></div>
                <div class="glass p-5 rounded-2xl hover:bg-white/10 transition-all duration-300 cursor-pointer border-l-2 border-l-transparent hover:border-l-primary/50">
                    <div class="flex items-start justify-between mb-1">
                        <div>
                            <span class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Available</span>
                            <h3 class="text-lg font-bold text-white">${chapter.title}</h3>
                        </div>
                        <span class="px-2 py-0.5 ${diff.bg} rounded text-[10px] font-bold ${diff.text} border ${diff.border}">${chapter.difficulty || 'Beginner'}</span>
                    </div>
                    <p class="text-sm text-slate-400 leading-relaxed">${chapter.summary}</p>
                </div>
            </div>`;
    });

    // Locked chapters
    lockedChapters.forEach(chapter => {
        html += `
            <div class="relative group opacity-60">
                <div class="absolute -left-[2.45rem] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-800 border-2 border-slate-700 z-10"></div>
                <div class="glass p-5 rounded-2xl border border-dashed border-white/10 bg-transparent hover:bg-white/5 transition-all duration-300">
                    <div class="flex items-start justify-between mb-1">
                        <div>
                            <span class="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1 block">Locked</span>
                            <h3 class="text-lg font-bold text-slate-400">Chapter ${chapter.id}: ${chapter.title}</h3>
                        </div>
                        <div class="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center">
                            <span class="material-icons-round text-slate-600 text-lg">lock</span>
                        </div>
                    </div>
                    <p class="text-sm text-slate-500 mb-3 leading-relaxed">${chapter.summary}</p>
                    <div class="text-xs text-slate-600 font-medium flex items-center gap-2">
                        <span class="material-icons-round text-[14px]">menu_book</span>
                        <span>Complete previous chapter to unlock</span>
                    </div>
                </div>
            </div>`;
    });

    html += '</div></div></div>';
    list.innerHTML = html;
}

window.openLesson = function (chapterId) {
    currentLessonId = chapterId;
    const chapter = currentChapters.find(c => c.id === chapterId);
    if (!chapter) return;
    currentLessonData = chapter;

    document.getElementById('lesson-title').innerText = chapter.title;
    document.getElementById('lesson-subtitle').innerText = chapter.content?.difficulty || 'Core Logic';
    const screen = document.getElementById('lesson-screen');
    screen.classList.remove('hidden');
    screen.classList.add('flex');

    renderImmersiveLesson(chapter);

    // Hide main navbar so it doesn't peek through
    const nav = document.querySelector('nav');
    if (nav) nav.style.display = 'none';
}

window.closeLesson = function () {
    const screen = document.getElementById('lesson-screen');
    screen.classList.add('hidden');
    screen.classList.remove('flex');
    currentLessonId = null;
    currentLessonData = null;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();

    // Restore main navbar
    const nav = document.querySelector('nav');
    if (nav) nav.style.display = '';
}

window.closeExercise = function () {
    const screen = document.getElementById('exercise-screen');
    screen.classList.add('hidden');
    screen.classList.remove('flex');
}

// --- SCREEN 2: Immersive Lesson Renderer ---

function renderImmersiveLesson(chapter) {
    const container = document.getElementById('lesson-content');
    const content = chapter.content || {};
    const algorithms = content.grammar_algorithms || [];
    const examProtocols = content.exam_protocols || {};
    const dataVaults = content.data_vaults || {};
    const keyVocab = content.key_vocab || [];
    const dialogues = content.dialogues || [];

    let sections = '';

    // --- Section 1: Grammar Logic Cards (Horizontal Carousel) ---
    if (algorithms.length > 0) {
        const carouselId = 'grammar-carousel-' + Date.now();
        const cardsHtml = algorithms.map((algo, idx) => {
            const concept = algo.concept || algo.rule_name || `Rule ${idx + 1}`;
            const logic = algo.logic || algo.explanation || '';
            const formula = algo.formula || '';
            const examples = algo.examples || [];

            const exHtml = examples.slice(0, 3).map((ex, i) => {
                let g = '', e = '';
                if (typeof ex === 'string') { g = ex; } else { g = ex.german || ''; e = ex.english || ''; }
                const safe = g.replace(/'/g, "\\'");
                const bC = i % 2 === 0 ? 'border-primary' : 'border-accent-blue';
                const tC = i % 2 === 0 ? 'text-primary' : 'text-accent-blue';
                return `<div onclick="playAudio('${safe}')" class="glass-card-dark p-3 rounded-xl border-l-2 ${bC} flex items-center justify-between cursor-pointer hover:bg-white/5 transition-all">
                    <div>${e ? `<span class="text-[10px] font-bold ${tC} uppercase block mb-0.5">${e}</span>` : ''}<p class="text-lg font-medium text-white">${g}</p></div>
                    <span class="material-icons-round text-slate-600 text-lg">volume_up</span>
                </div>`;
            }).join('');

            return `<div class="grammar-card glass rounded-3xl overflow-hidden relative shadow-xl shadow-black/40 w-[75vw] max-w-[320px] snap-center flex-shrink-0">
                <div class="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-70"></div>
                <div class="p-5">
                    <div class="flex justify-between items-start mb-3">
                        <div>
                            <div class="flex items-center gap-2 mb-2">
                                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary border border-primary/20 uppercase tracking-wider">Grammar</span>
                                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-700/50 text-slate-400 border border-white/5 uppercase tracking-wider">${content.difficulty || 'A1'}</span>
                                <span class="text-[10px] text-slate-500 ml-auto">${idx + 1}/${algorithms.length}</span>
                            </div>
                            <h2 class="text-xl font-bold text-white leading-tight">${concept}</h2>
                        </div>
                        <button onclick="playAudio('${concept.replace(/'/g, "\\'")}')" class="h-10 w-10 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors group flex-shrink-0">
                            <span class="material-icons-round text-primary text-xl group-hover:scale-110 transition-transform">play_arrow</span>
                        </button>
                    </div>
                    ${exHtml ? `<div class="space-y-2 mb-3">${exHtml}</div>` : ''}
                    ${formula ? `<div class="p-3 rounded-xl bg-black/20 border border-white/5 mb-3"><p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Formula</p><p class="text-sm font-mono text-primary leading-relaxed">${formula}</p></div>` : ''}
                    ${logic ? `<div class="p-3 rounded-2xl glass-inner"><p class="text-slate-300 text-sm leading-relaxed">${logic}</p></div>` : ''}
                </div>
            </div>`;
        }).join('');

        sections += `<div class="space-y-3 relative">
            <div class="flex items-center justify-between px-1">
                <h3 class="text-lg font-bold text-white flex items-center gap-2">
                    <span class="material-symbols-outlined text-primary text-xl">psychology</span>
                    Grammar Logic
                </h3>
                <span class="text-xs text-slate-500 font-medium">${algorithms.length} Rules</span>
            </div>
            <div class="relative group/carousel -mx-6 w-[calc(100%+3rem)]">
                <div id="${carouselId}" class="carousel-scroll flex gap-4 overflow-x-auto no-scrollbar pb-6 pt-2 px-[12.5vw] sm:px-[calc(50%-160px)] scroll-smooth snap-x snap-mandatory">
                    ${cardsHtml}
                </div>
                ${algorithms.length > 1 ? `
                <button onclick="scrollCarousel('${carouselId}', -1)" class="carousel-arrow carousel-arrow-left absolute left-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-slate-950/60 border border-white/10 flex items-center justify-center text-white/50 hover:bg-slate-900/90 hover:text-primary hover:border-primary/50 hover:shadow-[0_0_15px_rgba(242,153,74,0.5)] transition-all backdrop-blur-md opacity-60 group-hover/carousel:opacity-100 shadow-lg">
                    <span class="material-icons-round text-2xl">chevron_left</span>
                </button>
                <button onclick="scrollCarousel('${carouselId}', 1)" class="carousel-arrow carousel-arrow-right absolute right-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-slate-950/60 border border-white/10 flex items-center justify-center text-white/50 hover:bg-slate-900/90 hover:text-primary hover:border-primary/50 hover:shadow-[0_0_15px_rgba(242,153,74,0.5)] transition-all backdrop-blur-md opacity-60 group-hover/carousel:opacity-100 shadow-lg">
                    <span class="material-icons-round text-2xl">chevron_right</span>
                </button>` : ''}
            </div>
        </div>`;
    }

    // --- Section 2: Goethe Exam Hacks ---
    const examEntries = Object.entries(examProtocols);
    if (examEntries.length > 0) {
        sections += `<div class="space-y-3">
            <h3 class="text-lg font-bold text-white px-1 flex items-center gap-2"><span class="material-symbols-outlined text-primary text-xl">school</span>Goethe Exam Hacks</h3>
            ${examEntries.map(([section, tip]) => `<div class="bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl p-4 border border-primary/20 relative overflow-hidden">
                <div class="absolute -right-4 -top-4 text-primary/10"><span class="material-icons-round text-8xl">lightbulb</span></div>
                <div class="relative z-10">
                    <h4 class="text-sm font-bold text-primary mb-1">${section.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h4>
                    <p class="text-xs text-slate-300 leading-relaxed">${typeof tip === 'string' ? tip : JSON.stringify(tip)}</p>
                </div>
            </div>`).join('')}
        </div>`;
    }

    // --- Section 3: Pattern Recognition (2-col grid) ---
    if (algorithms.length >= 2) {
        const icons = ['sync_alt', 'history', 'compare_arrows', 'swap_horiz'];
        const colors = ['accent-pink', 'accent-blue', 'accent-purple', 'green-400'];
        sections += `<div class="space-y-4">
            <div class="flex items-center justify-between px-1">
                <h3 class="text-lg font-bold text-white">Pattern Recognition</h3>
                <span class="text-xs text-slate-500 font-medium">${Math.min(algorithms.length, 4)} Rules</span>
            </div>
            <div class="grid grid-cols-2 gap-4">
                ${algorithms.slice(0, 4).map((algo, i) => {
            const ic = icons[i % icons.length], co = colors[i % colors.length];
            return `<div class="glass p-4 rounded-2xl flex flex-col h-full border border-white/5 relative overflow-hidden group">
                        <div class="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity"><span class="material-icons-round text-4xl text-${co}">${ic}</span></div>
                        <div class="mb-3"><div class="h-8 w-8 rounded-lg bg-${co}/20 flex items-center justify-center text-${co} mb-2"><span class="material-symbols-outlined text-lg">${ic}</span></div>
                        <h4 class="text-sm font-bold text-white">${algo.concept || ''}</h4></div>
                        <div class="mt-auto">${algo.formula ? `<div class="text-xs font-mono bg-black/20 p-2 rounded border border-white/5 text-${co}">${algo.formula}</div>` : `<p class="text-xs text-slate-400 leading-snug">${(algo.logic || '').slice(0, 60)}...</p>`}</div>
                    </div>`;
        }).join('')}
            </div>
        </div>`;
    }

    // --- Section 4: Key Vocabulary (horizontal scroll tiles) ---
    if (keyVocab.length > 0) {
        const vIcons = ['translate', 'abc', 'spellcheck', 'text_fields', 'font_download', 'language'];
        const vColors = ['yellow-400', 'green-400', 'blue-400', 'purple-400', 'pink-400', 'red-400'];
        const vocabScrollId = 'vocab-scroll-' + Date.now();
        sections += `<div class="space-y-4 relative">
            <div class="flex items-center justify-between px-1">
                <h3 class="text-lg font-bold text-white">Key Vocabulary</h3>
                <span class="text-xs text-slate-500 font-medium">${keyVocab.length} Words</span>
            </div>
            <div class="relative group/carousel">
                <div id="${vocabScrollId}" class="carousel-scroll flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-2 px-2 scroll-smooth snap-x snap-mandatory">
                    ${keyVocab.slice(0, 20).map((v, i) => {
            const word = typeof v === 'string' ? v : (v.german || v.word || '');
            const meaning = typeof v === 'string' ? '' : (v.english || v.meaning || v.translation || '');
            const article = typeof v === 'object' ? (v.article || '') : '';
            const safe = word.replace(/'/g, "\\'");
            return `<div onclick="playAudio('${safe}')" class="glass p-3 rounded-xl flex flex-col items-center justify-center text-center gap-2 min-w-[100px] aspect-square hover:bg-white/5 transition-colors cursor-pointer border border-white/5 flex-shrink-0 snap-start">
                    <span class="material-symbols-outlined text-2xl text-${vColors[i % vColors.length]}">${vIcons[i % vIcons.length]}</span>
                    <div><span class="block text-sm font-bold text-white">${article ? article + ' ' : ''}${word}</span>${meaning ? `<span class="block text-[10px] text-slate-400">${meaning}</span>` : ''}</div>
                </div>`;
        }).join('')}
                </div>
                ${keyVocab.length > 4 ? `
                <button onclick="scrollCarousel('${vocabScrollId}', -1)" class="carousel-arrow absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-slate-900/80 border border-white/10 flex items-center justify-center text-white/60 hover:text-primary hover:border-primary/30 hover:shadow-[0_0_12px_rgba(242,153,74,0.3)] transition-all backdrop-blur-sm opacity-0 group-hover/carousel:opacity-100">
                    <span class="material-icons-round text-lg">chevron_left</span>
                </button>
                <button onclick="scrollCarousel('${vocabScrollId}', 1)" class="carousel-arrow absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-slate-900/80 border border-white/10 flex items-center justify-center text-white/60 hover:text-primary hover:border-primary/30 hover:shadow-[0_0_12px_rgba(242,153,74,0.3)] transition-all backdrop-blur-sm opacity-0 group-hover/carousel:opacity-100">
                    <span class="material-icons-round text-lg">chevron_right</span>
                </button>` : ''}
            </div>
        </div>`;
    }

    // --- Section 5: Data Vaults (expand/collapse) ---
    const vaultEntries = Object.entries(dataVaults);
    if (vaultEntries.length > 0) {
        sections += `<div class="space-y-4">
            <div class="flex items-center justify-between px-1"><h3 class="text-lg font-bold text-white">Data Vaults</h3><span class="text-xs text-slate-500 font-medium">${vaultEntries.length} Collections</span></div>
            ${vaultEntries.map(([name, data], idx) => {
            const displayName = name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            const items = Array.isArray(data) ? data.slice(0, 12) : Object.entries(data).slice(0, 12);
            return `<details class="glass rounded-2xl border border-white/5 group" ${idx === 0 ? 'open' : ''}>
                    <summary class="p-4 cursor-pointer flex items-center justify-between hover:bg-white/5 transition-colors rounded-2xl">
                        <h4 class="text-sm font-bold text-white">${displayName}</h4>
                        <span class="material-icons-round text-slate-500 group-open:rotate-180 transition-transform text-lg">expand_more</span>
                    </summary>
                    <div class="px-4 pb-4 grid grid-cols-2 gap-2">
                        ${items.map(item => {
                if (typeof item === 'string') return `<div class="text-xs bg-black/20 p-2 rounded border border-white/5 text-slate-300">${item}</div>`;
                if (Array.isArray(item)) return `<div class="text-xs bg-black/20 p-2 rounded border border-white/5"><span class="text-primary font-medium">${item[0]}</span><span class="block text-slate-400 text-[10px] mt-0.5">${typeof item[1] === 'string' ? item[1] : JSON.stringify(item[1]).slice(0, 50)}</span></div>`;
                if (typeof item === 'object') { const l = item.german || item.word || item.name || ''; const s = item.english || item.meaning || ''; return `<div class="text-xs bg-black/20 p-2 rounded border border-white/5"><span class="text-white font-medium">${l}</span>${s ? `<span class="block text-slate-500 text-[10px] mt-0.5">${s}</span>` : ''}</div>`; }
                return '';
            }).join('')}
                    </div>
                </details>`;
        }).join('')}
        </div>`;
    }

    // --- Section 6: Dialogue chat bubbles ---
    if (dialogues.length > 0) {
        const turns = dialogues[0]?.turns || [];
        if (turns.length > 0) {
            sections += `<div class="space-y-4">
                <h3 class="text-lg font-bold text-white px-1 flex items-center gap-2"><span class="material-icons-round text-accent-blue text-xl">forum</span>Dialogue</h3>
                <div class="space-y-4">${turns.map((line, i) => {
                const sp = line.speaker || 'Speaker', tx = line.german || line.text || '', en = line.english || '';
                const safe = tx.replace(/'/g, "\\'"), ini = sp.charAt(0).toUpperCase(), isR = i % 2 === 1;
                return isR ? `<div class="flex flex-col items-end max-w-[85%] ml-auto space-y-1"><div class="flex items-end space-x-2 flex-row-reverse"><div class="w-8 h-8 rounded-full flex-shrink-0 border-2 border-primary/30 ml-2 bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">${ini}</div><div onclick="playAudio('${safe}')" class="relative px-4 py-3 rounded-2xl rounded-br-none glass bg-chat-right border border-primary/20 text-slate-100 shadow-xl cursor-pointer active:scale-95 transition-transform"><p class="text-[15px] leading-relaxed font-medium">${tx}</p>${en ? `<p class="text-xs text-primary/70 mt-1 italic">${en}</p>` : ''}</div></div><span class="text-[10px] text-slate-500 mr-10">${sp}</span></div>`
                    : `<div class="flex flex-col items-start max-w-[85%] space-y-1"><div class="flex items-end space-x-2"><div class="w-8 h-8 rounded-full flex-shrink-0 border-2 border-white/10 bg-white/5 flex items-center justify-center text-white/60 text-xs font-bold">${ini}</div><div onclick="playAudio('${safe}')" class="relative px-4 py-3 rounded-2xl rounded-bl-none glass bg-chat-left border border-white/5 text-slate-100 shadow-xl cursor-pointer active:scale-95 transition-transform"><p class="text-[15px] leading-relaxed font-medium">${tx}</p>${en ? `<p class="text-xs text-slate-400 mt-1 italic">${en}</p>` : ''}</div></div><span class="text-[10px] text-slate-500 ml-10">${sp}</span></div>`;
            }).join('')}</div>
            </div>`;
        }
    }

    if (!sections) sections = '<div class="p-8 text-center text-slate-400">No content available for this chapter yet.</div>';
    container.querySelector('.max-w-md').innerHTML = sections;

    // Enable mousewheel horizontal scrolling on all carousels
    setTimeout(() => {
        container.querySelectorAll('.carousel-scroll').forEach(el => {
            el.addEventListener('wheel', (e) => {
                if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                    e.preventDefault();
                    el.scrollBy({ left: e.deltaY * 2, behavior: 'smooth' });
                }
            }, { passive: false });

            // 3D Cylindrical Stack Effect for Grammar Carousel
            if (el.id.startsWith('grammar-carousel')) {
                el.style.perspective = '1500px';
                el.style.transformStyle = 'preserve-3d';

                const update3D = () => {
                    const containerCenter = el.getBoundingClientRect().left + el.offsetWidth / 2;
                    const cards = el.querySelectorAll('.grammar-card');

                    cards.forEach(card => {
                        const cardRect = card.getBoundingClientRect();
                        const cardCenter = cardRect.left + cardRect.width / 2;
                        const distance = cardCenter - containerCenter;

                        // Normalize distance relative to card width
                        let normalized = distance / (card.offsetWidth || 300);
                        normalized = Math.max(-1.5, Math.min(1.5, normalized)); // clamp

                        // Calculate 3D transforms
                        const rotateY = normalized * 35; // Warp left/right up to 35 deg
                        const translateZ = Math.abs(normalized) * -150; // Push inactive cards deep (-150px)
                        const scale = 1 - Math.abs(normalized) * 0.05; // Slightly scale down
                        const blur = Math.abs(normalized) * 4; // Depth of field blur
                        const zIndex = Math.round(100 - Math.abs(normalized) * 10);

                        // Active card power glow
                        const glowAlpha = Math.max(0, 1 - Math.abs(normalized) * 1.5);

                        card.style.transform = `rotateY(${rotateY}deg) translateZ(${translateZ}px) scale(${scale})`;
                        card.style.filter = `blur(${blur}px)`;
                        card.style.zIndex = zIndex;
                        card.style.transition = 'transform 0.1s ease-out, filter 0.1s ease-out, box-shadow 0.1s ease-out';

                        if (glowAlpha > 0.1) {
                            card.style.boxShadow = `0 10px 40px -10px rgba(0,0,0,0.8), 0 0 ${50 * glowAlpha}px ${5 * glowAlpha}px rgba(242, 153, 74, ${0.4 * glowAlpha})`;
                            card.style.opacity = 1;
                        } else {
                            card.style.boxShadow = '0 10px 30px -10px rgba(0,0,0,0.8)';
                            card.style.opacity = 1 - (Math.abs(normalized) - 0.7) * 0.8;
                        }
                    });
                };

                el.addEventListener('scroll', () => requestAnimationFrame(update3D));
                window.addEventListener('resize', () => requestAnimationFrame(update3D));
                // Initial injection
                requestAnimationFrame(update3D);
                // Secondary check in case images load
                setTimeout(update3D, 200);
            }
        });
    }, 100);
}

// --- Carousel scroll helper ---
window.scrollCarousel = function (id, direction) {
    const el = document.getElementById(id);
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.8;
    el.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
}

// --- SCREEN 3: Logic Gate Exercise Engine ---
let exerciseData = { questions: [], currentIndex: 0 };

window.openExercise = function () {
    if (!currentLessonData) return;
    const algorithms = (currentLessonData.content || {}).grammar_algorithms || [];
    if (algorithms.length === 0) { alert('No exercises for this chapter.'); return; }

    exerciseData.questions = algorithms.filter(a => a.examples && a.examples.length > 0).map(algo => {
        const ex = algo.examples[Math.floor(Math.random() * algo.examples.length)];
        const german = typeof ex === 'string' ? ex : (ex.german || '');
        const concept = algo.concept || algo.rule_name || '';
        const words = german.split(/\s+/);
        let blankIdx = words.findIndex(w => w.length >= 4);
        if (blankIdx === -1) blankIdx = Math.min(1, words.length - 1);
        const correctWord = words[blankIdx];
        const distractors = algorithms.filter(a => a !== algo && a.examples?.length > 0)
            .map(a => { const d = a.examples[0]; const dG = typeof d === 'string' ? d : (d.german || ''); return dG.split(/\s+/).filter(w => w.length >= 3)[0] || ''; })
            .filter(w => w && w !== correctWord).slice(0, 2);
        while (distractors.length < 2) distractors.push(words[0] || 'nicht');
        const options = [correctWord, ...distractors].sort(() => Math.random() - 0.5);
        return { sentence: german, concept, words, blankIdx, correctWord, options };
    }).slice(0, 5);

    exerciseData.currentIndex = 0;
    if (exerciseData.questions.length === 0) { alert('No exercises could be generated.'); return; }

    const screen = document.getElementById('exercise-screen');
    screen.classList.remove('hidden'); screen.classList.add('flex');
    renderExercise();
}

function renderExercise() {
    const q = exerciseData.questions[exerciseData.currentIndex];
    if (!q) { closeExercise(); return; }

    document.getElementById('exercise-progress').innerHTML = exerciseData.questions.map((_, i) =>
        i <= exerciseData.currentIndex ? `<div class="h-1.5 w-6 bg-primary rounded-full shadow-[0_0_8px_rgba(242,153,74,0.6)]"></div>` : `<div class="h-1.5 w-1.5 bg-slate-700 rounded-full"></div>`
    ).join('');

    const sentenceParts = q.words.map((word, i) => {
        if (i === q.blankIdx) return `<div class="relative group mx-1" id="exercise-blank"><div class="absolute -top-10 left-1/2 w-px h-10 bg-gradient-to-b from-transparent to-primary/50"></div><div class="absolute -top-1 left-1/2 w-2 h-2 -ml-1 rounded-full bg-primary/50"></div><div id="blank-slot" class="px-6 py-2.5 rounded-xl bg-slate-800/50 border-2 border-dashed border-slate-600 text-slate-500 font-bold min-w-[80px] text-center animate-float">?</div></div>`;
        return `<span class="px-3 py-2 rounded-lg text-slate-300 border border-transparent">${word}</span>`;
    }).join('');

    const optionsHtml = q.options.map((opt, i) => `
        <button onclick="selectExerciseOption(${i})" id="exercise-opt-${i}" class="relative h-36 rounded-2xl glass-panel hover:bg-slate-800/60 transition-all duration-300 group flex flex-col items-center justify-between p-4 border-slate-800 hover:border-slate-600">
            <div class="w-full flex justify-center pt-2"><span class="text-[10px] uppercase tracking-widest text-slate-500 font-mono group-hover:text-slate-300 transition-colors">${q.concept}</span></div>
            <span class="text-xl font-medium text-slate-300 group-hover:text-white group-hover:scale-110 transition-all duration-300">${opt}</span>
            <div class="w-8 h-1 rounded-full bg-slate-700/50 group-hover:bg-slate-600 transition-colors"></div>
        </button>`).join('');

    document.getElementById('exercise-content').innerHTML = `
        <div class="mt-2 mb-8 flex justify-center"><div class="inline-flex items-center px-4 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/50 shadow-lg backdrop-blur-md"><span class="material-symbols-outlined text-sm text-primary mr-2 fill-1">lightbulb</span><span class="text-xs font-mono text-slate-400 tracking-tight">CONTEXT: <span class="text-white font-semibold ml-1">${q.concept.toUpperCase()}</span></span></div></div>
        <div class="flex-grow flex flex-col justify-center mb-6 relative">
            <div class="absolute inset-0 z-0 opacity-30 pointer-events-none"><div class="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent border-t border-dashed border-slate-600"></div></div>
            <div class="relative glass-panel rounded-2xl p-6 sm:p-8 shadow-glass z-10">
                <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-slate-600 to-transparent opacity-30 rounded-t-2xl"></div>
                <div class="absolute -top-3 left-6 px-3 py-1 bg-[#0B1120] border border-slate-700 rounded-md text-[10px] sm:text-xs font-mono text-slate-400 tracking-wider shadow-lg">LOGIC_GATE_${String(exerciseData.currentIndex + 1).padStart(2, '0')}</div>
                <div class="flex flex-wrap items-center justify-center gap-y-4 gap-x-1.5 sm:gap-x-2 text-base sm:text-lg font-medium leading-relaxed mt-6 mb-2 px-1 text-center">${sentenceParts}<span class="text-slate-500 font-serif text-xl ml-0.5">.</span></div>
                <div id="exercise-feedback" class="mt-6 pt-5 border-t border-slate-700/30 text-center hidden"><p class="text-sm font-medium flex items-center justify-center gap-2"><span id="feedback-dot" class="w-1.5 h-1.5 rounded-full"></span><span id="feedback-text"></span></p></div>
            </div>
        </div>
        <div class="grid grid-cols-3 gap-3 mb-6">${optionsHtml}</div>`;

    const btn = document.getElementById('exercise-continue-btn');
    btn.style.opacity = '0.5'; btn.style.pointerEvents = 'none';
}

window.selectExerciseOption = function (optIdx) {
    const q = exerciseData.questions[exerciseData.currentIndex];
    if (!q) return;
    const selected = q.options[optIdx], isCorrect = selected === q.correctWord;

    const slot = document.getElementById('blank-slot');
    if (slot) {
        if (isCorrect) { slot.className = 'px-6 py-2.5 rounded-xl bg-primary/10 border border-primary text-primary font-bold shadow-neon-orange flex items-center justify-center space-x-2 animate-float'; slot.innerHTML = `<span>${selected}</span><span class="material-symbols-outlined text-lg fill-1">check_circle</span>`; }
        else { slot.className = 'px-6 py-2.5 rounded-xl bg-red-500/10 border border-red-500 text-red-400 font-bold'; slot.textContent = selected; }
    }

    q.options.forEach((opt, i) => {
        const el = document.getElementById(`exercise-opt-${i}`);
        if (!el) return;
        if (i === optIdx && isCorrect) {
            el.className = 'relative h-36 rounded-2xl glass-card-active flex flex-col items-center justify-between p-4 z-10 transform scale-105 transition-all duration-300';
            el.innerHTML = `<div class="absolute top-3 right-3"><span class="material-symbols-outlined text-primary text-lg font-bold">check</span></div><div class="w-full flex justify-center pt-2"><span class="text-[10px] uppercase tracking-widest text-primary/80 font-mono font-bold">${q.concept}</span></div><span class="text-2xl font-bold text-white drop-shadow-[0_0_8px_rgba(242,153,74,0.5)]">${opt}</span><div class="w-full flex justify-center pb-1"><div class="h-1 w-12 bg-primary/20 rounded-full overflow-hidden"><div class="h-full bg-primary w-full shadow-[0_0_10px_#F2994A]"></div></div></div><div class="absolute inset-0 rounded-2xl bg-primary/5 blur-xl -z-10"></div>`;
        } else if (i === optIdx) { el.className = 'relative h-36 rounded-2xl glass-panel flex flex-col items-center justify-between p-4 border border-red-500/50 opacity-60'; }
        else { el.style.opacity = '0.4'; el.style.pointerEvents = 'none'; }
    });

    const fb = document.getElementById('exercise-feedback'), ft = document.getElementById('feedback-text'), fd = document.getElementById('feedback-dot');
    if (fb) { fb.classList.remove('hidden'); }
    if (isCorrect) { if (ft) { ft.textContent = `Correct! "${q.correctWord}" is right.`; ft.className = 'text-sm text-primary font-medium'; } if (fd) fd.className = 'w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_5px_rgba(242,153,74,0.8)]'; }
    else { if (ft) { ft.textContent = `Not quite. Answer: "${q.correctWord}".`; ft.className = 'text-sm text-red-400 font-medium'; } if (fd) fd.className = 'w-1.5 h-1.5 rounded-full bg-red-400 shadow-[0_0_5px_rgba(248,113,113,0.8)]'; }

    const btn = document.getElementById('exercise-continue-btn');
    btn.style.opacity = '1'; btn.style.pointerEvents = 'auto';
}

window.nextExercise = function () {
    exerciseData.currentIndex++;
    if (exerciseData.currentIndex >= exerciseData.questions.length) {
        closeExercise();
        if (window.confetti) confetti({ particleCount: 100, spread: 60, origin: { y: 0.6 } });
        return;
    }
    renderExercise();
}






window.completeLesson = async function () {
    if (!currentLessonId) return;

    try {
        const response = await fetch(`${API_BASE}/api/chapters/${currentLessonId}/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: 1 })
        });

        // Celebration
        if (window.confetti) {
            window.confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 }
            });
        }

        // Refresh updates
        setTimeout(() => {
            closeLesson();
            loadCurriculum();
            loadUserStats(); // Update XP
        }, 2000);

    } catch (e) {
        console.error('Completion error', e);
    }
}

window.toggleMasterUnlock = async function () {
    try {
        await fetch(`${API_BASE}/api/chapters/settings/toggle_unlock`, { method: 'POST' });
        loadCurriculum(); // Refresh list
    } catch (e) {
        console.error(e);
    }
}

window.playAudio = function (text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'de-DE';
        window.speechSynthesis.speak(utterance);
    }
};

// (Removed redundant switchTab override)
