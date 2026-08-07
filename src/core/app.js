/**
 * Bootstrap da aplicação — orquestra a inicialização de todos os módulos.
 * @module core/app
 */

function bootstrap() {
    const $ = {
        notesContainer: document.getElementById('notesContainer'),
        addNoteBtn: document.getElementById('addNoteBtn'),
        clearAllBtn: document.getElementById('clearAllBtn'),
        optionsBtn: document.getElementById('optionsBtn'),
        optionsMenu: document.getElementById('optionsMenu'),
        exportMenuItem: document.getElementById('exportMenuItem'),
        importMenuItem: document.getElementById('importMenuItem'),
        importFileInput: document.getElementById('importFileInput'),
        noteCount: document.getElementById('noteCount')
    };

    initStorage(() => {
        renderNotes($.notesContainer, getEditingId());
        updateNoteCount($.noteCount);
    });
    initCategories();
    initNoteController($.notesContainer, $.noteCount);
    initResize();

    initOptionsMenu({
        optionsBtn: $.optionsBtn,
        optionsMenu: $.optionsMenu,
        exportMenuItem: $.exportMenuItem,
        importMenuItem: $.importMenuItem,
        importFileInput: $.importFileInput,
        notesContainer: $.notesContainer
    });

    $.addNoteBtn.addEventListener('click', () => handleAddNote());
    $.clearAllBtn.addEventListener('click', () => handleClearAllNotes());

    _initActionDispatcher($.notesContainer);
    _initToolbarDispatcher($.notesContainer);
    _initEmojiDispatchers($.notesContainer);
    _initGlobalCloseDispatchers();
    _initCategoryDispatchers();
    _initEditorEvents();
    _initHexKeyHandler($.notesContainer);
    _initToolbarStateUpdaters($.notesContainer);

    renderNotes($.notesContainer, getEditingId());
    updateNoteCount($.noteCount);
}

// === Dispatchers de eventos ===

function _initActionDispatcher(container) {
    container.addEventListener('click', e => {
        const target = e.target.closest('[data-action]');
        if (!target) return;
        const item = target.closest('.note-item');
        if (!item) return;
        const id = item.dataset.id;

        switch (target.dataset.action) {
            case 'edit': startEditing(id); break;
            case 'delete': handleDeleteNote(id); break;
            case 'save': saveEditing(id); break;
            case 'cancel': handleCancelEditing(); break;
            case 'emoji-toggle': _toggleEmojiPicker(item, target); break;
            case 'color-toggle': _toggleColorPicker(item, target); break;
            case 'set-color': if (target.dataset.color) applyColor(id, target.dataset.color); break;
            case 'toggle-custom': _toggleCustomColor(item); break;
            case 'apply-hex': _applyHexInput(item, id); break;
            case 'category-toggle':
                // Toggle: se o modal já está aberto, fecha; senão, abre.
                if (document.querySelector('.category-modal')) {
                    closeCategoryModal();
                } else {
                    openCategoryModal(id, item);
                }
                break;
        }
    });
}

function _initToolbarDispatcher(container) {
    container.addEventListener('click', e => {
        const btn = e.target.closest('.format-btn');
        if (!btn) return;
        const cmd = FORMAT_CMD_MAP[btn.dataset.cmd];
        if (cmd) { e.preventDefault(); execFormat(cmd); updateToolbarState(); }
    });
}

function _initEmojiDispatchers(container) {
    container.addEventListener('click', e => {
        const catBtn = e.target.closest('.emoji-cat-btn');
        if (catBtn) {
            const picker = catBtn.closest('.emoji-picker');
            if (picker) switchEmojiCategory(picker, parseInt(catBtn.dataset.catIndex));
            return;
        }
        const emojiBtn = e.target.closest('.emoji-item');
        if (emojiBtn && emojiBtn.dataset.emoji) {
            emojiClicked(emojiBtn.dataset.emoji);
            const ed = document.querySelector('.note-editor');
            if (ed) ed.focus();
        }
    });
}

/*
 * NOTA: os eventos de categoria escutam no `document` (e não no container)
 * porque o modal foi movido para o `document.body` para usar position:fixed
 * (evita ser cortado pelo overflow do container de notas).
 */
