/**
 * Speaking Practice Module
 * Matches stitch/practice_speaking.html design
 */

let currentPhrase = null;
let recognition = null;
let isRecording = false;
let cachedSpeakingAnalogy = null;

// Check for speech recognition support
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'de-DE';
    recognition.continuous = false;
    recognition.interimResults = false;
}

export async function loadSpeakingPhrase() {
    const container = document.getElementById('speaking-container');
    if (!container) return;

    container.innerHTML = `
        <div class="w-full max-w-2xl mx-auto space-y-6">
            <div class="flex justify-between items-center">
                <h2 class="text-2xl font-bold text-white">
                    <i class="fas fa-microphone text-red-500 mr-2"></i>
                    Speaking Practice
                </h2>
                <button onclick="generateSpeakingPhrases()" 
                        class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition">
                    <i class="fas fa-plus mr-2"></i>Generate Phrases
                </button>
            </div>
            
            <div id="speaking-content" class="space-y-4">
                <div class="flex items-center justify-center h-64">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
                </div>
            </div>
        </div>
    `;

    await fetchSpeakingPhrase();
}

async function fetchSpeakingPhrase() {
    try {
        const response = await fetch('/api/speaking/phrase');
        const data = await response.json();

        if (data.action === 'generate') {
            showNoPhrasesMessage();
            return;
        }

        currentPhrase = data;
        displaySpeakingPhrase(data);
    } catch (error) {
        console.error('Error fetching phrase:', error);
        showNoPhrasesMessage();
    }
}

