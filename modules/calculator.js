// --- Calculator Module ---

document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const calcExpr = document.getElementById('calc-expression');
    const calcRes = document.getElementById('calc-result');
    const buttonsGrid = document.querySelector('.calc-buttons-grid');
    const historyToggle = document.getElementById('btn-toggle-history');
    const historyDrawer = document.getElementById('calc-history-drawer');
    const historyList = document.getElementById('calc-history-list');
    const clearHistoryBtn = document.getElementById('btn-clear-history');

    // --- State ---
    let expression = '';
    let lastResult = null;
    let didJustCalculate = false;
    let history = JSON.parse(localStorage.getItem('tacticalCalculatorHistory')) || [];

    // --- Safe Math Evaluator ---
    function evaluateExpression(expr) {
        // Sanitize: allow only numbers, decimal, brackets, basic math operators and percentage
        const sanitized = expr.replace(/[^0-9+\-*/%.()]/g, '');
        
        if (!sanitized) return 0;
        
        try {
            // Safe evaluation using Function
            const result = Function(`"use strict"; return (${sanitized})`)();
            
            // Format result: limit decimal places to 6 if fractional
            if (Number.isNaN(result)) return 'Error';
            if (!Number.isFinite(result)) return 'Infinity';
            
            if (Number.isInteger(result)) {
                return result;
            } else {
                return parseFloat(result.toFixed(6));
            }
        } catch (e) {
            return 'Error';
        }
    }

    // --- UI Rendering ---
    function updateDisplay() {
        // Display divide and multiply using readable symbols
        const formattedExpr = expression
            .replace(/\*/g, ' &times; ')
            .replace(/\//g, ' &divide; ')
            .replace(/\+/g, ' + ')
            .replace(/-/g, ' &minus; ')
            .replace(/%/g, ' % ');
            
        calcExpr.innerHTML = formattedExpr;
        
        // Show last result or current expression evaluation preview
        if (expression === '') {
            calcRes.textContent = lastResult !== null ? lastResult : '0';
        } else {
            // Optional: Live preview (if not just evaluated)
            if (!didJustCalculate) {
                const liveEval = evaluateExpression(expression);
                if (liveEval !== 'Error') {
                    calcRes.textContent = liveEval;
                }
            }
        }
    }

    function renderHistory() {
        historyList.innerHTML = '';
        
        if (history.length === 0) {
            historyList.innerHTML = '<li class="empty-history">No calculations logged.</li>';
            return;
        }

        history.forEach((item, index) => {
            const li = document.createElement('li');
            li.className = 'calc-history-item';
            
            const formattedExpr = item.expr
                .replace(/\*/g, '&times;')
                .replace(/\//g, '&divide;')
                .replace(/-/g, '&minus;');

            li.innerHTML = `
                <span class="history-expr">${formattedExpr} =</span>
                <span class="history-res">${item.res}</span>
            `;
            
            // Re-apply history equation on click
            li.addEventListener('click', () => {
                expression = item.expr;
                didJustCalculate = false;
                updateDisplay();
                historyDrawer.classList.add('hidden');
            });

            historyList.appendChild(li);
        });
    }

    function saveHistory(expr, res) {
        // Limit history logs to 50 items
        history.unshift({ expr, res });
        if (history.length > 50) history.pop();
        
        localStorage.setItem('tacticalCalculatorHistory', JSON.stringify(history));
        renderHistory();
    }

    // --- Inputs Processing ---
    function handleInput(type, value) {
        if (type === 'number') {
            if (didJustCalculate) {
                expression = '';
                didJustCalculate = false;
            }
            // Prevent multiple decimals in a single number sequence
            if (value === '.') {
                const parts = expression.split(/[\+\-\*\/%]/);
                const lastPart = parts[parts.length - 1];
                if (lastPart.includes('.')) return;
            }
            expression += value;
        } 
        
        else if (type === 'operator') {
            if (didJustCalculate && lastResult !== null) {
                expression = String(lastResult);
                didJustCalculate = false;
            }
            
            // Prevent two consecutive operators
            const lastChar = expression.trim().slice(-1);
            if (['+', '-', '*', '/', '%'].includes(lastChar)) {
                // Swap operator
                expression = expression.slice(0, -1) + value;
            } else if (expression !== '' || value === '-') {
                expression += value;
            }
        } 
        
        else if (type === 'clear') {
            expression = '';
            lastResult = null;
            didJustCalculate = false;
        } 
        
        else if (type === 'backspace') {
            if (didJustCalculate) {
                expression = '';
                didJustCalculate = false;
            } else {
                expression = expression.slice(0, -1);
            }
        } 
        
        else if (type === 'calculate') {
            if (expression === '') return;
            
            const result = evaluateExpression(expression);
            calcRes.textContent = result;
            
            if (result !== 'Error') {
                saveHistory(expression, result);
                lastResult = result;
                didJustCalculate = true;
            }
        }
        
        updateDisplay();
    }

    // --- Grid Click Handlers ---
    buttonsGrid.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-calc');
        if (!btn) return;
        
        const action = btn.getAttribute('data-action');
        const value = btn.getAttribute('data-value');
        
        handleInput(action, value);
    });

    // --- History Drawer Toggles ---
    historyToggle.addEventListener('click', () => {
        historyDrawer.classList.toggle('hidden');
        if (!historyDrawer.classList.contains('hidden')) {
            renderHistory();
        }
    });

    // Close history drawer when clicking outside it in the container
    document.addEventListener('click', (e) => {
        const module = document.getElementById('calculator-module');
        if (module && !module.contains(e.target) && !historyDrawer.classList.contains('hidden')) {
            historyDrawer.classList.add('hidden');
        }
    });

    clearHistoryBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        history = [];
        localStorage.removeItem('tacticalCalculatorHistory');
        renderHistory();
    });

    // --- Keyboard Bindings ---
    document.addEventListener('keydown', (e) => {
        // Skip if typing inside inputs
        const targetTag = e.target.tagName;
        if (targetTag === 'INPUT' || targetTag === 'SELECT' || targetTag === 'TEXTAREA' || e.target.isContentEditable) {
            return;
        }

        // Map keys to calculator actions
        const key = e.key;
        
        if (key >= '0' && key <= '9') {
            handleInput('number', key);
        } else if (key === '.') {
            handleInput('number', '.');
        } else if (key === '+' || key === '-' || key === '*' || key === '/' || key === '%') {
            handleInput('operator', key);
        } else if (key === 'Enter' || key === '=') {
            e.preventDefault();
            handleInput('calculate');
        } else if (key === 'Backspace') {
            handleInput('backspace');
        } else if (key === 'Escape') {
            handleInput('clear');
            if (!historyDrawer.classList.contains('hidden')) {
                historyDrawer.classList.add('hidden');
            }
        }
    });

    // Initial render
    updateDisplay();
});
