/**
 * Bootstrap da aplicação — orquestra a inicialização de todos os módulos.
 * @module core/app
 */

async function bootstrap() {
    const $ = {
        notesContainer: document.getElementById('notesContainer'),
        addNoteBtn: document.getElementById('addNoteBtn'),
        clearAllBtn: document.getElementById('clearAllBtn'),
        optionsBtn: document.getElementById('optionsBtn'),
        optionsMenu: document.getElementById('optionsMenu'),
        exportMenuItem: document.getElementById('exportMenuItem'),
        importMenuItem: document.getElementById('importMenuItem'),
        importFileInput: document.getElementById('importFileInput'),
        reportBugMenuItem: document.getElementById('reportBugMenuItem'),
        openWindowBtn: document.getElementById('openWindowBtn'),
        supportBtn: document.getElementById('supportBtn'),
        noteCount: document.getElementById('noteCount'),
        searchInput: document.getElementById('searchInput'),
        searchClearBtn: document.getElementById('searchClearBtn'),
        backBtn: document.getElementById('backBtn'),
        headerTitle: document.getElementById('headerTitle'),
        headerLogo: document.getElementById('headerLogo'),
        headerActions: document.getElementById('headerActions'),
        archiveBoxBtn: document.getElementById('archiveBoxBtn'),
        themeToggle: document.getElementById('themeToggle')
    };

    // O armazenamento é assíncrono (chrome.storage.local). Carregamos notas,
    // categorias e favoritos EM PARALELO (Promise.all) para a tela abrir mais
    // rápido — em vez de aguardar as três leituras em sequência.
    await Promise.all([
        initStorage(() => {
            renderNotes($.notesContainer, getEditingId());
            updateNoteCount($.noteCount);
        }),
        initCategories(),
        initFavoriteEmojis()
    ]);

    // Mantém esta cópia sincronizada com outras abertas ao mesmo tempo
    // (popup da barra + janela flutuante), evitando sobrescrita/perda de nota.
    initStorageSync();

    // Limpeza defensiva: remove notas em branco herdadas de versões anteriores
    // ao fix do bug "Nota em branco".
    pruneBlankNotes();

    initNoteController($.notesContainer, $.noteCount);
    initResize();

    initOptionsMenu({
        optionsBtn: $.optionsBtn,
        optionsMenu: $.optionsMenu,
        exportMenuItem: $.exportMenuItem,
        importMenuItem: $.importMenuItem,
        importFileInput: $.importFileInput,
        reportBugMenuItem: $.reportBugMenuItem,
        notesContainer: $.notesContainer
    });

    initSearch({
        input: $.searchInput,
        clearBtn: $.searchClearBtn,
        notesContainer: $.notesContainer
    });

    initViews({
        archiveBoxBtn: $.archiveBoxBtn,
        backBtn: $.backBtn,
        headerTitle: $.headerTitle,
        headerLogo: $.headerLogo,
        headerActions: $.headerActions,
        clearAllBtn: $.clearAllBtn,
        notesContainer: $.notesContainer,
        noteCount: $.noteCount
    });

    initThemeToggle($.themeToggle);

    $.addNoteBtn.addEventListener('click', () => handleAddNote());
    $.openWindowBtn.addEventListener('click', () => handleOpenInWindow());
    $.supportBtn.addEventListener('click', () => openSupportModal());
    $.clearAllBtn.addEventListener('click', () => handleClearAllNotes());

    _initButtonClickGuard();
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
            case 'archive': handleArchiveNote(id); break;
            case 'restore': handleRestoreNote(id); break;
            case 'pin-toggle': togglePin(id); break;
            case 'save': saveEditing(id); break;
            case 'cancel': handleCancelEditing(); break;
            case 'emoji-toggle': _toggleEmojiPicker(item, target); break;
            case 'color-toggle': _toggleColorPicker(item, target); break;
            case 'set-color': if (target.dataset.color) applyColor(id, target.dataset.color); break;
            case 'toggle-custom': _toggleCustomColor(item); break;
            case 'apply-hex': _applyHexInput(item, id); break;
            case 'category-toggle':
                // O icone de tag balanca (swing) + preenche de azul ao clicar.
                if (!target.classList.contains('swing')) {
                    target.classList.add('swing');
                    target.addEventListener('animationend', () => target.classList.remove('swing'), { once: true });
                }
                // Toggle: se o modal já está aberto, fecha; senão, abre.
                if (document.querySelector('.category-modal')) {
                    closeCategoryModal();
                } else {
                    openCategoryModal(id, item);
                }
                // Estado ativo: preenchido enquanto o modal estiver aberto OU a
                // nota tiver uma tag associada.
                _updateCategoryBtnState(item);
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
            // Ao selecionar, atualiza o estado ativo da tag na nota em edicao.
            const noteItem = document.querySelector(`.note-item[data-id="${_activeNoteId}"]`);
            if (noteItem) _updateCategoryBtnState(noteItem);
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
        if (!e.target.closest('.category-modal') && !e.target.closest('[data-action="category-toggle"]')) {
            closeCategoryModal();
            // Ao fechar o modal por clique fora, atualiza o estado da tag
            // (se a nota ainda esta em edicao).
            const editingItem = document.querySelector('.note-item.editing');
            if (editingItem) _updateCategoryBtnState(editingItem);
        }
    });
}

/**
 * Trava anti-duplo-clique GLOBAL: ignora cliques repetidos no MESMO botão dentro
 * de ~400ms, evitando disparar a ação/alerta duas vezes ao clicar rápido (ex.:
 * spammar o "Esvaziar" empilhava vários toasts). Roda na fase de CAPTURA, então
 * bloqueia ANTES dos handlers do botão (inclusive os delegados). Botões de
 * interação rápida (emoji e toolbar de formatação) ficam de fora de propósito.
 */
function _initButtonClickGuard() {
    document.addEventListener('click', function (e) {
        const btn = e.target.closest('button');
        if (!btn) return;
        if (btn.closest('.emoji-picker') || btn.classList.contains('format-btn')) return;
        const now = Date.now();
        if (btn._lastClickTs && now - btn._lastClickTs < 400) {
            e.stopImmediatePropagation();
            e.preventDefault();
            return;
        }
        btn._lastClickTs = now;
    }, true);
}

function _initEditorEvents() {
    bindEditorKeyboardEvents(
        id => saveEditing(id),
        () => handleCancelEditing()
    );
    bindEditorPasteGuard();
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

/**
 * Atualiza o estado ativo do icone de tag no botao de categoria.
 * O icone fica preenchido (azul) quando o modal de categorias estiver
 * aberto OU a nota tiver uma tag associada.
 * @param {HTMLElement} item - Elemento .note-item
 */
function _updateCategoryBtnState(item) {
    if (!item) return;
    const tagIcon = item.querySelector('.tag-icon');
    if (!tagIcon) return;
    const id = item.dataset.id;
    const note = getNoteById(id);
    const modalOpen = !!document.querySelector('.category-modal');
    const hasCategory = !!(note && note.category);
    tagIcon.classList.toggle('active', modalOpen || hasCategory);
}

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