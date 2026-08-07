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

/** @returns {string|null} */
function getEditingId() { return _editingId; }