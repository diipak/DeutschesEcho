/**
 * Speaking Practice Module
 */

let currentPhrase = null;
let recognition = null;

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
    const hasMicrophone = !!recognition;

    content.innerHTML = `
        <div class="bg-slate-800 border border-slate-700 rounded-xl p-8 space-y-6">
            <!-- English prompt -->
            <div class="text-center">
                <p class="text-slate-400 text-sm uppercase tracking-wide mb-2">Say in German:</p>
                <p class="text-2xl font-bold text-white">${phrase.english}</p>
                ${phrase.context ? `<p class="text-slate-400 text-sm mt-2 italic">${phrase.context}</p>` : ''}
            </div>

            <!-- Target German phrase (initially hidden) -->
            <div class="text-center border-t border-slate-700 pt-4">
                <button onclick="toggleTargetPhrase()" 
                        class="text-slate-400 hover:text-white text-sm transition">
                    <i class="fas fa-eye mr-2"></i>Show target phrase
                </button>
                <p id="target-phrase" class="hidden text-xl text-green-400 font-semibold mt-3">
                    ${phrase.german}
                </p>
            </div>

            ${hasMicrophone ? `
                <!-- Microphone controls -->
                <div class="flex flex-col items-center space-y-4 border-t border-slate-700 pt-6">
                    <button id="record-btn" onclick="startRecording()" 
                            class="w-20 h-20 rounded-full bg-red-600 hover:bg-red-700 
                                   transition flex items-center justify-center text-white text-2xl
                                   hover:scale-110 transform">
                        <i class="fas fa-microphone"></i>
                    </button>
                    <p class="text-slate-400 text-sm">Click to speak</p>
                    
                    <div id="transcription-box" class="hidden w-full bg-slate-900 rounded-lg p-4 border border-slate-600">
                        <p class="text-xs text-slate-400 mb-1">You said:</p>
                        <p id="transcription-text" class="text-lg text-white"></p>
                    </div>
                </div>
            ` : `
                <!-- No microphone - manual input -->
                <div class="border-t border-slate-700 pt-4">
                    <p class="text-slate-400 text-sm mb-3">Microphone not available. Type your answer:</p>
                    <input id="manual-input" type="text" 
                           class="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg 
                                  text-white focus:border-red-500 focus:outline-none"
                           placeholder="Type in German...">
                    <button onclick="submitManualInput()" 
                            class="mt-3 w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition">
                        Check Answer
                    </button>
                </div>
            `}
        </div>
        
        <div id="speaking-feedback" class="hidden"></div>
    `;
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
    target.classList.toggle('hidden');
};

window.startRecording = function () {
    if (!recognition) return;

    const btn = document.getElementById('record-btn');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    btn.classList.add('animate-pulse');

    recognition.start();

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        showTranscription(transcript);
        validateSpeaking(transcript);
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        btn.innerHTML = '<i class="fas fa-microphone"></i>';
        btn.classList.remove('animate-pulse');
    };

    recognition.onend = () => {
        btn.innerHTML = '<i class="fas fa-microphone"></i>';
        btn.classList.remove('animate-pulse');
    };
};

function showTranscription(text) {
    const box = document.getElementById('transcription-box');
    const textEl = document.getElementById('transcription-text');
    textEl.textContent = text;
    box.classList.remove('hidden');
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
            // Award XP
            window.profileManager?.awardXP(15, 'Speaking +15');
            setTimeout(() => fetchSpeakingPhrase(), 2500);
        }
    } catch (error) {
        console.error('Error validating speech:', error);
    }
}

function displaySpeakingFeedback(result) {
    const feedback = document.getElementById('speaking-feedback');
    const percentage = Math.round(result.similarity);

    feedback.className = `p-6 rounded-lg ${result.passed ? 'bg-green-900/30 border border-green-600' : 'bg-orange-900/30 border border-orange-600'}`;
    feedback.innerHTML = `
        <div class="space-y-3">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3">
                    <i class="fas ${result.passed ? 'fa-check-circle text-green-500' : 'fa-exclamation-triangle text-orange-500'} text-2xl"></i>
                    <div>
                        <p class="text-white font-semibold">${result.message}</p>
                        <p class="text-slate-300 text-sm">Accuracy: ${percentage}%</p>
                    </div>
                </div>
                <div class="text-3xl font-bold ${percentage >= 80 ? 'text-green-400' : percentage >= 60 ? 'text-yellow-400' : 'text-orange-400'}">
                    ${percentage}%
                </div>
            </div>
            
            <div class="border-t border-slate-600 pt-3">
                <p class="text-xs text-slate-400 mb-1">Target:</p>
                <p class="text-white">${result.target}</p>
                <p class="text-xs text-slate-400 mb-1 mt-2">You said:</p>
                <p class="text-slate-300">${result.spoken}</p>
            </div>
        </div>
    `;
    feedback.classList.remove('hidden');
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
