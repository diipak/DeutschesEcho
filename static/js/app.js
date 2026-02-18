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

    // Check master unlock status from first user check or derived
    // For now assuming implicit from API response content

    list.innerHTML = chapters.map((chapter, index) => {
        const isLocked = chapter.is_locked;
        const isCompleted = chapter.is_completed;
        const statusClass = isLocked ? 'opacity-50 grayscale pointer-events-none' : 'hover:scale-[1.02] active:scale-[0.98] cursor-pointer hover:shadow-lg hover:shadow-purple-500/10';

        let bgClass = isLocked ? 'bg-slate-800/50 border-white/5' : 'glass border-white/10';
        let iconBg = 'bg-white/5 border-white/10';
        let iconContent = isLocked ? '<i class="fas fa-lock text-slate-500"></i>' : `<span class="font-bold text-white/50">${chapter.id}</span>`;

        if (isCompleted) {
            bgClass = 'bg-green-500/10 border-green-500/30 shadow-[0_0_15px_-3px_rgba(34,197,94,0.1)]';
            iconBg = 'bg-green-500/20 border-green-500/30';
            iconContent = '<i class="fas fa-check text-green-400"></i>';
        } else if (!isLocked) {
            // Active/Available Chapter - Add subtle gradient
            bgClass = 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-white/10 hover:border-purple-500/30 backdrop-blur-xl';
        }

        return `
            <div onclick="openLesson(${chapter.id})" class="relative p-5 rounded-2xl border transition-all duration-300 ${bgClass} ${statusClass} group overflow-hidden">
                ${!isLocked && !isCompleted ? '<div class="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>' : ''}
                
                <div class="flex items-center gap-4 relative z-10">
                    <div class="w-12 h-12 rounded-2xl ${iconBg} flex items-center justify-center border shrink-0 shadow-inner group-hover:scale-110 transition-transform duration-300">
                        ${iconContent}
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex justify-between items-center mb-1">
                            <h3 class="font-bold text-white text-lg truncate pr-2 group-hover:text-purple-300 transition-colors">${chapter.title}</h3>
                            ${!isLocked && !isCompleted ? '<span class="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold uppercase tracking-wider shadow-[0_0_10px_-2px_rgba(168,85,247,0.4)]">Start</span>' : ''}
                        </div>
                        <p class="text-sm text-slate-400 truncate group-hover:text-slate-300 transition-colors">${chapter.summary}</p>
                    </div>
                    ${!isLocked ? '<i class="fas fa-chevron-right text-slate-600 group-hover:text-white transition-colors transform group-hover:translate-x-1"></i>' : ''}
                </div>
            </div>
        `;
    }).join('');
}

window.openLesson = function (chapterId) {
    currentLessonId = chapterId;
    const chapter = currentChapters.find(c => c.id === chapterId);
    if (!chapter) return;
    currentLessonData = chapter;

    document.getElementById('lesson-title').innerText = chapter.title;
    const modal = document.getElementById('lesson-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    // Default to Vocab tab
    switchLessonTab('vocab');
}

window.closeLesson = function () {
    const modal = document.getElementById('lesson-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    currentLessonId = null;
    currentLessonData = null;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

window.switchLessonTab = function (tab) {
    // Update tabs UI
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.dataset.tab === tab) {
            btn.classList.add('bg-white/10', 'text-white', 'shadow-sm');
            btn.classList.remove('text-slate-400');
        } else {
            btn.classList.remove('bg-white/10', 'text-white', 'shadow-sm');
            btn.classList.add('text-slate-400');
        }
    });

    renderLessonContent(currentLessonData, tab);
}

