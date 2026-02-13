/**
 * Reading Comprehension Module
 */

let currentReading = null;

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

function displayReadingText(reading) {
    const content = document.getElementById('reading-content');

    content.innerHTML = `
        <div class="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-4">
            <h3 class="text-xl font-bold text-white mb-4">${reading.title}</h3>
            <div class="text-slate-300 leading-relaxed text-lg mb-6">
                ${reading.text}
            </div>
            
            <div class="border-t border-slate-700 pt-4">
                <p class="text-white font-semibold mb-3">${reading.question}</p>
                <div class="space-y-2">
                    ${reading.options.map((option, index) => `
                        <button onclick="checkReadingAnswer(${index})"
                                class="w-full text-left px-4 py-3 bg-slate-700 hover:bg-slate-600 
                                       text-slate-200 rounded-lg transition border border-slate-600
                                       hover:border-orange-500">
                            ${String.fromCharCode(65 + index)}. ${option}
                        </button>
                    `).join('')}
                </div>
            </div>
        </div>
        
        <div id="reading-feedback" class="hidden"></div>
    `;
}

function showNoReadingMessage() {
    const content = document.getElementById('reading-content');
    content.innerHTML = `
        <div class="bg-slate-800 border border-yellow-600 rounded-xl p-6 text-center">
            <i class="fas fa-info-circle text-yellow-500 text-4xl mb-3"></i>
            <p class="text-slate-300 mb-4">No reading texts available in cache.</p>
            <p class="text-slate-400 text-sm">Click "Generate Texts" to create new reading comprehension exercises.</p>
        </div>
    `;
}

window.checkReadingAnswer = async function (selectedIndex) {
    if (!currentReading) return;

    try {
        const response = await fetch(
            `/api/reading/answer?reading_id=${currentReading.id}&selected=${selectedIndex}`,
            { method: 'POST' }
        );

        const result = await response.json();
        displayReadingFeedback(result);

        if (result.correct) {
            // Award XP
            window.profileManager?.awardXP(10, 'Reading +10');
            setTimeout(() => fetchReadingText(), 2000);
        }
    } catch (error) {
        console.error('Error checking answer:', error);
    }
};

function displayReadingFeedback(result) {
    const feedback = document.getElementById('reading-feedback');
    feedback.className = `p-4 rounded-lg ${result.correct ? 'bg-green-900/30 border border-green-600' : 'bg-red-900/30 border border-red-600'}`;
    feedback.innerHTML = `
        <div class="flex items-center space-x-3">
            <i class="fas ${result.correct ? 'fa-check-circle text-green-500' : 'fa-times-circle text-red-500'} text-2xl"></i>
            <div>
                <p class="text-white font-semibold">${result.feedback}</p>
                ${!result.correct ? `<p class="text-slate-300 text-sm mt-1">Correct answer: ${result.correct_answer}</p>` : ''}
            </div>
        </div>
    `;
    feedback.classList.remove('hidden');
}

window.generateReadingTexts = async function () {
    const content = document.getElementById('reading-content');
    content.innerHTML = `
        <div class="bg-slate-800 border border-slate-700 rounded-xl p-6 text-center">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p class="text-slate-300">Generating reading texts...</p>
            <p class="text-slate-400 text-sm mt-2">This may take a moment</p>
        </div>
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
            <div class="bg-red-900/30 border border-red-600 rounded-xl p-6 text-center">
                <i class="fas fa-exclamation-triangle text-red-500 text-4xl mb-3"></i>
                <p class="text-white mb-2">Failed to generate texts</p>
                <p class="text-slate-400 text-sm">${error.message}</p>
            </div>
        `;
    }
};

// Make loadReadingText globally accessible
window.loadReadingText = loadReadingText;
