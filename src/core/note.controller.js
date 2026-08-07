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
    storageAddNote(note);
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
    if (_editingId) {
        const editor = document.querySelector('.note-editor');
        if (editor && _editingId) {
            const note = getNoteById(_editingId);
            if (note) {
                note.text = getEditorHTML();
                storagePersist();
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

    const html = getEditorHTML();
    if (html === '') {
        handleDeleteNote(id);
        return;
    }
    note.text = html;
    note.createdAt = new Date().toISOString();
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
    if (note && note.text === '') {
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
 * Limpa todas as notas (com confirmação).
 */
function handleClearAllNotes() {
    if (getNotes().length === 0) return;
    if (confirm('Tem certeza que deseja limpar todos os lembretes?')) {
        storageClearAll();
        _editingId = null;
        renderNotes(_notesContainer, _editingId);
        updateNoteCount(_noteCountElement);
        showToast('Todas as notas foram removidas.', 'warning');
    }
}

/** @returns {string|null} */
function getEditingId() { return _editingId; }