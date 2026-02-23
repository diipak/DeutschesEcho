/**
 * LiveAgentAudio handles microphone capture, PCM 16-bit 16kHz downsampling,
 * WebSocket streaming, and playback for the Gemini Live Tutor via FastAPI.
 */
class LiveAgentAudio {
    constructor(wsUrl) {
        this.wsUrl = wsUrl;
        this.ws = null;
        this.audioContext = null;
        this.mediaStream = null;
        this.processor = null;
        this.source = null;
        this.isRecording = false;

        // Gemini expects 16kHz PCM16 Mono
        this.targetSampleRate = 16000;

        // Playback queue management
        this.playbackTime = 0;
        this.sampleRate = 16000; // Target sample rate
        this.downsamplingFactor = 2; // Assuming original is 44.1kHz or 48kHz
        this.audioQueue = [];
        this.currentSubtitle = "";
    }

    async start() {
        try {
            // 1. Establish WebSocket Connection first
            this.ws = new WebSocket(this.wsUrl);

            this.ws.onopen = () => {
                console.log("[LiveAgentAudio] WebSocket connected to", this.wsUrl);
                this.startRecording();
            };

            this.ws.onmessage = async (event) => {
                try {
                    const msg = JSON.parse(event.data);

                    if (msg.type === "audio") {
                        const binaryStr = atob(msg.data);
                        const len = binaryStr.length;
                        const bytes = new Uint8Array(len);
                        for (let i = 0; i < len; i++) {
                            bytes[i] = binaryStr.charCodeAt(i);
                        }
                        this.playPcm16Audio(bytes.buffer);

                    } else if (msg.type === "ai_subtitle") {
                        // Streaming AI output transcription — accumulate for live subtitles
                        const subtitleEl = document.getElementById("ai-live-subtitle");
                        if (subtitleEl && msg.data) {
                            // Append each chunk (transcription comes word-by-word)
                            this.currentSubtitle = (this.currentSubtitle || "") + msg.data;
                            subtitleEl.textContent = this.currentSubtitle;
                        }

                    } else if (msg.type === "ai_english_translation") {
                        // PASS 2: AI's English translation arrives after the turn is complete
                        const userEl = document.getElementById("live-user-transcript");
                        const userContainer = document.getElementById("transcript-user");

                        if (userEl && userContainer && msg.data) {
                            // Morph the transcript box into a translation box
                            userEl.textContent = "🇬🇧 " + msg.data;
                            userEl.classList.remove("text-slate-400");
                            userEl.classList.add("text-blue-300", "italic");

                            // Change the red dot to a blue dot for translation mode
                            const dot = userContainer.querySelector('.bg-red-400');
                            if (dot) {
                                dot.classList.replace('bg-red-400', 'bg-blue-400');
                            }
                        }

                    } else if (msg.type === "turn_complete") {
                        // AI finished speaking — reset subtitle accumulator for next turn
                        this.currentSubtitle = "";

                        // Reset the translation box back to waiting state
                        const userEl = document.getElementById("live-user-transcript");
                        const userContainer = document.getElementById("transcript-user");
                        if (userEl && userContainer) {
                            userEl.textContent = "Listening to you...";
                            userEl.classList.add("text-slate-400");
                            userEl.classList.remove("text-blue-300", "italic");

                            const dot = userContainer.querySelector('.bg-blue-400');
                            if (dot) {
                                dot.classList.replace('bg-blue-400', 'bg-red-400');
                            }
                        }
                    }
                } catch (e) {
                    console.error("[LiveAgentAudio] Failed to parse incoming websocket message:", e);
                }
            };

            this.ws.onerror = (err) => console.error("[LiveAgentAudio] WebSocket error:", err);
            this.ws.onclose = () => {
                console.log("[LiveAgentAudio] WebSocket closed");
                this.stop();
            };

        } catch (err) {
            console.error("[LiveAgentAudio] Failed to start:", err);
        }
    }

