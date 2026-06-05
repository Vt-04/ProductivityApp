document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const statFocusTime = document.getElementById('stat-focus-time');
    const statTasksCount = document.getElementById('stat-tasks-count');
    const canvas = document.getElementById('productivity-chart');
    
    // Weather Elements
    const weatherTemp = document.getElementById('weather-temp');
    const weatherCond = document.getElementById('weather-cond');
    const weatherLoc = document.getElementById('weather-location');
    const weatherIconContainer = document.getElementById('weather-icon-container');
    const btnWeatherUnit = document.getElementById('btn-weather-unit');
    const weatherInfo = document.getElementById('weather-info');
    const weatherSearchDrawer = document.getElementById('weather-search-drawer');
    const weatherSearchInput = document.getElementById('weather-search-input');
    const btnSearchToggle = document.getElementById('btn-weather-search-toggle');
    const btnSearchCancel = document.getElementById('btn-weather-search-cancel');
    const btnSearch = document.getElementById('btn-weather-search');
    const btnWeatherGps = document.getElementById('btn-weather-gps');

    // --- State and Config ---

    let currentTempC = null;
    let currentUnit = localStorage.getItem('tacticalDashboardWeatherUnit') || 'C';

    const accentBlue = 'rgb(14, 165, 233)';
    const accentGreen = 'rgb(34, 197, 94)';
    const textMutedColor = 'rgba(148, 163, 184, 0.5)'; // slate-400
    const textDimColor = 'rgba(100, 116, 139, 0.8)'; // slate-500

    // WMO Weather Code Mapping to FontAwesome Icons & Descriptions
    const weatherMap = {
        0: { icon: 'fa-sun', desc: 'Clear Sky', color: 'hsl(45, 100%, 55%)', glow: 'rgba(234, 179, 8, 0.3)' },
        1: { icon: 'fa-cloud-sun', desc: 'Mainly Clear', color: 'hsl(45, 100%, 65%)', glow: 'rgba(234, 179, 8, 0.2)' },
        2: { icon: 'fa-cloud-sun', desc: 'Partly Cloudy', color: 'hsl(199, 89%, 65%)', glow: 'rgba(14, 165, 233, 0.2)' },
        3: { icon: 'fa-cloud', desc: 'Overcast', color: 'hsl(215, 20%, 65%)', glow: 'rgba(148, 163, 184, 0.2)' },
        45: { icon: 'fa-smog', desc: 'Foggy', color: 'hsl(215, 15%, 55%)', glow: 'rgba(148, 163, 184, 0.15)' },
        48: { icon: 'fa-smog', desc: 'Depositing Rime Fog', color: 'hsl(215, 15%, 55%)', glow: 'rgba(148, 163, 184, 0.15)' },
        51: { icon: 'fa-cloud-showers-heavy', desc: 'Light Drizzle', color: 'hsl(199, 89%, 60%)', glow: 'rgba(14, 165, 233, 0.2)' },
        53: { icon: 'fa-cloud-showers-heavy', desc: 'Moderate Drizzle', color: 'hsl(199, 89%, 55%)', glow: 'rgba(14, 165, 233, 0.2)' },
        55: { icon: 'fa-cloud-showers-heavy', desc: 'Dense Drizzle', color: 'hsl(199, 89%, 50%)', glow: 'rgba(14, 165, 233, 0.25)' },
        61: { icon: 'fa-cloud-showers-water', desc: 'Slight Rain', color: 'hsl(199, 89%, 55%)', glow: 'rgba(14, 165, 233, 0.2)' },
        63: { icon: 'fa-cloud-rain', desc: 'Moderate Rain', color: 'hsl(199, 89%, 50%)', glow: 'rgba(14, 165, 233, 0.25)' },
        65: { icon: 'fa-cloud-showers-heavy', desc: 'Heavy Rain', color: 'hsl(199, 89%, 45%)', glow: 'rgba(14, 165, 233, 0.3)' },
        66: { icon: 'fa-snowflake', desc: 'Light Freezing Rain', color: 'hsl(210, 40%, 95%)', glow: 'rgba(255, 255, 255, 0.3)' },
        67: { icon: 'fa-snowflake', desc: 'Heavy Freezing Rain', color: 'hsl(210, 40%, 95%)', glow: 'rgba(255, 255, 255, 0.4)' },
        71: { icon: 'fa-snowflake', desc: 'Slight Snow', color: 'hsl(210, 40%, 95%)', glow: 'rgba(255, 255, 255, 0.3)' },
        73: { icon: 'fa-snowflake', desc: 'Moderate Snow', color: 'hsl(210, 40%, 95%)', glow: 'rgba(255, 255, 255, 0.35)' },
        75: { icon: 'fa-snowflake', desc: 'Heavy Snow', color: 'hsl(210, 40%, 95%)', glow: 'rgba(255, 255, 255, 0.4)' },
        80: { icon: 'fa-cloud-rain', desc: 'Slight Rain Showers', color: 'hsl(199, 89%, 50%)', glow: 'rgba(14, 165, 233, 0.2)' },
        81: { icon: 'fa-cloud-rain', desc: 'Moderate Rain Showers', color: 'hsl(199, 89%, 45%)', glow: 'rgba(14, 165, 233, 0.25)' },
        82: { icon: 'fa-cloud-showers-heavy', desc: 'Violent Rain Showers', color: 'hsl(199, 89%, 40%)', glow: 'rgba(14, 165, 233, 0.3)' },
        95: { icon: 'fa-cloud-bolt', desc: 'Thunderstorm', color: 'hsl(271, 91%, 65%)', glow: 'rgba(168, 85, 247, 0.3)' }
    };

    // --- Weather Fetch Logic ---
    async function fetchWeather() {
        if (!weatherTemp) return;
        
        try {
            // Check if user permits browser Geolocation
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const lat = position.coords.latitude;
                        const lon = position.coords.longitude;
                        getWeatherData(lat, lon, "Local Weather");
                    },
                    (error) => {
                        console.warn("Browser Location denied/failed. Falling back to IP Location.", error);
                        fetchWeatherByIP();
                    },
                    { timeout: 8000 }
                );
            } else {
                fetchWeatherByIP();
            }
        } catch (e) {
            console.error("Failed to load weather: ", e);
            showWeatherError();
        }
    }

    async function fetchWeatherByIP() {
        try {
            const response = await fetch('https://ipapi.co/json/');
            if (!response.ok) throw new Error('IP check failed');
            const data = await response.json();
            const lat = data.latitude;
            const lon = data.longitude;
            const locationName = `${data.city}, ${data.country_code}`;
            getWeatherData(lat, lon, locationName);
        } catch (e) {
            console.error("IP geolocation failed", e);
            // Default Fallback: London
            getWeatherData(51.5074, -0.1278, "London, UK");
        }
    }

    async function getWeatherData(lat, lon, locationLabel) {
        try {
            const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
            if (!response.ok) throw new Error('Weather API returned error status');
            const data = await response.json();
            const current = data.current_weather;
            
            if (!current) throw new Error('No weather data object found');

            currentTempC = Math.round(current.temperature);
            const code = current.weathercode;
            
            const weatherObj = weatherMap[code] || { 
                icon: 'fa-cloud-sun', 
                desc: 'Partly Cloudy', 
                color: 'var(--accent-green)', 
                glow: 'var(--glow-green)' 
            };

            // Update UI values
            displayTemperature();
            weatherCond.textContent = weatherObj.desc;
            weatherLoc.textContent = locationLabel;
            
            // Set Weather Icon and glow
            weatherIconContainer.innerHTML = `<i class="fa-solid ${weatherObj.icon}"></i>`;
            weatherIconContainer.style.color = weatherObj.color;
            weatherIconContainer.style.textShadow = `0 0 12px ${weatherObj.glow}`;
        } catch (e) {
            console.error("Error drawing weather values: ", e);
            showWeatherError();
        }
    }

    function displayTemperature() {
        if (!weatherTemp || !btnWeatherUnit) return;
        if (currentTempC === null) {
            weatherTemp.textContent = '--';
            btnWeatherUnit.textContent = currentUnit === 'F' ? '°F' : '°C';
            return;
        }
        
        if (currentUnit === 'F') {
            const tempF = Math.round((currentTempC * 9/5) + 32);
            weatherTemp.textContent = tempF;
            btnWeatherUnit.textContent = '°F';
        } else {
            weatherTemp.textContent = currentTempC;
            btnWeatherUnit.textContent = '°C';
        }
    }

    function showWeatherError() {
        currentTempC = null;
        displayTemperature();
        weatherCond.textContent = 'Offline / Error';
        weatherLoc.textContent = 'Weather widget';
        weatherIconContainer.innerHTML = '<i class="fa-solid fa-cloud-circle-exclamation"></i>';
        weatherIconContainer.style.color = 'var(--accent-red)';
        weatherIconContainer.style.textShadow = '0 0 12px rgba(239, 68, 68, 0.3)';
    }

    async function searchCity(cityName) {
        if (!cityName) return;
        
        try {
            weatherCond.textContent = 'Searching...';
            const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`);
            if (!response.ok) throw new Error('Geocoding failed');
            const data = await response.json();
            
            if (!data.results || data.results.length === 0) {
                weatherCond.textContent = 'Not Found';
                return;
            }

            const result = data.results[0];
            const lat = result.latitude;
            const lon = result.longitude;
            
            // Format dynamic location display name
            const stateOrCountry = result.admin1 || result.country || '';
            const locationLabel = stateOrCountry ? `${result.name}, ${stateOrCountry}` : result.name;

            // Get weather
            getWeatherData(lat, lon, locationLabel);

            // Hide search drawer
            weatherSearchDrawer.classList.add('hidden');
            weatherInfo.classList.remove('hidden');
            
            // Show GPS/restore button so the user can easily toggle back to auto-location
            btnWeatherGps.classList.remove('hidden');
        } catch (e) {
            console.error("Geocoding failed: ", e);
            weatherCond.textContent = 'Search Error';
        }
    }




    // --- Stats Updater ---
    function updateStatsPanel() {
        // 1. Focus Time Today
        const todayStr = new Date().toISOString().split('T')[0];
        const focusStats = JSON.parse(localStorage.getItem('tacticalDashboardFocusStats') || '{}');
        const minutesToday = focusStats[todayStr] || 0;
        
        if (minutesToday >= 60) {
            const hrs = (minutesToday / 60).toFixed(1);
            statFocusTime.textContent = `${hrs}h`;
        } else {
            statFocusTime.textContent = `${minutesToday}m`;
        }

        // 2. Completed Tasks Count (total active + completed in list, or total completed)
        const tasks = JSON.parse(localStorage.getItem('tacticalTasksData') || '[]');
        const completedTasksCount = tasks.filter(t => t.completed).length;
        statTasksCount.textContent = completedTasksCount;
    }

    // --- High-DPI Canvas Setup ---
    function setupCanvas() {
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        
        // Get CSS size of canvas
        const rect = canvas.getBoundingClientRect();
        
        // Set actual canvas size adjusted for DPI
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        
        // Scale context to draw in CSS pixels
        ctx.scale(dpr, dpr);
        
        return { ctx, width: rect.width, height: rect.height };
    }

    // --- Chart Drawing ---
    function renderProductivityChart() {
        if (!canvas) return;
        
        const { ctx, width, height } = setupCanvas();
        const focusStats = JSON.parse(localStorage.getItem('tacticalDashboardFocusStats') || '{}');

        // Dynamic Accent Colors from DOM for theme support
        const rootStyles = getComputedStyle(document.documentElement);
        const dynamicAccentBlue = rootStyles.getPropertyValue('--accent-blue').trim() || accentBlue;
        const dynamicGlowBlue = rootStyles.getPropertyValue('--glow-blue').trim() || 'rgba(14, 165, 233, 0.25)';

        // Generate data for the past 7 days (including today)
        const labels = [];
        const data = [];
        const today = new Date();


        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateString = date.toISOString().split('T')[0];
            
            // Short weekday name (e.g. "Mon")
            const dayAbbr = date.toLocaleDateString('en-US', { weekday: 'short' });
            labels.push(dayAbbr);
            
            // Minutes of focus time
            data.push(focusStats[dateString] || 0);
        }

        // Configuration margins
        const leftPadding = 32;
        const rightPadding = 12;
        const topPadding = 15;
        const bottomPadding = 25;
        
        const graphWidth = width - leftPadding - rightPadding;
        const graphHeight = height - topPadding - bottomPadding;

        // Calculate Y-axis limits
        const maxVal = Math.max(...data, 30); // scale max up to at least 30m
        const yMax = Math.ceil(maxVal / 10) * 10; // round up to next 10

        // Clear
        ctx.clearRect(0, 0, width, height);

        // Draw horizontal grid lines and Y labels
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.fillStyle = textDimColor;
        ctx.font = '500 9px Outfit';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        const gridLines = 3;
        for (let i = 0; i <= gridLines; i++) {
            const val = Math.round((yMax / gridLines) * i);
            const y = topPadding + graphHeight - (val / yMax) * graphHeight;
            
            // Draw line
            ctx.beginPath();
            ctx.moveTo(leftPadding, y);
            ctx.lineTo(width - rightPadding, y);
            ctx.stroke();

            // Draw text label
            ctx.fillText(`${val}m`, leftPadding - 8, y);
        }

        // Calculate points
        const points = [];
        const stepX = graphWidth / 6;

        for (let i = 0; i < 7; i++) {
            const x = leftPadding + i * stepX;
            const y = topPadding + graphHeight - (data[i] / yMax) * graphHeight;
            points.push({ x, y, value: data[i] });
        }

        // Draw dynamic gradient fill under the line
        if (points.length > 0) {
            ctx.beginPath();
            ctx.moveTo(points[0].x, topPadding + graphHeight);
            
            // Create smooth bezier curve path or clean lines
            for (let i = 0; i < points.length; i++) {
                ctx.lineTo(points[i].x, points[i].y);
            }
            
            ctx.lineTo(points[points.length - 1].x, topPadding + graphHeight);
            ctx.closePath();

            const gradient = ctx.createLinearGradient(0, topPadding, 0, topPadding + graphHeight);
            gradient.addColorStop(0, dynamicGlowBlue);
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            ctx.fillStyle = gradient;
            ctx.fill();
        }

        // Draw Line Stroke with Neon Glow
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = dynamicAccentBlue;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Glow effect
        ctx.shadowBlur = 6;
        ctx.shadowColor = dynamicGlowBlue;
        ctx.stroke();
        
        // Reset shadow for drawing coordinates
        ctx.shadowBlur = 0;

        // Draw points data circles
        points.forEach((pt, index) => {
            // Draw outer glow circle
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 4, 0, 2 * Math.PI);
            ctx.fillStyle = dynamicAccentBlue;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 2, 0, 2 * Math.PI);
            ctx.fillStyle = '#ffffff';
            ctx.fill();

            // Label draw X-axis (day letters)
            ctx.fillStyle = index === 6 ? dynamicAccentBlue : textMutedColor; // Highlight today
            ctx.font = index === 6 ? '700 9px Outfit' : '500 9px Outfit';
            ctx.textAlign = 'center';
            ctx.fillText(labels[index], pt.x, height - bottomPadding + 14);

            // Draw value tooltip indicator above today
            if (index === 6 && pt.value > 0) {
                ctx.fillStyle = dynamicAccentBlue;
                ctx.font = '700 8px Outfit';
                ctx.fillText(`${pt.value}m`, pt.x, pt.y - 10);
            }
        });
    }


    // --- Event Receivers ---
    window.addEventListener('focusStatsUpdated', () => {
        updateStatsPanel();
        renderProductivityChart();
    });

    window.addEventListener('tasksUpdated', () => {
        updateStatsPanel();
    });

    window.addEventListener('themeChanged', () => {
        renderProductivityChart();
    });


    // Handle resize to redraw canvas properly
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            renderProductivityChart();
        }, 100);
    });

    // Toggle Weather Unit
    if (btnWeatherUnit) {
        btnWeatherUnit.addEventListener('click', () => {
            currentUnit = currentUnit === 'C' ? 'F' : 'C';
            localStorage.setItem('tacticalDashboardWeatherUnit', currentUnit);
            displayTemperature();
        });
    }

    // Toggle Weather Search Drawer
    if (btnSearchToggle) {
        btnSearchToggle.addEventListener('click', () => {
            weatherInfo.classList.add('hidden');
            weatherSearchDrawer.classList.remove('hidden');
            weatherSearchInput.focus();
        });
    }

    // Cancel Weather Search
    if (btnSearchCancel) {
        btnSearchCancel.addEventListener('click', () => {
            weatherSearchDrawer.classList.add('hidden');
            weatherInfo.classList.remove('hidden');
            weatherSearchInput.value = '';
        });
    }

    // Submit Weather Search (Click)
    if (btnSearch) {
        btnSearch.addEventListener('click', () => {
            searchCity(weatherSearchInput.value.trim());
        });
    }

    // Submit Weather Search (Enter Key)
    if (weatherSearchInput) {
        weatherSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchCity(weatherSearchInput.value.trim());
            }
        });
    }

    // Restore GPS Auto Location
    if (btnWeatherGps) {
        btnWeatherGps.addEventListener('click', () => {
            btnWeatherGps.classList.add('hidden');
            fetchWeather();
        });
    }

    // Initial Render calls
    updateStatsPanel();
    fetchWeather();
    setTimeout(renderProductivityChart, 100); // Wait briefly for layout sizes to stabilize

    // Refresh weather every 30 minutes
    setInterval(fetchWeather, 30 * 60 * 1000);
});



