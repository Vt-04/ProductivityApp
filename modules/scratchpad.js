// --- Scratchpad Module ---

document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const scratchpadText = document.getElementById('scratchpad-text');
    const scratchpadWords = document.getElementById('scratchpad-words');
    const scratchpadChars = document.getElementById('scratchpad-chars');
    const btnCopy = document.getElementById('btn-scratchpad-copy');
    const btnClear = document.getElementById('btn-scratchpad-clear');

    // --- State ---
    let savedText = localStorage.getItem('tacticalDashboardScratchpad') || '';

    // --- Calculations ---
    function updateStats() {
        const text = scratchpadText.value;
        
        // Character Count
        scratchpadChars.textContent = `${text.length} chars`;

        // Word Count
        const trimmed = text.trim();
        const wordCount = trimmed === '' ? 0 : trimmed.split(/\s+/).length;
        scratchpadWords.textContent = `${wordCount} words`;
    }

    function saveText() {
        localStorage.setItem('tacticalDashboardScratchpad', scratchpadText.value);
    }

    // --- Clipboard Action ---
    async function copyToClipboard() {
        const text = scratchpadText.value;
        if (!text) return;

        try {
            await navigator.clipboard.writeText(text);
            
            // Visual feedback confirmation
            const originalHTML = btnCopy.innerHTML;
            btnCopy.innerHTML = '<i class="fa-solid fa-check" style="color: var(--accent-green);"></i> Copied';
            btnCopy.style.pointerEvents = 'none';

            setTimeout(() => {
                btnCopy.innerHTML = originalHTML;
                btnCopy.style.pointerEvents = 'auto';
            }, 1500);
        } catch (err) {
            console.error('Failed to copy text: ', err);
            alert('Unable to copy text to clipboard.');
        }
    }

    // --- Clear Action ---
    function clearText() {
        if (!scratchpadText.value) return;

        const confirmClear = confirm('Are you sure you want to clear the scratchpad? This action cannot be undone.');
        if (confirmClear) {
            scratchpadText.value = '';
            saveText();
            updateStats();
        }
    }

    // --- Event Listeners ---
    scratchpadText.addEventListener('input', () => {
        saveText();
        updateStats();
    });

    btnCopy.addEventListener('click', copyToClipboard);
    btnClear.addEventListener('click', clearText);

    // --- Startup Initialization ---
    scratchpadText.value = savedText;
    updateStats();
});
