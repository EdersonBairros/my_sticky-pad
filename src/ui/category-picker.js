/**
 * Componente de seletor de categorias para as notas.
 * @module ui/category-picker
 */

let _activeNoteId = null;
let _pendingRemove = null;

/**
 * Abre o modal de categorias para uma nota.
 * @param {string} noteId
 * @param {HTMLElement} noteItem
 */
function openCategoryModal(noteId, noteItem) {
    _activeNoteId = noteId;
    closeEmojiPicker();
    closeColorPickers();
    closeCategoryModal();

    const existing = noteItem.querySelector('.category-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.className = 'category-modal';
    modal.innerHTML = `
        <div class="category-modal-title">Categorias</div>
        <div class="category-list"></div>
        <div class="category-create">
            <input type="text" class="category-input" placeholder="Adicionar nova categoria..." maxlength="${MAX_CUSTOM_CATEGORIES_LENGTH}">
            <button class="category-check-btn" data-action="category-add" title="Salvar categoria">✓</button>
        </div>
    `;
    noteItem.appendChild(modal);
    _renderCategoryList(modal, noteItem);

    const input = modal.querySelector('.category-input');
    if (input) setTimeout(() => input.focus(), 50);
}

/**
 * Fecha o modal de categorias aberto.
 */
function closeCategoryModal() {
    document.querySelectorAll('.category-modal').forEach(m => m.remove());
}

/**
 * Renderiza a lista de categorias com radio buttons.
 * @private
 * @param {HTMLElement} modal
 * @param {HTMLElement} noteItem
 */
function _renderCategoryList(modal, noteItem) {
    const note = getNoteById(_activeNoteId);
    const currentCategory = note ? note.category : null;
    const list = modal.querySelector('.category-list');
    const categories = getAllCategories();

    list.innerHTML = '';
    categories.forEach(cat => {
        const isCustom = !isPredefinedCategory(cat);
        const label = document.createElement('label');
        label.className = 'category-option' + (currentCategory === cat ? ' selected' : '');
        label.innerHTML = `
            <input type="radio" name="category-${_activeNoteId}" value="${escapeHtml(cat)}" ${currentCategory === cat ? 'checked' : ''} data-action="category-select">
            <span class="category-name">${escapeHtml(cat)}</span>
            ${isCustom ? '<button class="category-remove-btn" data-action="category-remove" title="Excluir categoria">✕</button>' : ''}
        `;
        list.appendChild(label);
    });
}

/**
 * Adiciona uma nova categoria customizada.
 * @param {HTMLInputElement} input
 */
function addCategoryFromInput(input) {
    const value = input.value.trim();
    if (!value) return;
    const result = addCustomCategory(value);
    if (!result.ok) {
        _showCategoryFeedback(input, result.message || 'Erro', 'error');
        return;
    }
    input.value = '';
    _refreshCategoryModal();
    showToast(`Categoria "${value}" criada!`, 'success');
}

/**
 * Remove uma categoria customizada, com opção Desfazer.
 * @param {string} name
 */
function removeCategory(name) {
    const result = removeCustomCategory(name);
    if (!result.ok) {
        _showCategoryInUseFeedback(name);
        return;
    }

    _showUndoOption(name);
    _refreshCategoryModal();
}

/**
 * Exibe a opção rápida "Desfazer" por 2 segundos.
 * @private
 * @param {string} name
 */
function _showUndoOption(name) {
    clearTimeout(_pendingRemove);
    const undoBtn = document.createElement('span');
    undoBtn.className = 'category-undo';
    undoBtn.textContent = '[Desfazer]';
    undoBtn.dataset.categoryName = name;
    undoBtn.dataset.action = 'category-undo';

    const categoryList = document.querySelector('.category-list');
    if (categoryList) {
        const existing = categoryList.querySelector('.category-undo');
        if (existing) existing.remove();
        categoryList.appendChild(undoBtn);
    }

    _pendingRemove = setTimeout(() => {
        if (undoBtn.parentNode) undoBtn.remove();
    }, 2000);
}

/**
 * Restaura uma categoria removida.
 * @param {string} name
 */
function undoRemoveCategory(name) {
    if (restoreCustomCategory(name)) {
        _refreshCategoryModal();
        showToast('Categoria restaurada!', 'success');
    }
}

/**
 * Exibe "Categoria em uso" e treme a categoria em vermelho.
 * @private
 * @param {string} name
 */
function _showCategoryInUseFeedback(name) {
    const labels = document.querySelectorAll('.category-option');
    labels.forEach(label => {
        const nameEl = label.querySelector('.category-name');
        if (nameEl && nameEl.textContent === name) {
            label.classList.add('shake-error');
            const feedback = document.createElement('span');
            feedback.className = 'category-in-use-feedback';
            feedback.textContent = 'Categoria em uso';
            label.appendChild(feedback);
            setTimeout(() => {
                label.classList.remove('shake-error');
                if (feedback.parentNode) feedback.remove();
            }, 2000);
        }
    });
}

/**
 * Exibe feedback de erro na criação.
 * @private
 * @param {HTMLInputElement} input
 * @param {string} message
 */
function _showCategoryFeedback(input, message, type) {
    input.style.borderColor = '#f44336';
    input.title = message;
    setTimeout(() => {
        input.style.borderColor = '';
        input.title = '';
    }, 2000);
    showToast(message, 'error');
}

/**
 * Atualiza o modal de categorias após mudanças.
 * @private
 */
function _refreshCategoryModal() {
    const noteItem = document.querySelector(`.note-item[data-id="${_activeNoteId}"]`);
    if (!noteItem) return;
    const modal = noteItem.querySelector('.category-modal');
    if (modal) _renderCategoryList(modal, noteItem);
}

/**
 * Seleciona uma categoria para a nota.
 * @param {string} name
 */
function selectCategory(name) {
    const note = getNoteById(_activeNoteId);
    if (!note) return;
    note.category = name;
    storagePersist();
    _refreshCategoryModal();
    showToast(`Categoria "${name}" selecionada`, 'success');
}

/**
 * Remove a categoria atribuída à nota (limpa seleção).
 */
function clearCategorySelection() {
    const note = getNoteById(_activeNoteId);
    if (!note) return;
    note.category = null;
    storagePersist();
    _refreshCategoryModal();
}