// ─── GLOBAL STATE & STORAGE ─────────────────
const STORAGE_KEY = 'memoria_data';
let state = loadState();
let currentView = 'home';
let activeProjectId = null;
let newProjectTemp = { type: null, method: null };

function loadState() { /* … unchanged … */ }
function saveState(state) { /* … unchanged … */ }
function saveAndRefresh() { /* … unchanged … */ }

// ─── THEME ──────────────────────────────────
function applyTheme(theme) { /* … unchanged … */ }
function cycleTheme() { /* … unchanged … */ }

// ─── NAVIGATION ─────────────────────────────
function navigateTo(view) { /* … unchanged … */ }
function openProject(projectId) { /* … unchanged … */ }
function exitProject() { /* … unchanged … */ }

// ─── PROJECT GRID & HELPERS ─────────────────
function renderProjectGrid() { /* … unchanged … */ }
function getTypeSymbol(type) { /* … unchanged … */ }
function getItemCount(project) {
    if (project.type === 'vocabulary') return (project.words || []).length;
    if (project.type === 'script') return (project.lines || []).filter(l => l.type === 'dialogue').length;
    if (project.type === 'poem') return (project.stanzas || []).flat().filter(l => l.trim()).length;
    return 0;
}
function deleteProject(id) { /* … unchanged … */ }

// ─── NEW PROJECT POPUP ──────────────────────
function openNewProjectPopup() { /* … unchanged … */ }
function closeNewProjectPopup() { /* … unchanged … */ }
function selectProjectType(type, el) { /* … unchanged … */ }
function goBackToStep1() { /* … unchanged … */ }
function selectLearningMethod(method, el) { /* … unchanged … */ }
function createProject() { /* … unchanged … */ }

// ─── PROJECT VIEW ───────────────────────────
function getActiveProject() { return state.projects.find(p => p.id === activeProjectId); }

function renderProjectView() {
    const project = getActiveProject();
    if (!project) { exitProject(); return; }
    document.getElementById('pvTitle').textContent = project.title;
    document.getElementById('pvBadge').textContent = project.type;
    const body = document.getElementById('pvBody');
    body.innerHTML = '';
    if (project.type === 'poem') renderPoemView(body, project);
    else if (project.type === 'script') renderScriptView(body, project);
    else if (project.type === 'vocabulary') renderVocabView(body, project);
}

// ── Poem View ──────────────────────────────
function renderPoemView(body, project) { /* … unchanged … */ }
function openAddPoemModal() { /* … unchanged … */ }
function savePoemContent() { /* … unchanged … */ }
function deleteStanza(index) { /* … unchanged … */ }

// ── Script View (IMPROVED PARSING + CHARACTER FILTER + STUDY) ──
function renderScriptView(body, project) {
    const lines = project.lines || [];
    const dialogueLines = lines.filter(l => l.type === 'dialogue');
    const characters = [...new Set(dialogueLines.map(l => l.role))].filter(Boolean);

    let html = '';
    // Character filter & practice button
    html += `<div class="character-filter-row">
        <label style="font-size:0.75rem;color:var(--text-muted);">Character:</label>
        <select id="charFilterSelect" onchange="filterScriptLines()">
            <option value="">All Characters</option>
            ${characters.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join('')}
        </select>
        <button class="btn-practice" onclick="startScriptPractice()">Practice Selected</button>
    </div>`;

    if (lines.length === 0) {
        html += `<div class="add-first-card" onclick="openAddScriptModal()"> … add first lines … </div>`;
    } else {
        lines.forEach((line, i) => {
            const isDialogue = line.type === 'dialogue';
            const moodInfo = getMoodInfo(line.mood);
            const style = moodInfo ? `border-left: 4px solid ${moodInfo.color};` : '';
            html += `<div class="content-item fade-in" data-role="${escapeHTML(line.role || '')}" data-type="${line.type}" style="${style}">
                <div class="item-header">
                    ${isDialogue ? `<span class="role-tag">${escapeHTML(line.role || 'Unknown')} ${moodInfo ? '<span class="mood-indicator" style="background:' + moodInfo.color + ';" title="' + escapeHTML(moodInfo.name) + '"></span>' : ''}</span>` : `<span class="role-tag" style="opacity:0.6;">Stage Direction</span>`}
                    <button class="btn-small-delete" onclick="deleteScriptLine(${i})">Remove</button>
                </div>
                <p class="${isDialogue ? 'item-text' : 'stage-direction'}">${escapeHTML(line.text)}</p>
                ${isDialogue ? `<div class="item-actions">
                    <select class="mood-select" onchange="setLineMood(${i}, this.value)">
                        <option value="">— No Mood —</option>
                        ${(state.settings.customMoods || []).map(m => `<option value="${escapeHTML(m.name)}" ${line.mood === m.name ? 'selected' : ''}>${escapeHTML(m.name)}</option>`).join('')}
                    </select>
                </div>` : ''}
            </div>`;
        });
        html += `<button class="btn-add-word" style="margin-top:0.5rem;" onclick="openAddScriptModal()">+ Add Lines</button>`;
    }
    body.innerHTML = html;

    // Restore saved filter value
    const savedChar = project._charFilter || '';
    const select = document.getElementById('charFilterSelect');
    if (select) { select.value = savedChar; filterScriptLines(); }
}

