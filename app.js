// --- Core Dashboard Application Logic ---

document.addEventListener('DOMContentLoaded', () => {
    // --- State and Cache ---
    const grid = document.getElementById('main-grid');
    const moduleDrawer = document.getElementById('module-drawer');
    const drawerOverlay = document.getElementById('drawer-overlay');
    const btnToggleDrawer = document.getElementById('btn-toggle-drawer');
    const btnCloseDrawer = document.getElementById('btn-close-drawer');
    const moduleToggleList = document.getElementById('module-toggle-list');
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
        // 1. Get initial positions of all visible cards
        const items = [...grid.querySelectorAll('.module-card')];
        const firstRects = new Map();
        items.forEach(item => {
            if (item.style.display !== 'none') {
                // Temporarily disable transform/transition to get true layout position
                const savedTransition = item.style.transition;
                const savedTransform = item.style.transform;
                item.style.transition = 'none';
                item.style.transform = 'none';
                
                firstRects.set(item.id, item.getBoundingClientRect());
                
                item.style.transition = savedTransition;
                item.style.transform = savedTransform;
            }
        });

        // 2. Execute DOM updates
        actionFn();

        // 3. Get new positions of items
        const lastRects = new Map();
        items.forEach(item => {
            if (item.style.display !== 'none') {
                // Temporarily disable transform/transition to get true layout position
                const savedTransition = item.style.transition;
                const savedTransform = item.style.transform;
                item.style.transition = 'none';
                item.style.transform = 'none';
                
                lastRects.set(item.id, item.getBoundingClientRect());
                
                item.style.transition = savedTransition;
                item.style.transform = savedTransform;
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
        const visibleCount = 6 - minimizedModules.size;
        
        grid.classList.remove('cols-6', 'cols-5', 'cols-4', 'cols-3', 'cols-2', 'cols-1');
        
        if (visibleCount === 6) {
            grid.classList.add('cols-6');
        } else if (visibleCount === 5) {
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

    // --- Drawer Config & Toggle Management ---
    const modulesConfig = [
        { id: 'timer', label: 'Focus Session', icon: 'fa-stopwatch', colorClass: 'switch-timer', iconStyle: 'background: rgba(14, 165, 233, 0.1); color: var(--accent-blue);' },
        { id: 'tasks', label: 'Tasks', icon: 'fa-list-check', colorClass: 'switch-tasks', iconStyle: 'background: rgba(249, 115, 22, 0.1); color: var(--accent-orange);' },
        { id: 'calculator', label: 'Calculator', icon: 'fa-calculator', colorClass: 'switch-calculator', iconStyle: 'background: rgba(168, 85, 247, 0.1); color: var(--accent-purple);' },
        { id: 'analytics', label: 'Analytics', icon: 'fa-chart-line', colorClass: 'switch-analytics', iconStyle: 'background: rgba(34, 197, 94, 0.1); color: var(--accent-green);' },
        { id: 'scratchpad', label: 'Scratchpad', icon: 'fa-note-sticky', colorClass: 'switch-scratchpad', iconStyle: 'background: rgba(20, 184, 166, 0.1); color: var(--accent-teal);' },
        { id: 'spotify', label: 'Audio Hub', icon: 'fa-music', colorClass: 'switch-spotify', iconStyle: 'background: rgba(239, 68, 68, 0.1); color: var(--accent-red);' }
    ];

    function buildToggleList() {
        moduleToggleList.innerHTML = '';
        
        modulesConfig.forEach(mod => {
            const isChecked = !minimizedModules.has(mod.id);
            const item = document.createElement('div');
            item.className = 'toggle-item';
            item.innerHTML = `
                <div class="toggle-info">
                    <div class="toggle-icon" style="${mod.iconStyle}">
                        <i class="fa-solid ${mod.icon}"></i>
                    </div>
                    <div class="toggle-text">
                        <span class="toggle-label">${mod.label}</span>
                        <span id="status-${mod.id}" class="toggle-status">${isChecked ? 'Active' : 'Minimized'}</span>
                    </div>
                </div>
                <label class="switch ${mod.colorClass}">
                    <input type="checkbox" id="checkbox-${mod.id}" ${isChecked ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
            `;
            
            const checkbox = item.querySelector('input');
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    restoreModule(mod.id);
                } else {
                    minimizeModule(mod.id);
                }
            });
            
            moduleToggleList.appendChild(item);
        });
    }

    function syncTogglesState() {
        modulesConfig.forEach(mod => {
            const isChecked = !minimizedModules.has(mod.id);
            const checkbox = document.getElementById(`checkbox-${mod.id}`);
            const statusLabel = document.getElementById(`status-${mod.id}`);
            
            if (checkbox) {
                checkbox.checked = isChecked;
            }
            if (statusLabel) {
                statusLabel.textContent = isChecked ? 'Active' : 'Minimized';
            }
        });
    }

    // --- Drawer Visibility Controls ---
    function openDrawer() {
        moduleDrawer.classList.add('open');
        drawerOverlay.classList.add('open');
    }

    function closeDrawer() {
        moduleDrawer.classList.remove('open');
        drawerOverlay.classList.remove('open');
    }

    btnToggleDrawer.addEventListener('click', openDrawer);
    btnCloseDrawer.addEventListener('click', closeDrawer);
    drawerOverlay.addEventListener('click', closeDrawer);
    
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && moduleDrawer.classList.contains('open')) {
            closeDrawer();
        }
    });


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
                syncTogglesState();
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
            syncTogglesState();
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

    // --- Reset Action ---
    btnResetLayout.addEventListener('click', () => {
        executeWithTransition(() => {
            localStorage.removeItem('tacticalDashboardMinimized');
            localStorage.removeItem('tacticalDashboardTheme');
            
            minimizedModules.clear();
            applyTheme('sapphire');
            
            // Reset all card visibilities
            document.querySelectorAll('.module-card').forEach(card => {
                card.style.display = 'flex';
                card.classList.remove('hidden', 'minimizing');
            });

            syncTogglesState();
            updateGridColumns();
        });
    });


    // --- Interactive Particle Background ---
    function initParticles() {
        const canvas = document.getElementById('particles-bg');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        
        let particles = [];
        const count = 35;
        
        function resize() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        resize();
        window.addEventListener('resize', resize);
        
        class Particle {
            constructor() {
                this.reset();
            }
            reset() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.vx = (Math.random() - 0.5) * 0.3;
                this.vy = (Math.random() - 0.5) * 0.3;
                this.radius = Math.random() * 2 + 1;
            }
            update() {
                this.x += this.vx;
                this.y += this.vy;
                if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
                    this.reset();
                }
            }
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                
                const color = getComputedStyle(document.documentElement).getPropertyValue('--theme-1').trim() || '#0ea5e9';
                ctx.fillStyle = color;
                ctx.fill();
            }
        }
        
        for (let i = 0; i < count; i++) {
            particles.push(new Particle());
        }
        
        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            const color = getComputedStyle(document.documentElement).getPropertyValue('--theme-1').trim() || '#0ea5e9';
            
            particles.forEach((p, idx) => {
                p.update();
                p.draw();
                
                for (let j = idx + 1; j < particles.length; j++) {
                    const p2 = particles[j];
                    const dx = p.x - p2.x;
                    const dy = p.y - p2.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist < 120) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        
                        let hslaColor = color;
                        if (color.startsWith('hsl(')) {
                            hslaColor = color.replace('hsl(', 'hsla(').replace(')', `, ${0.12 * (1 - dist / 120)})`);
                        } else {
                            hslaColor = `rgba(14, 165, 233, ${0.12 * (1 - dist / 120)})`;
                        }
                        ctx.strokeStyle = hslaColor;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            });
            requestAnimationFrame(animate);
        }
        animate();
    }

    // Initial setup loads
    buildToggleList();
    updateGridColumns();
    initParticles();
});
