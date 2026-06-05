// --- Firebase Social Comm-Center Module ---

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const configScreen = document.getElementById('social-config-screen');
    const activeScreen = document.getElementById('social-active-screen');
    
    // Config Form Elements
    const inputDbUrl = document.getElementById('social-db-url');
    const inputDbKey = document.getElementById('social-db-key');
    const inputDbId = document.getElementById('social-db-id');
    const btnConnect = document.getElementById('btn-connect-social');
    
    // Active Screen Elements
    const btnDisconnect = document.getElementById('btn-disconnect-social');
    const inputUsername = document.getElementById('social-username');
    const btnSaveUsername = document.getElementById('btn-save-username');
    const presenceList = document.getElementById('presence-list');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const btnSendMessage = document.getElementById('btn-send-message');

    // Storage Keys
    const CONFIG_KEY = 'tacticalDashboardFirebaseConfig';
    const USERNAME_KEY = 'tacticalDashboardUsername';
    const USERID_KEY = 'tacticalDashboardUserId';

    // State Variables
    let database = null;
    let username = localStorage.getItem(USERNAME_KEY) || `Agent-${Math.floor(1000 + Math.random() * 9000)}`;
    let userId = localStorage.getItem(USERID_KEY);
    if (!userId) {
        userId = `usr-${Math.random().toString(36).substring(2, 11)}`;
        localStorage.setItem(USERID_KEY, userId);
    }

    // Set initial username field value
    inputUsername.value = username;

    // Helper: Escape HTML to prevent XSS
    function escapeHtml(str) {
        if (!str) return '';
        return str.toString()
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Helper: Format Timestamp (HH:MM)
    function formatTime(timestamp) {
        const date = new Date(timestamp);
        const hrs = String(date.getHours()).padStart(2, '0');
        const mins = String(date.getMinutes()).padStart(2, '0');
        return `${hrs}:${mins}`;
    }

    // Initialize Firebase
    function initFirebase(config) {
        try {
            // Check if already initialized to prevent errors
            if (firebase.apps.length === 0) {
                firebase.initializeApp(config);
            }
            database = firebase.database();
            
            // Toggle view state
            configScreen.classList.add('hidden');
            activeScreen.classList.remove('hidden');
            
            // Set up presence and chat triggers
            setupPresence();
            setupChat();
        } catch (error) {
            console.error('Firebase Initialization Error:', error);
            alert('Failed to connect to Firebase. Please check your Database URL, API Key, and Project ID.');
            disconnectFirebase();
        }
    }

    // Handle Connection Form Submission
    btnConnect.addEventListener('click', () => {
        const url = inputDbUrl.value.trim();
        const key = inputDbKey.value.trim();
        const id = inputDbId.value.trim();
        
        if (!url || !key || !id) {
            alert('All fields are required to establish the link.');
            return;
        }

        const config = {
            apiKey: key,
            databaseURL: url,
            projectId: id,
            authDomain: `${id}.firebaseapp.com`
        };

        localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
        initFirebase(config);
    });

    // Handle Disconnect Button
    function disconnectFirebase() {
        // Go offline in database if connected
        if (database) {
            database.ref(`/presence/${userId}`).remove()
                .then(() => firebase.app().delete())
                .catch(err => console.log('Cleanup error:', err))
                .finally(() => {
                    database = null;
                    localStorage.removeItem(CONFIG_KEY);
                    activeScreen.classList.add('hidden');
                    configScreen.classList.remove('hidden');
                });
        } else {
            localStorage.removeItem(CONFIG_KEY);
            activeScreen.classList.add('hidden');
            configScreen.classList.remove('hidden');
        }
    }
    btnDisconnect.addEventListener('click', disconnectFirebase);

    // Save Username
    function saveUsername() {
        const newName = inputUsername.value.trim();
        if (!newName) return;
        
        username = newName;
        localStorage.setItem(USERNAME_KEY, username);
        
        // Push update to presence if online
        if (database) {
            database.ref(`/presence/${userId}/name`).set(username);
        }

        // Highlight confirmation style on button
        btnSaveUsername.style.borderColor = 'var(--accent-pink)';
        btnSaveUsername.style.color = 'var(--accent-pink)';
        setTimeout(() => {
            btnSaveUsername.style.borderColor = '';
            btnSaveUsername.style.color = '';
        }, 1000);
    }
    btnSaveUsername.addEventListener('click', saveUsername);
    inputUsername.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') saveUsername();
    });

    // --- Presence System ---
    function setupPresence() {
        if (!database) return;
        
        const myPresenceRef = database.ref(`/presence/${userId}`);
        const connectedRef = database.ref('.info/connected');
        
        connectedRef.on('value', (snap) => {
            if (snap.val() === true) {
                // Determine user's active status from other widgets
                let activeState = 'Active';
                
                // If Pomodoro timer is running, sync that status
                const timerToggleBtn = document.getElementById('timer-toggle-btn');
                if (timerToggleBtn && timerToggleBtn.innerHTML.includes('Pause')) {
                    activeState = 'Focusing ⏳';
                }
                
                myPresenceRef.set({
                    name: username,
                    status: activeState,
                    lastActive: firebase.database.ServerValue.TIMESTAMP
                });
                
                // Remove presence status on disconnect
                myPresenceRef.onDisconnect().remove();
            }
        });

        // Listen for other user presence changes and render
        const presenceListRef = database.ref('/presence');
        presenceListRef.on('value', (snap) => {
            presenceList.innerHTML = '';
            const users = snap.val();
            if (!users) return;

            Object.entries(users).forEach(([id, u]) => {
                const item = document.createElement('li');
                item.className = 'presence-item';
                const isMe = id === userId;
                
                item.innerHTML = `
                    <span class="status-dot online"></span>
                    <span class="presence-username">${escapeHtml(u.name)} ${isMe ? '<small>(You)</small>' : ''}</span>
                    <span class="presence-status text-dim" style="font-size: 0.7rem; margin-left: auto;">${escapeHtml(u.status || 'Online')}</span>
                `;
                presenceList.appendChild(item);
            });
        });

        // Listen to focus timer start/stop events to update user presence status live
        window.addEventListener('timerStateChanged', (e) => {
            if (database) {
                const isRunning = e.detail && e.detail.isRunning;
                myPresenceRef.child('status').set(isRunning ? 'Focusing ⏳' : 'Active');
            }
        });
    }

    // --- Chat Room System ---
    function setupChat() {
        if (!database) return;

        const messagesRef = database.ref('/messages');
        
        // Listen to incoming messages (limit to last 50)
        messagesRef.limitToLast(50).on('value', (snap) => {
            chatMessages.innerHTML = '';
            const msgs = snap.val();
            if (!msgs) {
                chatMessages.innerHTML = '<div class="empty-history text-center text-dim" style="margin-top: auto;">No messages logged. Introduce yourself!</div>';
                return;
            }

            Object.values(msgs).forEach(m => {
                const bubble = document.createElement('div');
                const isOutgoing = m.userId === userId;
                bubble.className = `chat-bubble ${isOutgoing ? 'outgoing' : 'incoming'}`;
                
                bubble.innerHTML = `
                    <div class="bubble-meta">
                        <span class="bubble-sender">${escapeHtml(m.name)}</span>
                        <span class="bubble-time">${formatTime(m.timestamp)}</span>
                    </div>
                    <div class="bubble-text">${escapeHtml(m.text)}</div>
                `;
                chatMessages.appendChild(bubble);
            });

            // Auto-scroll to bottom
            chatMessages.scrollTop = chatMessages.scrollHeight;
        });

        // Send Message Handler
        function sendMessage() {
            const text = chatInput.value.trim();
            if (!text) return;

            messagesRef.push({
                userId: userId,
                name: username,
                text: text,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });

            chatInput.value = '';
        }

        btnSendMessage.addEventListener('click', sendMessage);
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }

    // Bootstrapping: Auto-connect on startup if config is saved
    const savedConfig = localStorage.getItem(CONFIG_KEY);
    if (savedConfig) {
        try {
            const config = JSON.parse(savedConfig);
            initFirebase(config);
        } catch (e) {
            localStorage.removeItem(CONFIG_KEY);
        }
    }
});
