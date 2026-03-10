/**
 * Reading Comprehension Module
 */

let currentReading = null;
let cachedReadingAnalogy = null;

export async function loadReadingText() {
    const container = document.getElementById('reading-container');
    if (!container) return;

    container.innerHTML = `
        <div class="w-full max-w-2xl mx-auto space-y-6">
            <div class="flex justify-between items-center">
                <h2 class="text-2xl font-bold text-white">
                    <i class="fas fa-book-reader text-orange-500 mr-2"></i>
                    Reading Comprehension
                </h2>
                <button onclick="generateReadingTexts()" 
                        class="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition">
                    <i class="fas fa-plus mr-2"></i>Generate Texts
                </button>
            </div>
            
            <div id="reading-content" class="space-y-4">
                <div class="flex items-center justify-center h-64">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                </div>
            </div>
        </div>
    `;

    await fetchReadingText();
}

async function fetchReadingText() {
    try {
        const response = await fetch('/api/reading/text');
        const data = await response.json();

        if (data.action === 'generate') {
            showNoReadingMessage();
            return;
        }

        currentReading = data;
        displayReadingText(data);
    } catch (error) {
        console.error('Error fetching reading text:', error);
        showNoReadingMessage();
    }
}

function showNoReadingMessage() {
    const content = document.getElementById('reading-content');
    if (!content) return;

    content.innerHTML = `
        <div class="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-8 text-center mt-12">
            <div class="w-16 h-16 rounded-full bg-slate-700/50 flex items-center justify-center mx-auto mb-4 border border-slate-600/50">
                <i class="fas fa-book-open text-orange-400 text-2xl"></i>
            </div>
            <h3 class="text-xl font-bold text-white mb-2">No Texts Available</h3>
            <p class="text-slate-400 mb-6 max-w-sm mx-auto">You've completed all available reading comprehension exercises. Generate more to continue practicing!</p>
            <button onclick="generateReadingTexts()" 
                    class="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-orange-500/20 active:translate-y-0.5">
                <i class="fas fa-plus mr-2"></i>Generate New Exercises
            </button>
        </div>
    `;
}

window.selectedReadingOption = null;

function displayReadingText(reading) {
    const content = document.getElementById('reading-content');

    content.innerHTML = `
        <div class="space-y-4">
            <h2 class="text-[11px] font-bold uppercase tracking-widest text-[#F59E0B]">LESEVERSTÄNDNIS</h2>
            <div class="bg-transparent border-l-4 border-l-[#F59E0B] pl-5 py-1">
                <p class="font-serif text-[1.1rem] leading-relaxed text-slate-100 font-medium">
                    ${reading.text}
                </p>
            </div>
        </div>
        
        <div class="space-y-5 pt-8">
            <h3 class="text-xl font-bold leading-tight text-white mb-2">
                ${reading.question}
            </h3>
            <div class="space-y-3" id="reading-options-container">
                ${reading.options.map((option, index) => `
                    <button id="reading-opt-${index}" onclick="selectReadingOption(${index})"
                            class="w-full p-4 text-left rounded-xl border border-slate-700/50 hover:border-[#6366f1]/50 transition-all bg-[#0f172a] shadow-sm group">
                        <div class="flex items-center gap-4">
                            <span class="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 font-bold text-sm group-hover:bg-[#6366f1]/20 transition-colors text-slate-300 group-hover:text-white">${String.fromCharCode(65 + index)}</span>
                            <span class="font-medium text-slate-200">${option}</span>
                        </div>
                    </button>
                `).join('')}
            </div>
        </div>
        
        <div id="reading-feedback" class="mt-8 transition-all duration-500 translate-y-[50%] opacity-0 pointer-events-none"></div>
        
        <div class="pt-8 pb-4" id="reading-footer">
            <button id="reading-check-btn" onclick="submitReadingAnswer()" class="w-full py-4 bg-[#78350f] text-slate-400 font-bold text-lg rounded-full transition-all opacity-80 cursor-not-allowed" disabled>
                Check Answer
            </button>
        </div>
    `;
    window.selectedReadingOption = null;

    // Preload analogy in background
    cachedReadingAnalogy = null;
    fetch('/api/practice/ask-notebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: reading.question, wrong_answer: 'N/A', rule_name: 'Context Clues' })
    }).then(r => r.json()).then(d => {
        cachedReadingAnalogy = d.feedback_data || null;
        console.log('\u2705 Reading analogy preloaded');
        // Dynamically inject if Rule Reveal already showing
        const slot = document.getElementById('rule-analogy-slot');
        if (slot && !slot.classList.contains('hidden') && cachedReadingAnalogy && slot.innerHTML.includes('Loading')) {
            window.showRuleRevealSheet({
                title: document.getElementById('rule-title').textContent,
                logic: document.getElementById('rule-logic-text').innerHTML,
                correct: document.getElementById('rule-badge').textContent === 'Correct!',
                feedbackData: cachedReadingAnalogy
            });
        } else if (slot && !cachedReadingAnalogy) {
            slot.innerHTML = '';
            slot.className = 'hidden';
        }
    }).catch(() => {
        const slot = document.getElementById('rule-analogy-slot');
        if (slot) {
            slot.innerHTML = '';
            slot.className = 'hidden';
        }
    });
}