function displaySpeakingPhrase(phrase) {
    const content = document.getElementById('speaking-content');

    // Matches stitch/practice_speaking.html layout
    content.innerHTML = `
        <div class="flex-1 flex flex-col items-center justify-center text-center py-8 relative z-10">
            <span class="text-slate-400 uppercase tracking-widest text-xs font-bold mb-4">Speak this sentence</span>
            
            <h1 class="font-display text-3xl md:text-4xl font-bold leading-tight mb-4 text-white">
                „${phrase.target_phrase}"
            </h1>
            
            <p class="text-slate-400 text-lg mb-12">"${phrase.english || phrase.target_phrase}"</p>
            
            <div class="relative flex flex-col items-center">
                <!-- Audio wave bars (hidden by default, shown when recording) -->
                <div id="audio-wave" class="audio-wave mb-8 hidden">
                    <div class="wave-bar"></div>
                    <div class="wave-bar"></div>
                    <div class="wave-bar"></div>
                    <div class="wave-bar"></div>
                    <div class="wave-bar"></div>
                    <div class="wave-bar"></div>
                    <div class="wave-bar"></div>
                    <div class="wave-bar"></div>
                    <div class="wave-bar"></div>
                    <div class="wave-bar"></div>
                    <div class="wave-bar"></div>
                </div>
                
                <button id="record-btn" onclick="toggleRecording()" 
                        class="w-24 h-24 bg-slate-800 border-2 border-slate-700 rounded-full flex items-center justify-center hover:border-accent transition-all duration-300 active:scale-95 shadow-xl">
                    <span class="material-symbols-outlined text-white" id="record-icon" style="font-size: 40px;">mic</span>
                </button>
                
                <span id="record-status" class="mt-6 text-slate-400 font-semibold text-sm uppercase tracking-widest">Tap to Speak</span>
            </div>
        </div>
        
        <div id="transcription-box" class="hidden w-full bg-slate-900 rounded-xl p-5 border border-slate-700 shadow-inner mt-4">
            <p class="text-xs text-slate-500 uppercase tracking-widest font-bold mb-2">You said:</p>
            <p id="transcription-text" class="text-lg text-white font-serif"></p>
        </div>
        
        <!-- Feedback panel (hidden by default, animated in on result) -->
        <div id="speaking-feedback" class="mt-8 transition-all duration-500 translate-y-[50%] opacity-0 pointer-events-none"></div>
        <div id="speaking-footer" class="pb-10 z-10"></div>
    `;

    // Preload analogy in background
    cachedSpeakingAnalogy = null;
    const topic = phrase.topic || 'Speaking Practice';
    fetch('/api/practice/ask-notebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: phrase.target_phrase, wrong_answer: 'N/A', rule_name: 'Pronunciation & Syntax for: ' + topic })
    }).then(r => r.json()).then(d => {
        cachedSpeakingAnalogy = window.cleanNotebookLMResponse(d.analogy) || null;
        console.log('\u2705 Speaking analogy preloaded');
        // Dynamically inject if Rule Reveal already showing
        const slot = document.getElementById('rule-analogy-slot');
        if (slot && !slot.classList.contains('hidden') && cachedSpeakingAnalogy) {
            slot.innerHTML = '<span class="material-symbols-outlined text-amber-400 align-middle text-sm mr-1">lightbulb</span> ' + cachedSpeakingAnalogy;
            slot.className = 'mt-4 p-3 bg-slate-800/60 rounded-xl border border-blue-500/20 text-slate-300 text-sm transition-all duration-500';
        } else if (slot && !cachedSpeakingAnalogy) {
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

function showNoPhrasesMessage() {
    const content = document.getElementById('speaking-content');
    content.innerHTML = `
        <div class="bg-slate-800 border border-yellow-600 rounded-xl p-6 text-center">
            <i class="fas fa-info-circle text-yellow-500 text-4xl mb-3"></i>
            <p class="text-slate-300 mb-4">No speaking phrases available in cache.</p>
            <p class="text-slate-400 text-sm">Click "Generate Phrases" to create new speaking exercises.</p>
        </div>
    `;
}

window.toggleTargetPhrase = function () {
    const target = document.getElementById('target-phrase');
    if (target) target.classList.toggle('hidden');
};

window.toggleRecording = function () {
    if (!recognition) {
        // No microphone support — show manual input fallback
        showManualInput();
        return;
    }

    const btn = document.getElementById('record-btn');
    const icon = document.getElementById('record-icon');
    const status = document.getElementById('record-status');
    const wave = document.getElementById('audio-wave');

    if (isRecording) {
        // Stop recording
        isRecording = false;
        recognition.stop();
        icon.textContent = 'mic';
        btn.className = "w-24 h-24 bg-slate-800 border-2 border-slate-700 rounded-full flex items-center justify-center hover:border-accent transition-all duration-300 active:scale-95 shadow-xl";
        status.textContent = 'Tap to Speak';
        status.className = "mt-6 text-slate-400 font-semibold text-sm uppercase tracking-widest";
        if (wave) wave.classList.add('hidden');
    } else {
        // Start recording
        isRecording = true;
        btn.className = "w-24 h-24 bg-accent rounded-full flex items-center justify-center pulse-red shadow-lg shadow-red-500/20 active:scale-95 transition-transform";
        icon.textContent = 'mic';
        status.textContent = 'RECORDING...';
        status.className = "mt-6 text-accent font-semibold text-sm animate-pulse";
        if (wave) wave.classList.remove('hidden');

        recognition.start();

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            status.textContent = 'Analyzing...';
            showTranscription(transcript);
            validateSpeaking(transcript);
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            isRecording = false;
            icon.textContent = 'mic';
            btn.className = "w-24 h-24 bg-slate-800 border-2 border-slate-700 rounded-full flex items-center justify-center hover:border-accent transition-all duration-300 active:scale-95 shadow-xl";

            if (event.error === 'not-allowed' || event.error === 'network') {
                status.innerHTML = 'Mic Blocked or Network Error.<br><span class="text-xs text-slate-500 mt-2 block">Use manual input below</span>';
                showManualInput();
            } else {
                status.textContent = 'Error. Try Again';
            }

            status.className = "mt-6 text-red-400 font-semibold text-sm uppercase tracking-widest text-center";
            if (wave) wave.classList.add('hidden');
        };

        recognition.onend = () => {
            isRecording = false;
            icon.textContent = 'mic';
            btn.className = "w-24 h-24 bg-slate-800 border-2 border-slate-700 rounded-full flex items-center justify-center hover:border-accent transition-all duration-300 active:scale-95 shadow-xl";
            if (wave) wave.classList.add('hidden');
        };
    }
};

function showManualInput() {
    const content = document.getElementById('speaking-content');
    const existingInput = document.getElementById('manual-input');
    if (existingInput) return; // Already shown

    const inputDiv = document.createElement('div');
    inputDiv.className = "border-t border-slate-700 pt-6 mt-4";
    inputDiv.innerHTML = `
        <p class="text-slate-400 text-sm mb-3">Microphone not available. Type your answer:</p>
        <input id="manual-input" type="text" 
               class="w-full px-5 py-4 bg-slate-900 border-2 border-slate-700 rounded-xl 
                      text-white focus:border-accent focus:outline-none transition-all font-serif text-lg"
               placeholder="Type in German...">
        <button id="speaking-check-btn" onclick="submitManualInput()" 
                class="mt-4 w-full px-4 py-4 bg-accent hover:bg-red-500 text-white rounded-xl transition-all font-bold text-lg shadow-[0_0_20px_rgba(239,68,68,0.3)] active:scale-95">
            Verify <span class="material-symbols-outlined align-middle text-sm ml-1">arrow_forward</span>
        </button>
    `;
    content.appendChild(inputDiv);
}

function showTranscription(text) {
    const box = document.getElementById('transcription-box');
    const textEl = document.getElementById('transcription-text');
    if (textEl) textEl.textContent = text;
    if (box) box.classList.remove('hidden');
}

window.submitManualInput = function () {
    const input = document.getElementById('manual-input');
    const text = input.value.trim();
    if (text) {
        validateSpeaking(text);
    }
};

async function validateSpeaking(spokenText) {
    if (!currentPhrase) return;

    try {
        const response = await fetch(
            `/api/speaking/validate?phrase_id=${currentPhrase.id}&spoken_text=${encodeURIComponent(spokenText)}`,
            { method: 'POST' }
        );

        const result = await response.json();
        displaySpeakingFeedback(result);

        if (result.passed) {
            window.profileManager?.awardXP(15, 'Speaking +15');
            setTimeout(() => fetchSpeakingPhrase(), 2500);
        }
    } catch (error) {
        console.error('Error validating speech:', error);
    }
}

function displaySpeakingFeedback(result) {
    const percentage = Math.round(result.similarity || 0);
    const passed = result.passed;
    let ruleName = "Pronunciation & Syntax";
    let logicText = result.message || '';

    // Build analogy slot — dynamic fill from preload
    let analogyHtml = '';
    if (cachedSpeakingAnalogy) {
        analogyHtml = '<span class="material-symbols-outlined text-amber-400 align-middle text-sm mr-1">lightbulb</span> ' + cachedSpeakingAnalogy;
    } else {
        analogyHtml = '<div class="flex items-center gap-2 text-xs text-slate-400/50 italic"><div class="animate-spin rounded-full h-3 w-3 border-b border-slate-400/50"></div> Loading syllabus context...</div>';
    }

    logicText = `
        ${logicText}
        <div class="space-y-2 mt-4 mb-2 bg-slate-900/50 p-4 rounded-xl border border-white/5">
            <div class="flex justify-between items-center text-sm">
                <span class="text-slate-400">Target:</span>
                <span class="text-white font-medium">${result.target || ''}</span>
            </div>
            <div class="flex justify-between items-center text-sm">
                <span class="text-slate-400">You said:</span>
                <span class="text-white font-medium italic">"${result.spoken || ''}"</span>
            </div>
        </div>
        <div class="mt-3 flex items-center gap-3 text-2xl font-bold ${percentage >= 80 ? 'text-green-400' : percentage >= 60 ? 'text-yellow-400' : 'text-amber-400'}">
            Accuracy: ${percentage}%
        </div>
    `;

    window.showRuleRevealSheet({
        title: passed ? 'Ausgezeichnet!' : ruleName,
        logic: logicText,
        correct: passed,
        analogyHtml: analogyHtml,
        vocab: null,
        structure: null,
        onContinue: () => {
            setTimeout(fetchSpeakingPhrase, 300);
        }
    });
}

window.generateSpeakingPhrases = async function () {
    const content = document.getElementById('speaking-content');
    content.innerHTML = `
        <div class="bg-slate-800 border border-slate-700 rounded-xl p-6 text-center">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
            <p class="text-slate-300">Generating speaking phrases...</p>
            <p class="text-slate-400 text-sm mt-2">This may take a moment</p>
        </div>
    `;

    try {
        const response = await fetch('/api/speaking/generate?count=30', {
            method: 'POST'
        });
        const result = await response.json();

        if (result.success) {
            await fetchSpeakingPhrase();
        }
    } catch (error) {
        console.error('Error generating phrases:', error);
        content.innerHTML = `
        <div class="bg-red-900/30 border border-red-600 rounded-xl p-6 text-center">
                <i class="fas fa-exclamation-triangle text-red-500 text-4xl mb-3"></i>
                <p class="text-white mb-2">Failed to generate phrases</p>
                <p class="text-slate-400 text-sm">${error.message}</p>
            </div>
        `;
    }
};

// Make loadSpeakingPhrase globally accessible
window.loadSpeakingPhrase = loadSpeakingPhrase;