    async startRecording() {
        if (this.isRecording) return;

        try {
            // 2. Request Microphone Access
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                }
            });

            // 3. Setup AudioContext 
            // We request the native sample rate to avoid browser built-in resampling bugs
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

            this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
            const inputSampleRate = this.audioContext.sampleRate;

            console.log(`[LiveAgentAudio] Input Sample Rate: ${inputSampleRate}Hz. Target: ${this.targetSampleRate}Hz`);

            // 4. Setup ScriptProcessorNode for manual downsampling
            // 4096 frames captures a decent chunk to send smoothly
            this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

            this.processor.onaudioprocess = (e) => {
                if (!this.isRecording || this.ws.readyState !== WebSocket.OPEN) return;

                const inputData = e.inputBuffer.getChannelData(0); // Float32Array

                // Downsample to 16kHz
                const downsampled = this.downsampleFloat32(inputData, inputSampleRate, this.targetSampleRate);

                // Convert Float32 to Int16
                const pcm16 = this.float32ToInt16(downsampled);

                // Convert to Base64 and send as JSON payload
                const base64Audio = this.int16ToBase64(pcm16);
                this.ws.send(JSON.stringify({ type: "audio", data: base64Audio }));
            };

            this.source.connect(this.processor);
            this.processor.connect(this.audioContext.destination);

            this.isRecording = true;
            this.playbackTime = this.audioContext.currentTime;
            this.currentSubtitle = ""; // Reset subtitles on new recording

            // Clear subtitle UI
            const subtitleEl = document.getElementById("ai-live-subtitle");
            if (subtitleEl) subtitleEl.textContent = "";

            console.log("[LiveAgentAudio] Recording started...");

        } catch (err) {
            console.error("[LiveAgentAudio] Error accessing microphone:", err);
            this.stop();
        }
    }

    stop() {
        if (!this.isRecording) return;
        this.isRecording = false;
        this.stopVision();

        if (this.processor) {
            this.processor.disconnect();
            this.processor = null;
        }
        if (this.source) {
            this.source.disconnect();
            this.source = null;
        }
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        console.log("[LiveAgentAudio] Stopped recording and closed connections.");
    }

    // --- Audio Processing Utilities ---

    /**
     * Downsample a Float32Array from inputRate to outputRate.
     * Simple linear interpolation for performance.
     */
    downsampleFloat32(buffer, inputRate, outputRate) {
        if (inputRate === outputRate) return buffer;

        const sampleRateRatio = inputRate / outputRate;
        const newLength = Math.round(buffer.length / sampleRateRatio);
        const result = new Float32Array(newLength);

        let offsetResult = 0;
        let offsetBuffer = 0;

        while (offsetResult < result.length) {
            const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);

            // Simple accumulation
            let accum = 0, count = 0;
            for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
                accum += buffer[i];
                count++;
            }
            if (count > 0) result[offsetResult] = accum / count;

            offsetResult++;
            offsetBuffer = nextOffsetBuffer;
        }

        return result;
    }

    /**
     * Convert Float32Array (-1.0 to 1.0) to Int16Array (-32768 to 32767)
     */
    float32ToInt16(buffer) {
        let l = buffer.length;
        const buf = new Int16Array(l);
        while (l--) {
            // clamp
            const s = Math.max(-1, Math.min(1, buffer[l]));
            buf[l] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return buf;
    }

    /**
     * Convert Int16Array to Base64 String (for Gemini standard)
     */
    int16ToBase64(int16Array) {
        const uint8 = new Uint8Array(int16Array.buffer);
        let binary = '';
        const len = uint8.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(uint8[i]);
        }
        return window.btoa(binary);
    }

    /**
     * Playback 16kHz PCM16 ArrayBuffer
     */
    playPcm16Audio(arrayBuffer) {
        if (!this.audioContext) return;

        // Convert ArrayBuffer (Int16 payload) back to Float32 for WebAudio API
        const int16Array = new Int16Array(arrayBuffer);
        const float32Array = new Float32Array(int16Array.length);

        for (let i = 0; i < int16Array.length; i++) {
            float32Array[i] = int16Array[i] / (int16Array[i] >= 0 ? 32767 : 32768);
        }

        // Create an AudioBuffer (Mono, 16kHz)
        const audioBuffer = this.audioContext.createBuffer(1, float32Array.length, this.targetSampleRate);
        audioBuffer.getChannelData(0).set(float32Array);

        // Schedule Playback
        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.audioContext.destination);

        // Ensure seamless audio by scheduling exactly after the previous chunk ends
        const currentTime = this.audioContext.currentTime;
        if (this.playbackTime < currentTime) {
            this.playbackTime = currentTime;
        }

        source.start(this.playbackTime);
        this.playbackTime += audioBuffer.duration;
    }

    // --- Vision Streaming Methods ---
    async startVision() {
        this.isVisionActive = true;
        const video = document.getElementById('live-vision-video');
        const canvas = document.getElementById('live-vision-canvas');
        if (!video || !canvas) return;

        try {
            this.visionStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            video.srcObject = this.visionStream;
            video.classList.remove('opacity-0');
            video.classList.add('opacity-50');

            this.visionInterval = setInterval(() => {
                if (!this.isVisionActive || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
                const ctx = canvas.getContext('2d');
                canvas.width = video.videoWidth || 640;
                canvas.height = video.videoHeight || 480;
                if (canvas.width === 0 || canvas.height === 0) return;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
                const base64Image = dataUrl.split(',')[1];
                this.ws.send(JSON.stringify({ type: "video", data: base64Image }));
            }, 1000);
            console.log("[LiveAgentAudio] Vision started streaming at 1 FPS");
        } catch (err) {
            console.error("[LiveAgentAudio] Camera error:", err);
            this.stopVision();
        }
    }

    stopVision() {
        this.isVisionActive = false;
        if (this.visionInterval) {
            clearInterval(this.visionInterval);
            this.visionInterval = null;
        }
        if (this.visionStream) {
            this.visionStream.getTracks().forEach(t => t.stop());
            this.visionStream = null;
        }
        const video = document.getElementById('live-vision-video');
        if (video) {
            video.srcObject = null;
            video.classList.remove('opacity-50');
            video.classList.add('opacity-0');
        }
        console.log("[LiveAgentAudio] Vision stopped.");
    }
}

