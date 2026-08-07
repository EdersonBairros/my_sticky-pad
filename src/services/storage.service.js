/**
 * Serviço de armazenamento das notas e do tamanho do popup.
 *
 * Persistência via `chrome.storage.local` (ver `utils/storage.js`), com um
 * CACHE EM MEMÓRIA (`_notes`). Padrão de uso:
 *   - Carga inicial (`initStorage`) é assíncrona e deve ser aguardada no bootstrap.
 *   - Leituras (`getNotes`, `getNoteById`) são SÍNCRONAS a partir do cache.
 *   - Escritas atualizam o cache na hora e persistem em "fire-and-forget"
 *     (a UI re-renderiza a partir do cache sem esperar o disco).
 *
 * NÃO manipula DOM nem chama a UI (exceto o callback opcional de mudança).
 * @module services/storage
 */

/** @type {Array} Cache interno das notas em memória */
let _notes = [];
/** @type {Function|null} Callback para notificar mudanças */
let _onChangeCallback = null;

/**
 * Inicializa o serviço carregando dados do armazenamento.
 * @param {Function} [onChange] - Callback chamado quando as notas são modificadas
 * @returns {Promise<Array>} Lista de notas carregadas
 */
async function initStorage(onChange) {
    _onChangeCallback = onChange || null;
    _notes = await _loadNotes();
    return _notes;
}

async function _loadNotes() {
    try {
        const data = await storageGet(STORAGE_KEYS.NOTES);
        return Array.isArray(data) ? data : [];
    } catch (e) {
        console.warn('Erro ao carregar notas:', e);
        return [];
    }
}

/**
 * Persiste o cache atual (fire-and-forget) e dispara o callback de mudança.
 * @private
 */
function _persist() {
    // Não aguardamos (async): o cache já está atualizado e a UI pode renderizar.
    storageSet(STORAGE_KEYS.NOTES, _notes).catch(e =>
        console.warn('Erro ao salvar notas:', e)
    );
    if (typeof _onChangeCallback === 'function') {
        _onChangeCallback(_notes);
    }
}

function getNotes() { return _notes; }

function getNoteById(id) { return _notes.find(n => n.id === id); }

function storageAddNote(note) { _notes.unshift(note); _persist(); }

/**
 * Adiciona uma nota apenas ao CACHE em memória, SEM persistir.
 *
 * Usado para a nota "rascunho" recém-criada (ainda em branco). Ela só é
 * gravada no armazenamento quando ganha conteúdo (no `saveEditing`). Assim, se
 * o popup for fechado antes de salvar (ex.: clicar fora da extensão), a nota em
 * branco não fica persistida. Corrige o bug "Nota em branco".
 * @param {object} note
 */
function storageAddDraftNote(note) { _notes.unshift(note); }

/**
 * Remove do cache (e persiste, se houve remoção) notas em branco.
 *
 * Defesa em profundidade: limpa notas vazias que possam ter sido gravadas por
 * versões anteriores ao fix do bug "Nota em branco".
 * @returns {number} Quantidade de notas removidas
 */
function pruneBlankNotes() {
    const before = _notes.length;
    _notes = _notes.filter(n => n && typeof n.text === 'string' && n.text.trim() !== '');
    const removed = before - _notes.length;
    if (removed > 0) _persist();
    return removed;
}

function storageRemoveNote(id) { _notes = _notes.filter(n => n.id !== id); _persist(); }

function storagePersist() { _persist(); }

function storageClearAll() { _notes = []; _persist(); }

/**
 * Carrega e aplica o tamanho salvo do popup.
 * @returns {Promise<void>}
 */
async function loadPopupSize() {
    try {
        const size = await storageGet(STORAGE_KEYS.SIZE);
        if (size && size.width && size.height) {
            document.body.style.width = size.width + 'px';
            document.body.style.height = size.height + 'px';
        }
    } catch (e) { /* tamanho é opcional; ignora falhas */ }
}

/**
 * Salva o tamanho do popup (fire-and-forget).
 * @param {number} width
 * @param {number} height
 */
function savePopupSize(width, height) {
    storageSet(STORAGE_KEYS.SIZE, { width, height }).catch(() => {});
}