function filterScriptLines() {
    const select = document.getElementById('charFilterSelect');
    if (!select) return;
    const char = select.value;
    const project = getActiveProject();
    if (project) project._charFilter = char;
    const items = document.querySelectorAll('#pvBody .content-item');
    items.forEach(item => {
        const role = item.getAttribute('data-role');
        const type = item.getAttribute('data-type');
        if (!char || type !== 'dialogue' || role === char) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

function openAddScriptModal() {
    const project = getActiveProject();
    if (!project) return;
    const overlay = document.getElementById('inputModalOverlay');
    const modal = document.getElementById('inputModal');
    modal.innerHTML = `
        <h3>Add Script Lines</h3>
        <p style="font-size:0.7rem;color:var(--text-muted);">
            Paste dialogue. Lines like <strong>HAMLET:</strong> or <strong>HAMLET.</strong> are characters.<br>
            Lines starting with <strong>(</strong> or <strong>[</strong> or all‑caps without a colon become stage directions.
        </p>
        <textarea id="scriptTextarea" rows="12" placeholder="Paste your script here..."></textarea>
        <div class="modal-actions">
            <button class="btn-cancel" onclick="closeInputModal()">Cancel</button>
            <button class="btn-confirm" onclick="saveScriptContent()">Parse & Save</button>
        </div>
    `;
    overlay.classList.add('active');
}

function saveScriptContent() {
    const project = getActiveProject();
    if (!project) return;
    const textarea = document.getElementById('scriptTextarea');
    if (!textarea || !textarea.value.trim()) { closeInputModal(); return; }
    const rawLines = textarea.value.split('\n');
    const parsed = [];
    rawLines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;
        // Stage direction heuristics
        if (/^[\(\[].*[\)\]]$/.test(trimmed) || /^[A-Z\s]{3,}$/.test(trimmed) && !trimmed.includes(':')) {
            parsed.push({ type: 'stage_direction', role: '', text: trimmed, mood: null });
            return;
        }
        // Character line detection (Name: or Name.)
        const match = trimmed.match(/^([\w\s\-\.]+?)[:\.]\s+(.*)/);
        if (match) {
            parsed.push({ type: 'dialogue', role: match[1].trim(), text: match[2].trim(), mood: null });
            return;
        }
        // Fallback as stage direction
        parsed.push({ type: 'stage_direction', role: '', text: trimmed, mood: null });
    });
    if (!project.lines) project.lines = [];
    project.lines.push(...parsed);
    saveState(state);
    closeInputModal();
    renderProjectView();
    showToast(`${parsed.length} item(s) added.`);
}

function deleteScriptLine(index) { /* … unchanged … */ }
function setLineMood(index, moodName) { /* … unchanged … */ }

// ── Study Mode for Scripts ──────────────────
function startScriptPractice() {
    const project = getActiveProject();
    if (!project || project.type !== 'script') return;
    const select = document.getElementById('charFilterSelect');
    const char = select ? select.value : '';
    // Gather lines to practice: only dialogue lines of the selected character (or all if none)
    const lines = (project.lines || []).filter(l => l.type === 'dialogue' && (!char || l.role === char));
    if (lines.length === 0) { showToast('No lines to practice.'); return; }
    const method = project.learningMethod;
    const overlay = document.getElementById('studyModalOverlay');
    const modal = document.getElementById('studyModal');
    let index = 0;
    let showAnswer = false;

    function renderQuestion() {
        const line = lines[index];
        modal.innerHTML = `
            <h3>Practice – ${escapeHTML(char || 'All')} (${method})</h3>
            <p style="color:var(--text-muted); font-size:0.8rem;">${index+1} / ${lines.length}</p>
            <div class="content-item" style="margin:1rem 0;">
                <span class="role-tag">${escapeHTML(line.role)}</span>
                ${showAnswer ? `<p class="item-text">${escapeHTML(line.text)}</p>` : `<p class="item-text" style="filter:blur(5px); user-select:none;">${escapeHTML(line.text)}</p>`}
            </div>
            <div class="modal-actions">
                <button class="btn-cancel" onclick="closeStudyModal()">End</button>
                ${!showAnswer ? `<button class="btn-confirm" onclick="revealAnswer()">Reveal</button>` : ''}
                ${showAnswer ? `<button class="btn-confirm" onclick="nextQuestion()">Next</button>` : ''}
            </div>
        `;
    }

    window.revealAnswer = function() { showAnswer = true; renderQuestion(); };
    window.nextQuestion = function() {
        if (index < lines.length - 1) { index++; showAnswer = false; renderQuestion(); }
        else { closeStudyModal(); showToast('Practice complete!'); }
    };
    window.closeStudyModal = function() { overlay.classList.remove('active'); };
    renderQuestion();
    overlay.classList.add('active');
}

// ── Vocabulary View (unchanged but with study button added) ──
function renderVocabView(body, project) {
    const words = project.words || [];
    let html = '';
    if (words.length === 0) {
        html = `<div class="add-first-card" onclick="openAddWordModal()">… add first word …</div>
                <button class="btn-add-word" onclick="openAddWordModal()">+ Add Word</button>`;
    } else {
        html = words.map((w,i) => `…`).join('');
        html += `<button class="btn-add-word" onclick="openAddWordModal()">+ Add Word</button>
                 <button class="btn-practice" style="margin-left:0.5rem;" onclick="startVocabPractice()">Practice Vocabulary</button>`;
    }
    body.innerHTML = html;
}

function startVocabPractice() {
    const project = getActiveProject();
    if (!project || project.type !== 'vocabulary') return;
    const words = project.words || [];
    if (!words.length) { showToast('No words to practice.'); return; }
    const overlay = document.getElementById('studyModalOverlay');
    const modal = document.getElementById('studyModal');
    let index = 0, showDef = false;
    function render() {
        const w = words[index];
        modal.innerHTML = `
            <h3>Vocab Practice – ${project.title}</h3>
            <p style="color:var(--text-muted);">${index+1}/${words.length}</p>
            <div style="font-size:1.5rem; font-weight:700; margin:1rem 0;">${escapeHTML(w.word)}</div>
            ${showDef ? `<p>${escapeHTML(w.definition || 'No definition')}</p>` : `<p style="filter:blur(5px);">${escapeHTML(w.definition || '...')}</p>`}
            <div class="modal-actions">
                <button class="btn-cancel" onclick="closeStudyModal()">End</button>
                ${!showDef ? `<button class="btn-confirm" onclick="revealDef()">Reveal</button>` : `<button class="btn-confirm" onclick="nextVocab()">Next</button>`}
            </div>`;
    }
    window.revealDef = ()=> { showDef = true; render(); };
    window.nextVocab = ()=> { if(index<words.length-1){ index++; showDef=false; render(); } else { closeStudyModal(); showToast('Practice done!'); }};
    window.closeStudyModal = ()=> overlay.classList.remove('active');
    render();
    overlay.classList.add('active');
}

// Poem study (optional, similar pattern)
function startPoemPractice() {
    const project = getActiveProject();
    if (!project) return;
    const lines = (project.stanzas || []).flat().filter(l => l.trim());
    if (!lines.length) { showToast('No lines to practice.'); return; }
    // Simple line-by-line recall
    const overlay = document.getElementById('studyModalOverlay');
    const modal = document.getElementById('studyModal');
    let index = 0, showLine = false;
    function render() {
        modal.innerHTML = `
            <h3>Poem Practice</h3>
            <p>${index+1}/${lines.length}</p>
            <p style="font-style:italic; color:var(--text-muted);">Previous line: ${index>0 ? escapeHTML(lines[index-1]) : '...'}</p>
            ${showLine ? `<p class="item-text">${escapeHTML(lines[index])}</p>` : `<p style="filter:blur(5px);">${escapeHTML(lines[index])}</p>`}
            <div class="modal-actions">
                <button class="btn-cancel" onclick="closeStudyModal()">End</button>
                ${!showLine ? `<button class="btn-confirm" onclick="revealLine()">Reveal</button>` : `<button class="btn-confirm" onclick="nextLine()">Next</button>`}
            </div>`;
    }
    window.revealLine = ()=> { showLine = true; render(); };
    window.nextLine = ()=> { if(index<lines.length-1){ index++; showLine=false; render(); } else { closeStudyModal(); showToast('Practice complete!'); }};
    window.closeStudyModal = ()=> overlay.classList.remove('active');
    render();
    overlay.classList.add('active');
}

// Add practice button to poem view (inside renderPoemView, after stanzas)
// We'll modify renderPoemView to include a practice button when there is content.

// ── Settings & Moods ────────────────────────
function renderSettingsMoods() { /* … unchanged … */ }
function updateMood(index, field, value) { /* … unchanged … */ }
function removeMood(index) { /* … unchanged … */ }
function addMoodRow() { /* … unchanged … */ }

// ── Input Modal helpers ─────────────────────
function closeInputModal() { document.getElementById('inputModalOverlay').classList.remove('active'); }
document.getElementById('inputModalOverlay').addEventListener('click', function(e){ if(e.target===this) closeInputModal(); });
document.getElementById('studyModalOverlay').addEventListener('click', function(e){ if(e.target===this) closeStudyModal(); });

// ── Toast ───────────────────────────────────
function showToast(msg) { /* … unchanged … */ }

// ── Init ────────────────────────────────────
function init() { applyTheme(state.settings.theme); navigateTo('home'); updateThemeDot(); }
init();