function renderLessonContent(chapter, tab) {
    const container = document.getElementById('lesson-content');
    const content = chapter.content;

    if (tab === 'vocab') {
        const vocabList = content.key_vocab || [];
        if (vocabList.length === 0) {
            container.innerHTML = '<div class="p-8 text-center text-slate-400">No vocabulary in this lesson.</div>';
            return;
        }

        // Stitch Vocab List Design (from stitch_grammar.html)
        container.innerHTML = `
            <div class="max-w-md mx-auto space-y-6 px-6 py-6 pb-40">
                ${vocabList.map(word => {
            let cardClass = 'card-neutral';
            let genderColor = 'neutral';
            let genderLabel = '';
            let btnBg = 'bg-green-500';
            let btnHover = 'hover:bg-green-400';
            let btnShadow = 'shadow-green-500/30';
            let tagBg = 'bg-green-500/20';
            let tagText = 'text-green-200';
            let tagBorder = 'border-green-500/30';

            if (word.gender === 'masculine' || word.gender === 'der') {
                cardClass = 'card-masculine';
                genderColor = 'masculine';
                genderLabel = 'Masculine';
                btnBg = 'bg-blue-500';
                btnHover = 'hover:bg-blue-400';
                btnShadow = 'shadow-blue-500/30';
                tagBg = 'bg-blue-500/20';
                tagText = 'text-blue-200';
                tagBorder = 'border-blue-500/30';
            } else if (word.gender === 'feminine' || word.gender === 'die') {
                cardClass = 'card-feminine';
                genderColor = 'feminine';
                genderLabel = 'Feminine';
                btnBg = 'bg-red-500';
                btnHover = 'hover:bg-red-400';
                btnShadow = 'shadow-red-500/30';
                tagBg = 'bg-red-500/20';
                tagText = 'text-red-200';
                tagBorder = 'border-red-500/30';
            } else if (word.gender === 'neutral' || word.gender === 'das') {
                cardClass = 'card-neutral';
                genderColor = 'neutral';
                genderLabel = 'Neutral';
                btnBg = 'bg-green-500';
                btnHover = 'hover:bg-green-400';
                btnShadow = 'shadow-green-500/30';
                tagBg = 'bg-green-500/20';
                tagText = 'text-green-200';
                tagBorder = 'border-green-500/30';
            }

            const safeGerman = (word.german || '').replace(/'/g, "\\'");
            const example = word.example || '';

            return `
                <div class="glass ${cardClass} rounded-3xl overflow-hidden relative group transition-all duration-300 hover:scale-[1.01]">
                    <div class="p-6 pb-2 relative z-10">
                        ${genderLabel ? `
                        <div class="flex justify-end mb-2">
                            <span class="px-3 py-1 rounded-full text-xs font-medium ${tagBg} ${tagText} border ${tagBorder}">${genderLabel}</span>
                        </div>` : ''}
                        <div class="flex items-center justify-between gap-4 mb-4">
                            <div class="flex-1">
                                <h3 class="text-3xl font-bold text-white mb-1 tracking-tight">${word.german}</h3>
                                <p class="text-slate-400 font-medium">${word.english}</p>
                            </div>
                            <button onclick="playAudio('${safeGerman}')" class="h-14 w-14 flex-shrink-0 rounded-full ${btnBg} text-white flex items-center justify-center ${btnHover} shadow-lg ${btnShadow} transition-all active:scale-95">
                                <i class="fas fa-play text-xl"></i>
                            </button>
                        </div>
                    </div>
                    ${example ? `
                    <div class="mx-2 mb-2 p-4 rounded-2xl glass-inner">
                        <p class="text-slate-300 text-sm leading-relaxed italic">"${example}"</p>
                    </div>` : ''}
                </div>`;
        }).join('')}
            </div>
        `;
    } else if (tab === 'grammar') {
        const rules = content.grammar_rules || [];
        if (rules.length === 0) {
            container.innerHTML = '<div class="p-8 text-center text-slate-400">No grammar rules in this lesson.</div>';
            return;
        }

        // Stitch Grammar Design — glass cards with gender-coded examples
        container.innerHTML = `
            <div class="max-w-md mx-auto space-y-6 px-6 py-6 pb-40">
                ${rules.map((rule, idx) => {
            const examplesHtml = (rule.examples && rule.examples.length > 0) ? `
                    <div class="mx-2 mb-2 space-y-2">
                        <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 pt-2">Examples</p>
                        ${rule.examples.map(ex => {
                let germanText = '';
                let englishText = '';
                if (typeof ex === 'string') {
                    germanText = ex;
                } else {
                    germanText = ex.german || '';
                    englishText = ex.english || '';
                }
                const safeExGerman = germanText.replace(/'/g, "\\'");
                return `
                        <div onclick="playAudio('${safeExGerman}')" class="p-4 rounded-2xl glass-inner cursor-pointer hover:bg-white/5 transition-all">
                            <p class="text-slate-300 text-sm leading-relaxed">
                                <span class="text-white font-medium">${germanText}</span>
                            </p>
                            ${englishText ? `<p class="text-slate-500 text-xs mt-1">${englishText}</p>` : ''}
                        </div>`;
            }).join('')}
                    </div>` : '';

            return `
                <div class="glass card-masculine rounded-3xl overflow-hidden relative group transition-all duration-300 hover:scale-[1.01]">
                    <div class="p-6 pb-2 relative z-10">
                        <div class="flex justify-end mb-2">
                            <span class="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-200 border border-blue-500/30">Rule ${idx + 1}</span>
                        </div>
                        <div class="flex items-center justify-between gap-4 mb-4">
                            <div class="flex-1">
                                <h3 class="text-2xl font-bold text-white mb-1 tracking-tight">${rule.rule_name}</h3>
                            </div>
                        </div>
                    </div>
                    <div class="mx-2 mb-2 p-4 rounded-2xl glass-inner">
                        <p class="text-slate-300 text-sm leading-relaxed">${rule.explanation || rule.logic || 'No explanation available.'}</p>
                    </div>
                    ${examplesHtml}
                </div>`;
        }).join('')}
            </div>
        `;
    } else if (tab === 'dialogue') {
        const content = chapter.content;
        let dialogueLines = [];

        if (content.dialogues && Array.isArray(content.dialogues) && content.dialogues.length > 0) {
            dialogueLines = content.dialogues[0].turns || [];
        } else if (content.dialogue) {
            if (!Array.isArray(content.dialogue) && typeof content.dialogue === 'object') {
                dialogueLines = Object.entries(content.dialogue).map(([key, text]) => {
                    return { speaker: key, german: text };
                });
            } else {
                dialogueLines = content.dialogue;
            }
        }

        if (dialogueLines.length === 0) {
            container.innerHTML = '<div class="p-8 text-center text-slate-400">No dialogue in this lesson.</div>';
            return;
        }

        // Stitch Dialogue Design (from stitch_dialogue.html)
        container.innerHTML = `
            <div class="px-4 py-6 space-y-6 pb-40">
                ${dialogueLines.map((line, i) => {
            const speakerName = line.speaker || 'Unknown';
            const isRight = i % 2 === 1; // Alternate speakers
            const text = line.german || line.text || '';
            const english = line.english || '';
            const safeText = text.replace(/'/g, "\\'");
            const initials = speakerName.charAt(0).toUpperCase();

            if (isRight) {
                return `
                <div class="flex flex-col items-end max-w-[85%] ml-auto space-y-1">
                    <div class="flex items-end space-x-2 flex-row-reverse">
                        <div class="w-8 h-8 rounded-full flex-shrink-0 border-2 border-primary/30 ml-2 bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">${initials}</div>
                        <div class="relative px-4 py-3 rounded-2xl rounded-br-none glass bg-chat-right border border-primary/20 text-slate-100 shadow-xl cursor-pointer active:scale-95 transition-transform" onclick="playAudio('${safeText}')">
                            <p class="text-[15px] leading-relaxed font-medium">${text}</p>
                            ${english ? `<p class="text-xs text-primary/70 mt-1 italic">${english}</p>` : ''}
                            <button class="absolute -left-10 bottom-0 text-primary p-2" onclick="event.stopPropagation(); playAudio('${safeText}')">
                                <i class="fas fa-volume-up text-sm"></i>
                            </button>
                        </div>
                    </div>
                    <span class="text-[10px] text-slate-500 mr-10">${speakerName}</span>
                </div>`;
            } else {
                return `
                <div class="flex flex-col items-start max-w-[85%] space-y-1">
                    <div class="flex items-end space-x-2">
                        <div class="w-8 h-8 rounded-full flex-shrink-0 border-2 border-white/10 bg-white/5 flex items-center justify-center text-white/60 text-xs font-bold">${initials}</div>
                        <div class="relative px-4 py-3 rounded-2xl rounded-bl-none glass bg-chat-left border border-white/5 text-slate-100 shadow-xl cursor-pointer active:scale-95 transition-transform" onclick="playAudio('${safeText}')">
                            <p class="text-[15px] leading-relaxed font-medium">${text}</p>
                            ${english ? `<p class="text-xs text-slate-400 mt-1 italic">${english}</p>` : ''}
                            <button class="absolute -right-10 bottom-0 text-primary p-2" onclick="event.stopPropagation(); playAudio('${safeText}')">
                                <i class="fas fa-volume-up text-sm"></i>
                            </button>
                        </div>
                    </div>
                    <span class="text-[10px] text-slate-500 ml-10">${speakerName}</span>
                </div>`;
            }
        }).join('')}
            </div>
        `;
    }
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
