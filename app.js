// --- Core Dashboard Application Logic ---

document.addEventListener('DOMContentLoaded', () => {
    // --- State and Cache ---
    const grid = document.getElementById('main-grid');
    const restoreDock = document.getElementById('restore-dock');
    const dockContainer = document.getElementById('dock-container');
    const greetingEl = document.getElementById('dashboard-greeting');
    const clockEl = document.getElementById('header-clock');
    const dateEl = document.getElementById('header-date');
    const btnResetLayout = document.getElementById('btn-reset-layout');

    // Load minimized state from LocalStorage
    let minimizedModules = new Set(JSON.parse(localStorage.getItem('tacticalDashboardMinimized') || '[]'));

    // --- Dynamic Time & Clock Header ---
    function updateHeaderTime() {
        const now = new Date();
        
        // Clock Formatting
        const hrs = String(now.getHours()).padStart(2, '0');
        const mins = String(now.getMinutes()).padStart(2, '0');
        const secs = String(now.getSeconds()).padStart(2, '0');
        clockEl.textContent = `${hrs}:${mins}:${secs}`;

        // Date Formatting
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateEl.textContent = now.toLocaleDateString('en-US', options);

        // Greeting updates based on hour
        const hour = now.getHours();
        let greeting = 'Tactical Hub';
        if (hour < 12) greeting = 'Good Morning';
        else if (hour < 18) greeting = 'Good Afternoon';
        else greeting = 'Good Evening';
        
        greetingEl.textContent = greeting;
    }
    
    updateHeaderTime();
    setInterval(updateHeaderTime, 1000);

    // --- Theme Selector Logic ---
    const themes = {
        sapphire: {
            '--theme-1': 'hsl(199, 89%, 48%)',  // Blue
            '--theme-2': 'hsl(271, 91%, 65%)',  // Purple
            '--theme-3': 'hsl(24, 100%, 55%)',   // Orange
            '--theme-4': 'hsl(142, 71%, 45%)',   // Green
            '--theme-5': 'hsl(174, 90%, 45%)',   // Teal
            '--theme-1-glow': 'rgba(14, 165, 233, 0.25)',
            '--theme-2-glow': 'rgba(168, 85, 247, 0.25)',
            '--theme-3-glow': 'rgba(249, 115, 22, 0.25)',
            '--theme-4-glow': 'rgba(34, 197, 94, 0.25)',
            '--theme-5-glow': 'rgba(20, 184, 166, 0.25)'
        },
        cyberpunk: {
            '--theme-1': 'hsl(350, 89%, 60%)',  // Rose Red
            '--theme-2': 'hsl(315, 90%, 60%)',  // Neon Pink
            '--theme-3': 'hsl(32, 98%, 56%)',   // Orange
            '--theme-4': 'hsl(52, 100%, 50%)',  // Yellow
            '--theme-5': 'hsl(180, 100%, 50%)', // Neon Cyan
            '--theme-1-glow': 'rgba(244, 63, 94, 0.25)',
            '--theme-2-glow': 'rgba(236, 72, 153, 0.25)',
            '--theme-3-glow': 'rgba(249, 115, 22, 0.25)',
            '--theme-4-glow': 'rgba(234, 179, 8, 0.25)',
            '--theme-5-glow': 'rgba(6, 182, 212, 0.25)'
        },
        emerald: {
            '--theme-1': 'hsl(142, 71%, 45%)',  // Emerald Green
            '--theme-2': 'hsl(174, 90%, 40%)',  // Teal
            '--theme-3': 'hsl(162, 76%, 41%)',  // Mint
            '--theme-4': 'hsl(120, 60%, 50%)',  // Lime
            '--theme-5': 'hsl(190, 90%, 45%)',  // Sky Blue
            '--theme-1-glow': 'rgba(34, 197, 94, 0.25)',
            '--theme-2-glow': 'rgba(20, 184, 166, 0.25)',
            '--theme-3-glow': 'rgba(16, 185, 129, 0.25)',
            '--theme-4-glow': 'rgba(132, 204, 22, 0.25)',
            '--theme-5-glow': 'rgba(14, 165, 233, 0.25)'
        },
        amber: {
            '--theme-1': 'hsl(45, 100%, 50%)',   // Amber Gold
            '--theme-2': 'hsl(35, 100%, 52%)',   // Orange
            '--theme-3': 'hsl(20, 100%, 55%)',   // Dark Orange
            '--theme-4': 'hsl(10, 90%, 55%)',    // Vermillion
            '--theme-5': 'hsl(55, 90%, 60%)',    // Yellow
            '--theme-1-glow': 'rgba(234, 179, 8, 0.25)',
            '--theme-2-glow': 'rgba(249, 115, 22, 0.25)',
            '--theme-3-glow': 'rgba(239, 68, 68, 0.25)',
            '--theme-4-glow': 'rgba(248, 113, 113, 0.25)',
            '--theme-5-glow': 'rgba(253, 224, 71, 0.25)'
        }
    };

    function applyTheme(themeName) {
        const root = document.documentElement;
        const theme = themes[themeName];
        if (!theme) return;
        
        Object.entries(theme).forEach(([key, val]) => {
            root.style.setProperty(key, val);
        });

        // Toggle active dot classes
        document.querySelectorAll('.theme-dot').forEach(dot => {
            if (dot.getAttribute('data-theme') === themeName) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });

        localStorage.setItem('tacticalDashboardTheme', themeName);
        
        // Dispatch global theme event so modules can update dynamically
        window.dispatchEvent(new CustomEvent('themeChanged'));
    }


    // Bind click events to theme dots
    document.querySelectorAll('.theme-dot').forEach(dot => {
        dot.addEventListener('click', () => {
            const theme = dot.getAttribute('data-theme');
            applyTheme(theme);
        });
    });

    // Apply saved theme on startup
    const savedTheme = localStorage.getItem('tacticalDashboardTheme') || 'sapphire';
    applyTheme(savedTheme);


    // --- FLIP Transition Helper ---
    function executeWithTransition(actionFn) {
        // 1. Get initial positions of all visible cards (excluding the one being dragged)
        const items = [...grid.querySelectorAll('.module-card:not(.dragging)')];
        const firstRects = new Map();
        items.forEach(item => {
            if (item.style.display !== 'none') {
                firstRects.set(item.id, item.getBoundingClientRect());
            }
        });

        // 2. Execute DOM updates
        actionFn();

        // 3. Get new positions of items
        const lastRects = new Map();
        items.forEach(item => {
            if (item.style.display !== 'none') {
                lastRects.set(item.id, item.getBoundingClientRect());
            }
        });

        // 4. Invert and play
        items.forEach(item => {
            if (item.style.display === 'none') return;
            const key = item.id;
            const first = firstRects.get(key);
            const last = lastRects.get(key);

            if (first && last) {
                const deltaX = first.left - last.left;
                const deltaY = first.top - last.top;

                if (deltaX !== 0 || deltaY !== 0) {
                    item.style.transition = 'none';
                    item.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

                    // Force reflow
                    item.offsetHeight;

                    item.style.transition = 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)';
                    item.style.transform = 'translate(0, 0)';

                    // Clear inline transitions safely preventing overlapping timer conflicts
                    if (item._flipTimeout) {
                        clearTimeout(item._flipTimeout);
                    }
                    item._flipTimeout = setTimeout(() => {
                        item.style.transition = '';
                        item.style.transform = '';
                        item._flipTimeout = null;
                    }, 400);
                }
            }
        });
    }

    // --- Grid Layout & Column Management ---
    function updateGridColumns() {
        const visibleCount = 5 - minimizedModules.size;
        
        grid.classList.remove('cols-5', 'cols-4', 'cols-3', 'cols-2', 'cols-1');
        
        if (visibleCount === 5) {
            grid.classList.add('cols-5');
        } else if (visibleCount === 4) {
            grid.classList.add('cols-4');
        } else if (visibleCount === 3) {
            grid.classList.add('cols-3');
        } else if (visibleCount === 2) {
            grid.classList.add('cols-2');
        } else {
            grid.classList.add('cols-1');
        }
    }

    // --- Minimize and Restore Actions ---
    function saveMinimizedState() {
        localStorage.setItem('tacticalDashboardMinimized', JSON.stringify([...minimizedModules]));
    }

    function renderRestoreDock() {
        dockContainer.innerHTML = '';
        
        if (minimizedModules.size === 0) {
            restoreDock.classList.add('hidden');
            return;
        }
        
        restoreDock.classList.remove('hidden');
        
        minimizedModules.forEach(id => {
            const btn = document.createElement('button');
            btn.className = 'restore-btn';
            btn.setAttribute('data-target', id);
            
            // Assign icon and label based on ID
            let icon = 'fa-circle';
            let label = id;
            if (id === 'timer') { icon = 'fa-stopwatch'; label = 'Timer'; btn.classList.add('hover-glow-blue'); }
            else if (id === 'tasks') { icon = 'fa-list-check'; label = 'Tasks'; btn.classList.add('hover-glow-orange'); }
            else if (id === 'calculator') { icon = 'fa-calculator'; label = 'Calculator'; btn.classList.add('hover-glow-purple'); }
            else if (id === 'analytics') { icon = 'fa-chart-line'; label = 'Analytics'; btn.classList.add('hover-glow-green'); }
            else if (id === 'scratchpad') { icon = 'fa-note-sticky'; label = 'Scratchpad'; btn.classList.add('hover-glow-teal'); }
            
            btn.innerHTML = `<i class="fa-solid ${icon}"></i> Restore ${label}`;
            
            btn.addEventListener('click', () => {
                restoreModule(id);
            });
            
            dockContainer.appendChild(btn);
        });
    }


    function minimizeModule(id) {
        const card = document.getElementById(`${id}-module`);
        if (!card) return;
        
        card.classList.add('minimizing');
        setTimeout(() => {
            executeWithTransition(() => {
                card.style.display = 'none';
                card.classList.remove('minimizing');
                minimizedModules.add(id);
                saveMinimizedState();
                renderRestoreDock();
                updateGridColumns();
            });
        }, 300); // matches CSS transition duration
    }

    function restoreModule(id) {
        const card = document.getElementById(`${id}-module`);
        if (!card) return;
        
        executeWithTransition(() => {
            card.style.display = 'flex';
            card.classList.add('minimizing'); // starts small / scale(0.6)
            minimizedModules.delete(id);
            saveMinimizedState();
            renderRestoreDock();
            updateGridColumns();
        });
        
        // Force reflow
        setTimeout(() => {
            card.classList.remove('minimizing');
        }, 50);
    }

    // Hook up Minimize buttons
    document.querySelectorAll('.minimize-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = btn.getAttribute('data-target');
            minimizeModule(target);
        });
    });

    // Apply minimized states on startup
    minimizedModules.forEach(id => {
        const card = document.getElementById(`${id}-module`);
        if (card) {
            card.style.display = 'none';
        }
    });

    // --- Drag & Drop Reordering ---
    function saveLayoutOrder() {
        const cards = [...grid.querySelectorAll('.module-card')];
        const order = cards.map(c => c.getAttribute('data-id'));
        localStorage.setItem('tacticalDashboardOrder', JSON.stringify(order));
    }

    function loadLayoutOrder() {
        const orderStr = localStorage.getItem('tacticalDashboardOrder');
        if (!orderStr) return;
        try {
            const order = JSON.parse(orderStr);
            order.forEach(id => {
                const card = document.getElementById(`${id}-module`);
                if (card) {
                    grid.appendChild(card);
                }
            });
        } catch (e) {
            console.error("Failed to load layout order", e);
        }
    }

    // Enable HTML5 Drag & Drop
    const cards = grid.querySelectorAll('.module-card');
    
    cards.forEach(card => {
        // Prevent dragging unless holding the drag handle
        const handle = card.querySelector('.drag-handle');
        
        handle.addEventListener('mousedown', () => {
            card.setAttribute('draggable', 'true');
        });
        
        handle.addEventListener('mouseup', () => {
            card.setAttribute('draggable', 'false');
        });

        card.addEventListener('dragstart', (e) => {
            card.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
            card.setAttribute('draggable', 'false');
            saveLayoutOrder();
        });
    });

    // Drag insertion algorithm using Euclidean distance to card centers
    grid.addEventListener('dragover', (e) => {
        e.preventDefault();
        const draggingCard = grid.querySelector('.dragging');
        if (!draggingCard) return;

        const otherCards = [...grid.querySelectorAll('.module-card:not(.dragging)')];
        
        const closestCard = otherCards.reduce((closest, child) => {
            // Skip hidden cards
            if (child.style.display === 'none') return closest;

            const box = child.getBoundingClientRect();
            const centerX = box.left + box.width / 2;
            const centerY = box.top + box.height / 2;
            
            // squared distance to mouse cursor
            const distance = Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2);
            
            if (distance < closest.distance) {
                return { distance: distance, element: child, box: box };
            } else {
                return closest;
            }
        }, { distance: Number.POSITIVE_INFINITY, element: null });

        if (closestCard.element) {
            const targetBox = closestCard.box;
            const isAfter = (e.clientX > targetBox.left + targetBox.width / 2) || 
                            (e.clientY > targetBox.top + targetBox.height / 2);
            
            const targetSibling = isAfter ? closestCard.element.nextSibling : closestCard.element;
            
            if (draggingCard.nextSibling !== targetSibling) {
                executeWithTransition(() => {
                    grid.insertBefore(draggingCard, targetSibling);
                });
            }
        }
    });

    // --- Reset Action ---
    btnResetLayout.addEventListener('click', () => {
        executeWithTransition(() => {
            localStorage.removeItem('tacticalDashboardOrder');
            localStorage.removeItem('tacticalDashboardMinimized');
            localStorage.removeItem('tacticalDashboardTheme');
            
            minimizedModules.clear();
            applyTheme('sapphire');
            
            // Reset all card visibilities
            document.querySelectorAll('.module-card').forEach(card => {
                card.style.display = 'flex';
                card.classList.remove('hidden', 'minimizing');
            });
            
            // Re-append in original order to match DOM default
            const timerCard = document.getElementById('timer-module');
            const tasksCard = document.getElementById('tasks-module');
            const calcCard = document.getElementById('calculator-module');
            const analyticsCard = document.getElementById('analytics-module');
            const scratchpadCard = document.getElementById('scratchpad-module');
            
            grid.appendChild(timerCard);
            grid.appendChild(tasksCard);
            grid.appendChild(calcCard);
            grid.appendChild(analyticsCard);
            grid.appendChild(scratchpadCard);

            renderRestoreDock();
            updateGridColumns();
        });
    });


    // Initial setup loads
    loadLayoutOrder();
    renderRestoreDock();
    updateGridColumns();
});
