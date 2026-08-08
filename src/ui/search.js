/**
 * Filtro de busca da listagem (live search com debounce).
 *
 * Mantém o termo de busca atual (`_searchTerm`), que o renderer consulta via
 * `getSearchTerm()` para filtrar e grifar. A busca é case- e acento-insensível
 * (ver utils/dom.js) e cobre título, categoria e corpo da nota.
 * @module ui/search
 */

const SEARCH_DEBOUNCE_MS = 300;

let _searchTerm = '';
let _debounceId = null;
let _refs = null;

/**
 * Termo de busca atual (string vazia = sem filtro).
 * @returns {string}
 */
function getSearchTerm() { return _searchTerm; }

/**
 * Inicializa o campo de busca.
 * @param {object} refs
 * @param {HTMLInputElement} refs.input - Campo de texto
 * @param {HTMLElement} refs.clearBtn - Botão "X" de limpar
 * @param {HTMLElement} refs.notesContainer - Container das notas
 */
function initSearch(refs) {
    _refs = refs;
    const { input, clearBtn } = refs;

    input.maxLength = MAX_SEARCH_LENGTH;

    input.addEventListener('input', () => {
        _toggleClearButton();
        clearTimeout(_debounceId);
        _debounceId = setTimeout(() => {
            _searchTerm = input.value.trim();
            _applySearch();
        }, SEARCH_DEBOUNCE_MS);
    });

    clearBtn.addEventListener('click', () => _clearSearch());

    // Esc dentro do campo também limpa a busca.
    input.addEventListener('keydown', e => {
        if (e.key === 'Escape' && input.value) {
            e.preventDefault();
            _clearSearch();
        }
    });
}

/** Limpa a busca em um clique e restaura a lista (com efeito sutil). */
function _clearSearch() {
    if (!_refs) return;
    clearTimeout(_debounceId);
    _refs.input.value = '';
    _searchTerm = '';
    _toggleClearButton();
    _applySearch();
    _refs.input.focus();
}

/** Mostra o "X" apenas quando há texto no campo. */
function _toggleClearButton() {
    if (!_refs) return;
    _refs.clearBtn.classList.toggle('visible', _refs.input.value.length > 0);
}

/** Re-renderiza aplicando o filtro, com um fade sutil (não assusta). */
function _applySearch() {
    if (!_refs) return;
    // Preserva o que está sendo digitado numa nota em edição antes de
    // re-renderizar (senão o editor seria reconstruído e o texto se perderia).
    syncEditingDraft();
    renderNotes(_refs.notesContainer, getEditingId());
    updateNoteCount(document.getElementById('noteCount'));
    // Reinicia a animação de surgimento suave.
    _refs.notesContainer.classList.remove('search-fade');
    void _refs.notesContainer.offsetWidth;
    _refs.notesContainer.classList.add('search-fade');
}
