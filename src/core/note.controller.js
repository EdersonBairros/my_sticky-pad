/**
 * Controlador de notas — regras de negócio para operações CRUD.
 * Media a comunicação entre UI e Services.
 * @module core/note.controller
 */

let _editingId = null;
let _notesContainer = null;
let _noteCountElement = null;
/**
 * Backup da categoria original da nota em edição (rollback no Cancelar).
 * Usa um "sentinela" para diferenciar "sem categoria" (null) de "não iniciado".
 */
let _editingOriginalCategory = null;
let _hasCategoryBackup = false;

/**
 * Inicializa o controlador.
 * @param {HTMLElement} notesContainer
 * @param {HTMLElement} noteCountElement
 */
function initNoteController(notesContainer, noteCountElement) {
    _notesContainer = notesContainer;
    _noteCountElement = noteCountElement;
}

/**
 * Cria uma nova nota vazia e inicia o modo de edição.
 */
function handleAddNote() {
    if (_editingId) handleCancelEditing();
    const note = createNote();
    // Rascunho: fica só em memória. Só é persistido no `saveEditing`, quando
    // tiver conteúdo. Evita que uma nota em branco fique gravada caso o popup
    // feche antes de salvar (bug "Nota em branco").
    storageAddDraftNote(note);
    _editingId = note.id;
    renderNotes(_notesContainer, _editingId);
    updateNoteCount(_noteCountElement);
}

/**
 * Exclui uma nota.
 * @param {string} id
 */
function handleDeleteNote(id) {
    if (_editingId === id) _editingId = null;
    storageRemoveNote(id);
    renderNotes(_notesContainer, _editingId);
    updateNoteCount(_noteCountElement);
}

/**
 * Inicia o modo de edição para uma nota existente.
 * @param {string} id
 */
function startEditing(id) {
    // Ao trocar de nota em edição, confirma o conteúdo da anterior.
    if (_editingId && _editingId !== id) {
        const editor = document.querySelector('.note-editor');
        if (editor) {
            const prev = getNoteById(_editingId);
            if (prev) {
                // Sanitiza para limpar qualquer HTML colado antes de persistir.
                const html = sanitizeHtml(getEditorHTML());
                const title = getTitleValue();
                if (html === '' && title === '') {
                    // Rascunho/nota esvaziada (sem corpo e sem título): descarta em
                    // vez de gravar em branco. Corrige o bug "Nota em branco".
                    storageRemoveNote(_editingId);
                } else {
                    prev.text = html;
                    prev.title = title;
                    prev.updatedAt = new Date().toISOString();
                    storagePersist();
                }
            }
        }
    }

    // Backup da categoria original para rollback no Cancelar.
    const note = getNoteById(id);
    _editingOriginalCategory = note ? note.category : null;
    _hasCategoryBackup = true;

    _editingId = id;
    renderNotes(_notesContainer, _editingId);
}

/**
 * Salva o conteúdo editado de uma nota. A categoria alterada é confirmada aqui.
 * @param {string} id
 */
function saveEditing(id) {
    const note = getNoteById(id);
    if (!note) return;

    const html = sanitizeHtml(getEditorHTML());
    const title = getTitleValue();
    // A nota é válida se tiver corpo OU título. Só descarta se ambos vazios.
    if (html === '' && title === '') {
        handleDeleteNote(id);
        return;
    }
    note.text = html;
    note.title = title;
    // Atualiza apenas `updatedAt` — `createdAt` permanece a data real de criação.
    note.updatedAt = new Date().toISOString();
    _editingId = null;
    _editingOriginalCategory = null;
    _hasCategoryBackup = false;
    storagePersist();
    renderNotes(_notesContainer, _editingId);
    updateNoteCount(_noteCountElement);
}

/**
 * Cancela o modo de edição. Restaura a categoria original (rollback).
 * Se a nota estava vazia, exclui.
 */
function handleCancelEditing() {
    const note = getNoteById(_editingId);
    // Descarta apenas se a nota persistida estiver totalmente em branco
    // (sem corpo E sem título) — caso típico do rascunho recém-criado.
    if (note && note.text === '' && !note.title) {
        handleDeleteNote(_editingId);
        return;
    }
    if (note && _hasCategoryBackup) {
        note.category = _editingOriginalCategory;
        storagePersist();
    }
    _editingId = null;
    _editingOriginalCategory = null;
    _hasCategoryBackup = false;
    renderNotes(_notesContainer, _editingId);
}

/**
 * Limpa todas as notas (com confirmação via modal não-bloqueante).
 * @returns {Promise<void>}
 */
async function handleClearAllNotes() {
    if (getNotes().length === 0) return;
    const confirmed = await showConfirm('Limpar todos os lembretes?');
    if (!confirmed) return;
    storageClearAll();
    _editingId = null;
    renderNotes(_notesContainer, _editingId);
    updateNoteCount(_noteCountElement);
    showToast('Todas as notas foram removidas.', 'warning');
}