window.selectReadingOption = function (index) {
    window.selectedReadingOption = index;

    // Reset all
    currentReading.options.forEach((_, i) => {
        const btn = document.getElementById(`reading-opt-${i}`);
        btn.className = "w-full p-4 text-left rounded-xl border border-slate-700/50 hover:border-[#6366f1]/50 transition-all bg-[#0f172a] shadow-sm group";
        btn.querySelector('span').className = "w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 font-bold text-sm group-hover:bg-[#6366f1]/20 transition-colors text-slate-300 group-hover:text-white";
    });

    // Highlight selected
    const selectedBtn = document.getElementById(`reading-opt-${index}`);
    selectedBtn.className = "w-full p-4 text-left rounded-xl border-2 border-[#6366f1] bg-[#6366f1]/5 transition-all group shadow-md";
    selectedBtn.querySelector('span').className = "w-8 h-8 flex items-center justify-center rounded-full bg-[#6366f1] text-white font-bold text-sm shadow-[0_0_10px_rgba(99,102,241,0.5)]";

    // Enable check button
    const checkBtn = document.getElementById('reading-check-btn');
    checkBtn.disabled = false;
    checkBtn.className = "w-full py-4 bg-[#22C55E] text-white font-bold text-lg rounded-full shadow-lg shadow-green-500/20 active:translate-y-0.5 transition-all";
};

window.submitReadingAnswer = function () {
    if (window.selectedReadingOption !== null) {
        checkReadingAnswer(window.selectedReadingOption);
    }
}

window.checkReadingAnswer = async function (selectedIndex) {
    if (!currentReading) return;

    try {
        const response = await fetch(
            `/api/reading/answer?reading_id=${currentReading.id}&selected=${selectedIndex}`,
            { method: 'POST' }
        );

        const result = await response.json();

        const checkBtn = document.getElementById('reading-check-btn');
        if (checkBtn) checkBtn.style.display = 'none';

        let loadingHtml = '<div class="flex items-center gap-2 text-xs text-slate-400/50 italic"><div class="animate-spin rounded-full h-3 w-3 border-b border-slate-400/50"></div> Loading syllabus context...</div>';

        let ruleName = "Context Clues";
        let feedbackLogic = result.feedback;
        if (!result.correct) {
            feedbackLogic += `<br><br>The correct answer was: <strong class="text-white">${result.correct_answer}</strong>`;
        }

        window.showRuleRevealSheet({
            title: result.correct ? 'Correct!' : ruleName,
            logic: feedbackLogic,
            correct: result.correct,
            feedbackData: cachedReadingAnalogy,
            analogyHtml: cachedReadingAnalogy ? null : loadingHtml,
            vocab: null,
            structure: null,
            onContinue: () => {
                setTimeout(fetchReadingText, 300);
            }
        });

        if (result.correct) {
            window.profileManager?.awardXP(10, 'Reading +10');
            if (window.loadUserStats) window.loadUserStats();
        }
    } catch (error) {
        console.error('Error checking answer:', error);
    }
};

window.generateReadingTexts = async function () {
    const content = document.getElementById('reading-content');
    content.innerHTML = `
            < div class="bg-slate-800 border border-slate-700 rounded-xl p-6 text-center" >
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p class="text-slate-300">Generating reading texts...</p>
            <p class="text-slate-400 text-sm mt-2">This may take a moment</p>
        </div >
            `;

    try {
        const response = await fetch('/api/reading/generate?count=10', {
            method: 'POST'
        });
        const result = await response.json();

        if (result.success) {
            await fetchReadingText();
        }
    } catch (error) {
        console.error('Error generating texts:', error);
        content.innerHTML = `
            < div class="bg-red-900/30 border border-red-600 rounded-xl p-6 text-center" >
                <i class="fas fa-exclamation-triangle text-red-500 text-4xl mb-3"></i>
                <p class="text-white mb-2">Failed to generate texts</p>
                <p class="text-slate-400 text-sm">${error.message}</p>
            </div >
            `;
    }
};

// Make loadReadingText globally accessible
window.loadReadingText = loadReadingText;