function _initCategoryDispatchers() {
    // Seletor de categoria (radio)
    document.addEventListener('change', e => {
        const radio = e.target.closest('input[data-action="category-select"]');
        if (radio) {
            selectCategory(radio.value);
        }
    });

    // Cliques dentro do modal (adicionar, remover, desfazer)
    document.addEventListener('click', e => {
        const target = e.target.closest('[data-action]');
        if (!target) return;

        switch (target.dataset.action) {
            case 'category-add': {
                const modal = target.closest('.category-modal');
                const input = modal ? modal.querySelector('.category-input') : null;
                if (input) addCategoryFromInput(input);
                break;
            }
            case 'category-remove': {
                const option = target.closest('.category-option');
                const nameEl = option ? option.querySelector('.category-name') : null;
                if (nameEl) removeCategory(nameEl.textContent);
                break;
            }
            case 'category-undo': {
                undoRemoveCategory(target.dataset.categoryName);
                break;
            }
        }
    });

    // Enter no input de categoria
    document.addEventListener('keydown', e => {
        const input = e.target.closest('.category-input');
        if (input && e.key === 'Enter') {
            e.preventDefault();
            addCategoryFromInput(input);
        }
    });
}

function _initGlobalCloseDispatchers() {
    document.addEventListener('click', e => {
        if (!e.target.closest('.emoji-picker') && !e.target.closest('.emoji-btn')) closeEmojiPicker();
        if (!e.target.closest('.color-picker-dropdown') && !e.target.closest('.color-btn')) closeColorPickers();
        if (!e.target.closest('.category-modal') && !e.target.closest('[data-action="category-toggle"]')) closeCategoryModal();
    });
}

function _initEditorEvents() {
    bindEditorKeyboardEvents(
        id => saveEditing(id),
        () => handleCancelEditing()
    );
}

function _initHexKeyHandler(container) {
    container.addEventListener('keydown', e => {
        const input = e.target.closest('.color-hex-input');
        if (!input || e.key !== 'Enter') return;
        e.preventDefault();
        const item = input.closest('.note-item');
        if (!item) return;
        let hex = input.value.trim();
        if (hex && !hex.startsWith('#')) hex = '#' + hex;
        if (isValidHex(hex)) {
            applyColor(item.dataset.id, hex);
        } else {
            input.style.borderColor = '#f44336';
            setTimeout(() => input.style.borderColor = '#ddd', 1500);
        }
    });
}

function _initToolbarStateUpdaters(container) {
    container.addEventListener('mouseup', e => {
        if (e.target.closest('.note-editor')) setTimeout(updateToolbarState, 10);
    });
    container.addEventListener('keyup', e => {
        if (e.target.closest('.note-editor')) updateToolbarState();
    });
}

// === Helpers de UI inline ===

function _toggleEmojiPicker(item, btn) {
    const picker = item.querySelector('.emoji-picker');
    if (!picker) return;
    closeColorPickers();
    const open = picker.classList.toggle('open');
    btn.classList.toggle('active', open);
    if (open) positionEmojiPicker(picker, item.closest('.notes-container') || document.querySelector('.notes-container'));
}

function _toggleColorPicker(item, btn) {
    const dd = item.querySelector('.color-picker-dropdown');
    if (!dd) return;
    closeEmojiPicker();
    const open = dd.classList.toggle('open');
    btn.classList.toggle('active', open);
}

function _toggleCustomColor(item) {
    const section = item.querySelector('.color-custom-section');
    if (!section) return;
    const visible = section.style.display !== 'none';
    section.style.display = visible ? 'none' : 'block';
    if (!visible) {
        const canvas = section.querySelector('.color-spectrum-canvas');
        if (canvas) initGradientCanvas(canvas);
        const input = section.querySelector('.color-hex-input');
        if (input) setTimeout(() => input.focus(), 50);
    }
}

function _applyHexInput(item, id) {
    const input = item.querySelector('.color-hex-input');
    if (!input) return;
    let hex = input.value.trim();
    if (hex && !hex.startsWith('#')) hex = '#' + hex;
    if (isValidHex(hex)) applyColor(id, hex);
}