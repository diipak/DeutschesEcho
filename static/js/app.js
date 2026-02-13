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

    let borderClass = 'border-yellow-500';
    let glowClass = 'shadow-yellow-500/20';
    let textClass = 'text-yellow-500';

    if (word.gender === 'masculine') {
        borderClass = 'border-blue-500';
        glowClass = 'shadow-blue-500/20';
        textClass = 'text-blue-400';
    }
    if (word.gender === 'feminine') {
        borderClass = 'border-red-500';
        glowClass = 'shadow-red-500/20';
        textClass = 'text-red-400';
    }
    if (word.gender === 'neutral') {
        borderClass = 'border-green-500';
        glowClass = 'shadow-green-500/20';
        textClass = 'text-green-400';
    }

    container.innerHTML = `
        <div id="active-card" class="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl border-2 ${borderClass} flex flex-col items-center justify-center p-6 shadow-2xl ${glowClass} relative overflow-hidden card-transition group">
            
            <!-- Abstract Background Shape -->
            <div class="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
            <div class="absolute -bottom-10 -left-10 w-40 h-40 bg-black/20 rounded-full blur-3xl pointer-events-none"></div>

            <div class="absolute top-6 right-6 text-xs font-bold uppercase tracking-widest opacity-70 ${textClass}">${word.gender || 'General'}</div>
            
            <div class="flex-1 flex flex-col items-center justify-center w-full z-10">
                <h2 class="text-4xl font-bold text-white mb-2 text-center font-display tracking-tight drop-shadow-md">${word.german}</h2>
                <p class="text-slate-400 text-lg mb-8 text-center font-medium">${word.english}</p>
                
                <div class="w-full bg-slate-950/30 backdrop-blur-sm p-4 rounded-xl border border-white/5">
                    <p class="text-sm text-slate-300 italic text-center leading-relaxed">"${word.example}"</p>
                </div>
            </div>

            <!-- Hint text -->
            <div class="absolute bottom-4 opacity-20 text-[10px] uppercase tracking-widest text-white">Tap for Audio</div>
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
        const statusClass = isLocked ? 'opacity-50 grayscale pointer-events-none' : 'hover:scale-[1.02] active:scale-[0.98] cursor-pointer';
        const bgClass = isCompleted ? 'bg-green-500/10 border-green-500/30' : (isLocked ? 'bg-slate-800/50 border-white/5' : 'glass border-white/10');
        const icon = isCompleted ? '<i class="fas fa-check text-green-400"></i>' : (isLocked ? '<i class="fas fa-lock text-slate-500"></i>' : `<span class="font-bold text-white/50">${chapter.id}</span>`);

        return `
            <div onclick="openLesson(${chapter.id})" class="relative p-5 rounded-2xl border transition-all duration-300 ${bgClass} ${statusClass}">
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 shrink-0">
                        ${icon}
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex justify-between items-center mb-1">
                            <h3 class="font-bold text-white text-lg truncate pr-2">${chapter.title}</h3>
                            ${!isLocked && !isCompleted ? '<span class="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold uppercase tracking-wider">Start</span>' : ''}
                        </div>
                        <p class="text-sm text-slate-400 truncate">${chapter.summary}</p>
                    </div>
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
        container.innerHTML = `
            <div class="p-6 space-y-4 pb-32">
                ${content.key_vocab.map(word => `
                    <div class="glass p-4 rounded-xl border border-white/10 flex items-center justify-between">
                        <div>
                            <p class="text-lg font-bold text-white mb-1">${word.german}</p>
                            <p class="text-sm text-slate-400">${word.english}</p>
                        </div>
                        <button onclick="playAudio('${word.german.replace(/'/g, "\\'")}')" class="w-10 h-10 rounded-full bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 flex items-center justify-center transition">
                            <i class="fas fa-volume-up"></i>
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
    } else if (tab === 'grammar') {
        container.innerHTML = `
            <div class="p-6 space-y-6 pb-32">
                ${content.grammar_rules.map(rule => `
                    <div class="bg-indigo-900/10 border border-indigo-500/20 p-5 rounded-2xl">
                        <h4 class="text-indigo-300 font-bold mb-2 flex items-center gap-2">
                            <i class="fas fa-lightbulb"></i> ${rule.rule_name}
                        </h4>
                        <p class="text-slate-300 leading-relaxed">${rule.logic}</p>
                    </div>
                `).join('')}
            </div>
        `;
    } else if (tab === 'dialogue') {
        const d = content.dialogue;
        // Convert simple object to array for rendering if possible, else just pairs
        const entries = Object.entries(d);

        container.innerHTML = `
            <div class="p-6 space-y-6 pb-32">
                ${entries.map(([key, text], i) => {
            const isA = i % 2 === 0; // Alternating roughly
            // Better heuristic: key contains 'A' or '1'
            const actuallyA = key.toLowerCase().includes('speaker a') || key.toLowerCase().includes('speakera') || i % 2 === 0;

            return `
                    <div class="flex flex-col ${actuallyA ? 'items-start' : 'items-end'}">
                        <div class="max-w-[85%] ${actuallyA ? 'bg-slate-800 rounded-tr-2xl rounded-br-2xl rounded-bl-2xl' : 'bg-purple-600 rounded-tl-2xl rounded-bl-2xl rounded-br-2xl'} p-4 text-white shadow-lg relative group cursor-pointer" onclick="playAudio('${text.replace(/'/g, "\\'")}')">
                           <p class="leading-relaxed">${text}</p>
                           <span class="absolute ${actuallyA ? '-right-8' : '-left-8'} bottom-0 opacity-0 group-hover:opacity-100 transition text-slate-500"><i class="fas fa-volume-up"></i></span>
                        </div>
                        <span class="text-[10px] text-slate-500 mt-1 mx-1">${actuallyA ? 'Speaker A' : 'Speaker B'}</span>
                    </div>
                    `;
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
