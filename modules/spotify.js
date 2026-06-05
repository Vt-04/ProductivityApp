// --- Spotify Audio Hub Module ---
document.addEventListener('DOMContentLoaded', () => {
    const spotifyPlayer = document.getElementById('spotify-player');
    const spotifyInput = document.getElementById('spotify-url-input');
    const btnLoadSpotify = document.getElementById('btn-load-spotify');
    const presetButtons = document.querySelectorAll('#spotify-module .btn-preset');

    const STORAGE_KEY = 'tacticalDashboardSpotifyEmbed';
    const DEFAULT_PLAYLIST = 'https://open.spotify.com/embed/playlist/37i9dQZF1DX8Ueb2vUJLmP';

    // Load saved playlist or use default
    let activeUrl = localStorage.getItem(STORAGE_KEY) || DEFAULT_PLAYLIST;

    function setPlayerUrl(url) {
        spotifyPlayer.src = url;
        localStorage.setItem(STORAGE_KEY, url);
        updatePresetActiveStates(url);
    }

    function updatePresetActiveStates(url) {
        presetButtons.forEach(btn => {
            if (btn.getAttribute('data-url') === url) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    function parseSpotifyUrl(url) {
        url = url.trim();
        if (!url) return null;

        // If already an embed URL, return it
        if (url.includes('/embed/')) {
            return url;
        }

        // Regex to parse standard track, playlist, album, or artist URLs
        const match = url.match(/https:\/\/open\.spotify\.com\/(track|playlist|album|artist)\/([a-zA-Z0-9]+)/i);
        if (match) {
            const type = match[1];
            const id = match[2];
            return `https://open.spotify.com/embed/${type}/${id}`;
        }

        return null;
    }

    function handleLoadCustomUrl() {
        const inputVal = spotifyInput.value.trim();
        if (!inputVal) return;

        const embedUrl = parseSpotifyUrl(inputVal);
        if (embedUrl) {
            setPlayerUrl(embedUrl);
            spotifyInput.value = '';
            spotifyInput.placeholder = 'Paste Spotify Link...';
            spotifyInput.style.borderColor = '';
            spotifyInput.style.boxShadow = '';
        } else {
            // Visual feedback for error
            spotifyInput.style.borderColor = 'var(--accent-red)';
            spotifyInput.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.25)';
            const originalPlaceholder = spotifyInput.placeholder;
            spotifyInput.value = '';
            spotifyInput.placeholder = 'Invalid Spotify URL!';
            
            setTimeout(() => {
                spotifyInput.style.borderColor = '';
                spotifyInput.style.boxShadow = '';
                spotifyInput.placeholder = originalPlaceholder;
            }, 2000);
        }
    }

    // Bind preset buttons
    presetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const url = btn.getAttribute('data-url');
            if (url) {
                setPlayerUrl(url);
            }
        });
    });

    // Bind load custom button
    btnLoadSpotify.addEventListener('click', handleLoadCustomUrl);

    // Bind enter key on input
    spotifyInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            handleLoadCustomUrl();
        }
    });

    // Initialize player source
    setPlayerUrl(activeUrl);
});