// Global instance 
let liveAgentAudio = null;

// UI Hookup Function
window.toggleLiveAudio = function () {
    const micButtons = document.querySelectorAll('.live-mic-btn');
    const isRecording = liveAgentAudio && liveAgentAudio.isRecording;

    if (isRecording) {
        liveAgentAudio.stop();
        // UI Reset
        micButtons.forEach(btn => {
            btn.classList.remove('animate-pulse');
            btn.parentElement.querySelector('.mic-pulse')?.classList.add('hidden');
        });
        document.querySelectorAll('.live-status-text').forEach(el => el.textContent = "AI is Paused");
    } else {
        const host = window.location.host;
        // Connect to FastAPI WebSocket
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        liveAgentAudio = new LiveAgentAudio(`${protocol}//${host}/ws/live`);
        liveAgentAudio.start();

        // UI Active State
        micButtons.forEach(btn => {
            btn.classList.add('animate-pulse');
            btn.parentElement.querySelector('.mic-pulse')?.classList.remove('hidden');
        });
        document.querySelectorAll('.live-status-text').forEach(el => el.textContent = "AI is Listening...");
    }
};

// Vision Toggle Hook
window.toggleLiveVision = function () {
    if (!liveAgentAudio) return;
    const btn = document.getElementById('toggle-vision-btn');
    if (liveAgentAudio.isVisionActive) {
        liveAgentAudio.stopVision();
        if (btn) {
            btn.classList.remove('text-green-400', 'bg-slate-700');
            btn.classList.add('text-slate-400', 'bg-slate-800');
        }
    } else {
        liveAgentAudio.startVision();
        if (btn) {
            btn.classList.remove('text-slate-400', 'bg-slate-800');
            btn.classList.add('text-green-400', 'bg-slate-700');
        }
    }
}

// UI Close Hook
window.closeLiveTutor = function () {
    if (liveAgentAudio) {
        liveAgentAudio.stop();
    }
    document.getElementById('live-voice-screen')?.classList.add('hidden');
    document.getElementById('live-vision-screen')?.classList.add('hidden');
};

// Open Voice Mode
window.openLiveVoiceMode = function () {
    document.getElementById('live-voice-screen').classList.remove('hidden');
    // Start automatically when opening
    if (!liveAgentAudio || !liveAgentAudio.isRecording) {
        window.toggleLiveAudio();
    }
};

// Open Vision Mode
window.openLiveVisionMode = function () {
    document.getElementById('live-vision-screen').classList.remove('hidden');
    // Start automatically when opening
    if (!liveAgentAudio || !liveAgentAudio.isRecording) {
        window.toggleLiveAudio();
    }
};
