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

/**
 * Sincroniza cópias abertas ao mesmo tempo (popup da barra + janela flutuante).
 * Quando as notas mudam no armazenamento por OUTRA cópia, recarrega o cache e
 * re-renderiza — assim nenhuma cópia trabalha com dados velhos e uma não
 * sobrescreve a outra (evita "sumiço" de nota). Enquanto o usuário edita AQUI,
 * ignora a atualização pra não atrapalhar a edição em andamento.
 */
function initStorageSync() {
    if (!_hasChromeStorage || !chrome.storage.onChanged) return;
    chrome.storage.onChanged.addListener(function (changes, area) {
        if (area !== 'local' || !changes[STORAGE_KEYS.NOTES]) return;
        // Não interrompe uma edição em andamento nesta cópia.
        if (typeof getEditingId === 'function' && getEditingId()) return;
        const next = changes[STORAGE_KEYS.NOTES].newValue;
        _notes = Array.isArray(next) ? next : [];
        if (typeof _onChangeCallback === 'function') _onChangeCallback(_notes);
    });
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
    // Uma nota é "em branco" só se NÃO tiver corpo E NÃO tiver título.
    const hasText = n => typeof n.text === 'string' && n.text.trim() !== '';
    const hasTitle = n => typeof n.title === 'string' && n.title.trim() !== '';
    _notes = _notes.filter(n => n && (hasText(n) || hasTitle(n)));
    const removed = before - _notes.length;
    if (removed > 0) _persist();
    return removed;
}

function storageRemoveNote(id) { _notes = _notes.filter(n => n.id !== id); _persist(); }

function storagePersist() { _persist(); }

/**
 * Persiste o cache SEM disparar o callback de mudança (re-render).
 * Use quando o chamador já atualiza a UI por conta própria (ex.: pin), para
 * evitar uma re-renderização que reconstruiria o editor (piscada do placeholder)
 * ou reordenaria a lista sem animação.
 */
function storagePersistSilent() {
    storageSet(STORAGE_KEYS.NOTES, _notes).catch(e =>
        console.warn('Erro ao salvar notas:', e)
    );
}

/**
 * Remove apenas as notas NÃO-arquivadas (as da tela principal). As arquivadas
 * são mantidas — arquivar guarda a nota "em segurança".
 */
function storageClearNonArchived() {
    _notes = _notes.filter(n => n.archived === true);
    _persist();
}

/**
 * Carrega e aplica o tamanho salvo do popup.
 * @returns {Promise<void>}
 */
async function loadPopupSize() {
    // Em modo janela (aberto como janela do SO), o tamanho é do próprio SO;
    // não restauramos a altura salva do popup.
    if (document.documentElement.classList.contains('window-mode')) return;
    try {
        const size = await storageGet(STORAGE_KEYS.SIZE);
        if (size && size.height) {
            // Largura é FIXA (350px, via CSS) — o resize horizontal quebra no popup
            // do Chrome. Restaura só a ALTURA, com clamp aos limites (corrige também
            // valores antigos fora do teto do popup). Compatível com registros
            // legados {width, height} (só lemos .height).
            const h = Math.min(RESIZE_LIMITS.MAX_HEIGHT, Math.max(RESIZE_LIMITS.MIN_HEIGHT, size.height));
            document.body.style.height = h + 'px';
        }
    } catch (e) { /* tamanho é opcional; ignora falhas */ }
}

/**
 * Salva a altura do popup (fire-and-forget). A largura é fixa (350px).
 * @param {number} height
 */
function savePopupSize(height) {
    storageSet(STORAGE_KEYS.SIZE, { height }).catch(() => {});
}
