// --- Task Manager Module ---

document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const taskInput = document.getElementById('task-input');
    const tagSelect = document.getElementById('task-tag-select');
    const btnAddTask = document.getElementById('btn-add-task');
    const taskList = document.getElementById('task-list');
    const filterBtns = document.querySelectorAll('.filter-btn');

    // --- State ---
    let tasks = JSON.parse(localStorage.getItem('tacticalTasksData')) || [];
    let currentFilter = 'all'; // 'all', 'active', 'completed'

    // --- HTML Escaping for XSS Prevention ---
    function escapeHTML(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // --- State Persistence ---
    function saveTasks() {
        localStorage.setItem('tacticalTasksData', JSON.stringify(tasks));
        // Dispatch custom event to notify other modules (like Analytics)
        window.dispatchEvent(new CustomEvent('tasksUpdated'));
    }

    // --- Task Rendering ---
    function renderTasks() {
        taskList.innerHTML = '';
        
        // Filter tasks
        const filteredTasks = tasks.filter(task => {
            if (currentFilter === 'active') return !task.completed;
            if (currentFilter === 'completed') return task.completed;
            return true;
        });

        if (filteredTasks.length === 0) {
            const emptyLi = document.createElement('li');
            emptyLi.className = 'empty-task-message';
            emptyLi.textContent = currentFilter === 'all' 
                ? 'No tasks created yet. Get started!' 
                : `No ${currentFilter} tasks.`;
            taskList.appendChild(emptyLi);
            return;
        }

        filteredTasks.forEach((task, index) => {
            // Find actual index in original tasks array
            const actualIndex = tasks.indexOf(task);
            
            const li = document.createElement('li');
            li.className = `task-item ${task.completed ? 'completed' : ''}`;
            li.setAttribute('data-index', actualIndex);

            const tagClass = task.tag ? task.tag.toLowerCase() : 'work';
            const escapedText = escapeHTML(task.text);

            li.innerHTML = `
                <div class="task-main">
                    <div class="task-checkbox">
                        ${task.completed ? '<i class="fa-solid fa-check"></i>' : ''}
                    </div>
                    <div class="task-text-container">
                        <span class="task-text">${escapedText}</span>
                        <span class="task-tag ${tagClass}">${task.tag || 'Work'}</span>
                    </div>
                    <input type="text" class="task-item-edit" value="${escapedText}">
                </div>
                <div class="task-actions">
                    <button class="task-del-btn" title="Delete Task">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            `;

            taskList.appendChild(li);
        });
    }

    // --- Task Add/Edit Actions ---
    function addTask() {
        const text = taskInput.value.trim();
        const tag = tagSelect.value;
        
        if (text) {
            tasks.push({
                text,
                tag,
                completed: false,
                createdAt: new Date().toISOString()
            });
            taskInput.value = '';
            saveTasks();
            renderTasks();
        }
    }

    function toggleTaskComplete(index) {
        tasks[index].completed = !tasks[index].completed;
        saveTasks();
        renderTasks();
    }

    function deleteTask(index) {
        tasks.splice(index, 1);
        saveTasks();
        renderTasks();
    }

    function startEditing(li) {
        li.classList.add('editing');
        const editInput = li.querySelector('.task-item-edit');
        editInput.focus();
        // Move cursor to end of text
        const val = editInput.value;
        editInput.value = '';
        editInput.value = val;
    }

    function finishEditing(li, index) {
        if (!li.classList.contains('editing')) return;
        
        const editInput = li.querySelector('.task-item-edit');
        const newText = editInput.value.trim();
        
        if (newText) {
            tasks[index].text = newText;
            saveTasks();
        } else {
            // If empty, delete it
            tasks.splice(index, 1);
            saveTasks();
        }
        
        li.classList.remove('editing');
        renderTasks();
    }

    function cancelEditing(li) {
        li.classList.remove('editing');
        renderTasks();
    }

    // --- Event Delegation & Handlers ---
    taskList.addEventListener('click', (e) => {
        const li = e.target.closest('.task-item');
        if (!li) return;
        
        const index = parseInt(li.getAttribute('data-index'), 10);
        
        // Delete button click
        if (e.target.closest('.task-del-btn')) {
            deleteTask(index);
            return;
        }

        // Checkbox/Text click to toggle (avoid triggering when clicking the edit input)
        if (e.target.closest('.task-main') && !e.target.classList.contains('task-item-edit')) {
            toggleTaskComplete(index);
        }
    });

    // Double click to edit
    taskList.addEventListener('dblclick', (e) => {
        const li = e.target.closest('.task-item');
        if (!li) return;
        
        // Only trigger edit on the main task container, not input itself
        if (e.target.closest('.task-main') && !e.target.classList.contains('task-item-edit') && !li.classList.contains('completed')) {
            startEditing(li);
        }
    });

    // Handle Edit key presses
    taskList.addEventListener('keydown', (e) => {
        const li = e.target.closest('.task-item');
        if (!li) return;
        
        const index = parseInt(li.getAttribute('data-index'), 10);
        
        if (e.key === 'Enter') {
            finishEditing(li, index);
        } else if (e.key === 'Escape') {
            cancelEditing(li);
        }
    });

    // Blur to finish editing
    taskList.addEventListener('focusout', (e) => {
        if (e.target.classList.contains('task-item-edit')) {
            const li = e.target.closest('.task-item');
            if (li) {
                const index = parseInt(li.getAttribute('data-index'), 10);
                // Wrap in timeout to check if focus went to another elements or escape was pressed
                setTimeout(() => {
                    finishEditing(li, index);
                }, 100);
            }
        }
    });

    // Add Task Handlers
    btnAddTask.addEventListener('click', addTask);
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask();
    });

    // Filter Buttons Handlers
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.getAttribute('data-filter');
            renderTasks();
        });
    });

    // Initial render
    renderTasks();
});
