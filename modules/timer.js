// --- Focus Timer Module ---

document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const timerDisplay = document.getElementById('timer-display');
    const timerRing = document.getElementById('timer-ring-active');
    const toggleBtn = document.getElementById('timer-toggle-btn');
    const resetBtn = document.getElementById('timer-reset-btn');
    const customBtn = document.getElementById('timer-custom-btn');
    const customDrawer = document.getElementById('custom-time-drawer');
    const customMinutesInput = document.getElementById('custom-minutes');
    const saveCustomBtn = document.getElementById('btn-save-custom');
    const modeBtns = document.querySelectorAll('.timer-mode-btn');

    // --- State Variables ---
    let timerInterval = null;
    let currentMode = 'focus'; // 'focus', 'short', 'long', or 'custom'
    let totalSeconds = 25 * 60;
    let secondsRemaining = totalSeconds;
    let isRunning = false;
    let accumulatedSecondsThisSession = 0;

    const ringPerimeter = 534; // 2 * Math.PI * r(85)

    // Mode Durations (in seconds)
    const modeDurations = {
        focus: 25 * 60,
        short: 5 * 60,
        long: 15 * 60
    };

    // --- Audio Synthesis via Web Audio API ---
    function playAlertChime() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            
            const audioCtx = new AudioContext();
            
            // First beep (D5)
            const osc1 = audioCtx.createOscillator();
            const gain1 = audioCtx.createGain();
            osc1.connect(gain1);
            gain1.connect(audioCtx.destination);
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(587.33, audioCtx.currentTime);
            gain1.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gain1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
            osc1.start();
            osc1.stop(audioCtx.currentTime + 0.3);

            // Second beep (A5)
            const osc2 = audioCtx.createOscillator();
            const gain2 = audioCtx.createGain();
            osc2.connect(gain2);
            gain2.connect(audioCtx.destination);
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(880.00, audioCtx.currentTime + 0.15);
            gain2.gain.setValueAtTime(0.3, audioCtx.currentTime + 0.15);
            gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
            osc2.start(audioCtx.currentTime + 0.15);
            osc2.stop(audioCtx.currentTime + 0.5);
        } catch (e) {
            console.error("Audio Context playback failed: ", e);
        }
    }

    // --- Rendering and UI Updates ---
    function updateDisplay() {
        const mins = Math.floor(secondsRemaining / 60);
        const secs = secondsRemaining % 60;
        timerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

        // Circular Ring Animation
        const progress = secondsRemaining / totalSeconds;
        const offset = ringPerimeter - (progress * ringPerimeter);
        timerRing.style.strokeDashoffset = offset;
    }

    function updateToggleButton() {
        if (isRunning) {
            toggleBtn.innerHTML = '<i class="fa-solid fa-pause"></i> Pause';
            toggleBtn.style.background = 'var(--accent-purple)';
            toggleBtn.style.boxShadow = '0 4px 12px var(--glow-purple)';
        } else {
            toggleBtn.innerHTML = '<i class="fa-solid fa-play"></i> Start';
            toggleBtn.style.background = 'var(--accent-blue)';
            toggleBtn.style.boxShadow = '0 4px 12px var(--glow-blue)';
        }
    }

    // --- Timer Actions ---
    function startTimer() {
        if (isRunning) return;
        isRunning = true;
        updateToggleButton();
        window.dispatchEvent(new CustomEvent('timerStateChanged', { detail: { isRunning: true } }));

        timerInterval = setInterval(() => {
            if (secondsRemaining > 0) {
                secondsRemaining--;
                accumulatedSecondsThisSession++;
                
                // Every minute elapsed, log to stats
                if (accumulatedSecondsThisSession >= 60) {
                    if (currentMode === 'focus' || currentMode === 'custom') {
                        logFocusTime(1);
                    }
                    accumulatedSecondsThisSession = 0;
                }
                
                updateDisplay();
            } else {
                handleTimerComplete();
            }
        }, 1000);
    }

    function pauseTimer() {
        if (!isRunning) return;
        isRunning = false;
        clearInterval(timerInterval);
        timerInterval = null;
        updateToggleButton();
        window.dispatchEvent(new CustomEvent('timerStateChanged', { detail: { isRunning: false } }));

        // Flush any remaining accumulated seconds (if > 30s, round up to 1 minute focus)
        if (accumulatedSecondsThisSession >= 30) {
            if (currentMode === 'focus' || currentMode === 'custom') {
                logFocusTime(1);
            }
        }
        accumulatedSecondsThisSession = 0;
    }

    function resetTimer() {
        pauseTimer();
        secondsRemaining = totalSeconds;
        accumulatedSecondsThisSession = 0;
        updateDisplay();
    }

    function setMode(mode, customDuration = null) {
        pauseTimer();
        currentMode = mode;
        
        // Remove active class from all mode buttons
        modeBtns.forEach(btn => btn.classList.remove('active'));
        
        if (mode === 'custom' && customDuration) {
            totalSeconds = customDuration;
        } else {
            totalSeconds = modeDurations[mode];
            const activeBtn = document.querySelector(`.timer-mode-btn[data-mode="${mode}"]`);
            if (activeBtn) activeBtn.classList.add('active');
        }
        
        secondsRemaining = totalSeconds;
        accumulatedSecondsThisSession = 0;
        updateDisplay();
        
        // Hide custom time drawer if we switched away from custom
        if (mode !== 'custom') {
            customDrawer.classList.add('hidden');
        }
    }

    function handleTimerComplete() {
        pauseTimer();
        playAlertChime();
        
        // Log remaining focus session
        if (currentMode === 'focus' || currentMode === 'custom') {
            // Log 1 final minute to account for rounding/remaining seconds
            logFocusTime(1);
        }

        // Show alert notification
        setTimeout(() => {
            alert(`Timer complete! Time for a well-deserved break or next focus session.`);
            resetTimer();
        }, 100);
    }

    // --- Statistics logger ---
    function logFocusTime(minutes) {
        const today = new Date().toISOString().split('T')[0];
        const stats = JSON.parse(localStorage.getItem('tacticalDashboardFocusStats') || '{}');
        
        stats[today] = (stats[today] || 0) + minutes;
        localStorage.setItem('tacticalDashboardFocusStats', JSON.stringify(stats));

        // Dispatch a global event to notify the Analytics module
        window.dispatchEvent(new CustomEvent('focusStatsUpdated', { detail: { minutes } }));
    }

    // --- Event Handlers ---
    toggleBtn.addEventListener('click', () => {
        if (isRunning) {
            pauseTimer();
        } else {
            startTimer();
        }
    });

    resetBtn.addEventListener('click', resetTimer);

    customBtn.addEventListener('click', () => {
        customDrawer.classList.toggle('hidden');
        if (!customDrawer.classList.contains('hidden')) {
            customMinutesInput.focus();
        }
    });

    saveCustomBtn.addEventListener('click', () => {
        const mins = parseInt(customMinutesInput.value, 10);
        if (mins && mins > 0 && mins <= 180) {
            setMode('custom', mins * 60);
            customDrawer.classList.add('hidden');
            customMinutesInput.value = '';
        } else {
            alert('Please enter a valid duration between 1 and 180 minutes.');
        }
    });

    customMinutesInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveCustomBtn.click();
        }
    });

    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.getAttribute('data-mode');
            setMode(mode);
        });
    });

    // Initial setup display
    updateDisplay();
});