/**
 * Alterna a fixação (pin) de uma nota.
 *
 * Comportamento: aplica na hora e persiste (independente de salvar/cancelar).
 * - Em modo de VISUALIZAÇÃO: anima o alfinete ("cravar") e, logo depois,
 *   re-renderiza a lista para reordenar (fixadas no topo).
 * - Em modo de EDIÇÃO (a própria nota editada): NÃO re-renderiza (preservaria
 *   o texto em digitação); apenas anima e atualiza o estado do botão. A
 *   reordenação ocorre naturalmente ao salvar.
 * - Um rascunho ainda em branco não é persistido (evita o bug "nota em branco");
 *   o pin fica em memória e é gravado no save.
 * @param {string} id
 */
function togglePin(id) {
    const note = getNoteById(id);
    if (!note) return;

    note.pinned = !note.pinned;
    note.pinnedAt = note.pinned ? new Date().toISOString() : null;

    const blankDraft = (!note.text || note.text === '') && (!note.title || note.title === '');
    // Persiste em SILÊNCIO (sem callback): nós controlamos a re-renderização
    // para animar. Evita a "piscada" do placeholder no editor e o pulo seco.
    if (!blankDraft) storagePersistSilent();

    _animatePin(id);

    if (_editingId === id) {
        // Em edição: só atualiza o botão; a reordenação ocorre ao salvar.
        _setPinButtonState(id, note.pinned);
        return;
    }

    // Na listagem: deixa o "cravar" tocar e reordena com transição suave (FLIP).
    setTimeout(() => {
        if (_editingId && _editingId !== id) _syncEditingContent();
        const before = _capturePositions(_notesContainer);
        renderNotes(_notesContainer, _editingId);
        _playReorder(_notesContainer, before);
    }, 500);
}

/**
 * Toca a animação de "cravar" no(s) botão(ões) de pin da nota.
 * @private
 * @param {string} id
 */
function _animatePin(id) {
    const item = document.querySelector(`.note-item[data-id="${id}"]`);
    if (!item) return;
    item.querySelectorAll('.pin-btn').forEach(btn => {
        btn.classList.remove('tacking');
        void btn.offsetWidth; // força reflow para reiniciar a animação
        btn.classList.add('tacking');
        setTimeout(() => btn.classList.remove('tacking'), 260);
    });
}

/**
 * Atualiza o estado visual do botão de pin sem re-renderizar (usado em edição).
 * @private
 * @param {string} id
 * @param {boolean} pinned
 */
function _setPinButtonState(id, pinned) {
    const item = document.querySelector(`.note-item[data-id="${id}"]`);
    if (!item) return;
    const label = pinned ? 'Desafixar nota' : 'Fixar nota';
    item.querySelectorAll('.pin-btn').forEach(btn => {
        btn.classList.toggle('active', pinned);
        btn.title = label;
        btn.setAttribute('aria-label', label);
    });
    item.classList.toggle('pinned', pinned);
}

/**
 * Captura a posição vertical (top) de cada nota, por id — base do FLIP.
 * @private
 * @param {HTMLElement} container
 * @returns {Object<string, number>}
 */
function _capturePositions(container) {
    const map = {};
    if (!container) return map;
    container.querySelectorAll('.note-item').forEach(el => {
        map[el.dataset.id] = el.getBoundingClientRect().top;
    });
    return map;
}

/**
 * Anima cada nota da posição antiga para a nova (técnica FLIP), para a
 * reordenação por pin não acontecer num "piscar de olhos".
 * @private
 * @param {HTMLElement} container
 * @param {Object<string, number>} before - posições capturadas antes do render
 */
function _playReorder(container, before) {
    if (!container) return;
    container.querySelectorAll('.note-item').forEach(el => {
        const prevTop = before[el.dataset.id];
        if (prevTop === undefined) return;
        const delta = prevTop - el.getBoundingClientRect().top;
        if (!delta) return;
        // Inverte (coloca visualmente onde estava) e anima até a posição nova.
        el.style.transition = 'none';
        el.style.transform = `translateY(${delta}px)`;
        requestAnimationFrame(() => {
            el.style.transition = 'transform 0.32s ease';
            el.style.transform = '';
            setTimeout(() => { el.style.transition = ''; el.style.transform = ''; }, 360);
        });
    });
}

/**
 * Sincroniza o conteúdo em digitação da nota em edição para o modelo, para não
 * perdê-lo quando uma re-renderização é disparada por outra ação (ex.: pin).
 * @private
 */
function _syncEditingContent() {
    const editing = getNoteById(_editingId);
    if (!editing) return;
    if (!document.querySelector('.note-editor')) return;
    editing.text = sanitizeHtml(getEditorHTML());
    editing.title = getTitleValue();
    storagePersist();
}

/** @returns {string|null} */
function getEditingId() { return _editingId; }