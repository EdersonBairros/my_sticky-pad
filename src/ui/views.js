/**
 * Navegação entre as telas Principal e Notas Arquivadas.
 *
 * O estado da tela vive SÓ em memória (`_currentView`) — ao fechar/reabrir o
 * popup, volta para 'main' automaticamente (req: reabrir sempre na principal).
 * O renderer consulta `isArchivedView()` para filtrar as notas por tela.
 * @module ui/views
 */

let _currentView = 'main';
let _v = null;

/** @returns {'main'|'archived'} */
function getCurrentView() { return _currentView; }

/** @returns {boolean} */
function isArchivedView() { return _currentView === 'archived'; }

/**
 * Inicializa a navegação.
 * @param {object} refs - Elementos: archiveBoxBtn, backBtn, headerTitle,
 *   headerActions, clearAllBtn, notesContainer, noteCount
 */
function initViews(refs) {
    _v = refs;
    refs.archiveBoxBtn.addEventListener('click', enterArchivedView);
    refs.backBtn.addEventListener('click', exitToMainView);
}

/** Entra na tela de arquivados (ou treme a caixa se não houver arquivadas). */
function enterArchivedView() {
    if (_currentView === 'archived') return;

    const hasArchived = getNotes().some(n => n.archived === true);
    if (!hasArchived) {
        // Sem arquivadas: treme a caixa + micro-texto por 1s e permanece.
        _shakeArchiveBox();
        _showBoxTooltip('Nenhuma nota arquivada');
        return;
    }

    // Se havia uma nota em edição na principal, confirma/descarta antes de sair.
    if (getEditingId()) saveEditing(getEditingId());
    // Troca com sucesso → limpa a busca por precaução.
    clearSearch();

    _currentView = 'archived';
    _applyViewChrome();
    _renderWithTransition();
}

/** Volta para a tela principal. */
function exitToMainView() {
    if (_currentView === 'main') return;
    clearSearch();
    _currentView = 'main';
    _applyViewChrome();
    _renderWithTransition();
}

/** Ajusta o "chrome" (cabeçalho, botões) conforme a tela atual. */
function _applyViewChrome() {
    const archived = isArchivedView();
    _v.headerTitle.textContent = archived ? '🗃️ Notas Arquivadas' : 'Sticky-Pad';
    if (_v.headerLogo) _v.headerLogo.classList.toggle('hidden', archived);
    _v.backBtn.classList.toggle('visible', archived);
    // Na tela de arquivados escondemos +, ⋮, a caixa 📦 e o "Limpar tudo".
    _v.headerActions.classList.toggle('hidden', archived);
    _v.archiveBoxBtn.classList.toggle('hidden', archived);
    _v.clearAllBtn.classList.toggle('hidden', archived);
    // Marca o body para o CSS aplicar o fundo "gaveta" na tela de arquivados.
    document.body.classList.toggle('archived-view', archived);
}

/** Re-renderiza a lista com uma transição suave e sutil. */
function _renderWithTransition() {
    renderNotes(_v.notesContainer, getEditingId());
    updateNoteCount(_v.noteCount);
    _v.notesContainer.classList.remove('view-transition');
    void _v.notesContainer.offsetWidth; // reinicia a animação
    _v.notesContainer.classList.add('view-transition');
}

/** Anima a caixa (tremer) quando não há arquivadas. */
function _shakeArchiveBox() {
    const btn = _v.archiveBoxBtn;
    btn.classList.remove('shake');
    void btn.offsetWidth;
    btn.classList.add('shake');
    setTimeout(() => btn.classList.remove('shake'), 500);
}

/** Mostra um micro-texto discreto sobre a caixa por ~1s. */
function _showBoxTooltip(text) {
    const old = document.querySelector('.box-tooltip');
    if (old) old.remove();

    const rect = _v.archiveBoxBtn.getBoundingClientRect();
    const tip = document.createElement('div');
    tip.className = 'box-tooltip';
    tip.textContent = text;
    document.body.appendChild(tip);
    tip.style.left = (rect.left + rect.width / 2) + 'px';
    tip.style.top = (rect.top - 6) + 'px';

    requestAnimationFrame(() => tip.classList.add('visible'));
    setTimeout(() => {
        tip.classList.remove('visible');
        setTimeout(() => tip.remove(), 200);
    }, 1000);
}
