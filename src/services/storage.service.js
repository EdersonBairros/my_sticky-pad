/**
 * Serviço de armazenamento local (localStorage).
 * Responsável apenas por persistir e recuperar dados.
 * NÃO manipula DOM nem chama UI.
 * @module services/storage
 */

/** @type {Array} Cache interno das notas em memória */
let _notes = [];
/** @type {Function|null} Callback para notificar mudanças */
let _onChangeCallback = null;

/**
 * Inicializa o serviço carregando dados do localStorage.
 * @param {Function} [onChange] - Callback chamado quando as notas são modificadas
 * @returns {Array} Lista de notas carregadas
 */
function initStorage(onChange) {
    _onChangeCallback = onChange || null;
    _notes = _loadNotes();
    return _notes;
}

function _loadNotes() {
    try {
        const data = localStorage.getItem(STORAGE_KEYS.NOTES);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.warn('Erro ao carregar notas:', e);
        return [];
    }
}

function _persist() {
    localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(_notes));
    if (typeof _onChangeCallback === 'function') {
        _onChangeCallback(_notes);
    }
}

function getNotes() { return _notes; }

function setNotes(newNotes) { _notes = newNotes; _persist(); }

function getNoteById(id) { return _notes.find(n => n.id === id); }

function storageAddNote(note) { _notes.unshift(note); _persist(); }

function storageRemoveNote(id) { _notes = _notes.filter(n => n.id !== id); _persist(); }

function storageUpdateNote(id, updates) {
    const note = _notes.find(n => n.id === id);
    if (note) { Object.assign(note, updates); _persist(); }
}

function storagePersist() { _persist(); }

function storageClearAll() { _notes = []; _persist(); }

function updateNote(id, updates) {
    const note = _notes.find(n => n.id === id);
    if (note) { Object.assign(note, updates); storagePersist(); }
}

function loadPopupSize() {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.SIZE);
        if (saved) {
            const size = JSON.parse(saved);
            document.body.style.width = size.width + 'px';
            document.body.style.height = size.height + 'px';
        }
    } catch (e) {}
}

function savePopupSize(width, height) {
    localStorage.setItem(STORAGE_KEYS.SIZE, JSON.stringify({ width, height }));
}