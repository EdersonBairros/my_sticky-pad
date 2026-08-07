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

    // Anexa ao body porque o modal usa position:fixed (não é cortado pelo overflow do container).
    document.body.appendChild(modal);
    _positionCategoryModal(modal, noteItem);
    _renderCategoryList(modal, noteItem);

    const input = modal.querySelector('.category-input');
    if (input) setTimeout(() => input.focus(), 50);
}

/**
 * Posiciona o modal de categorias ao lado direito do botão engrenagem,
 * garantindo que fique dentro da viewport (nunca cortado).
 * @private
 * @param {HTMLElement} modal
 * @param {HTMLElement} noteItem
 */
function _positionCategoryModal(modal, noteItem) {
    const gearBtn = noteItem.querySelector('[data-action="category-toggle"]');
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const modalWidth = 220;
    const gap = 6;

    let left = (gearBtn ? gearBtn.getBoundingClientRect().right : 8) + gap;
    let top = gearBtn ? gearBtn.getBoundingClientRect().top : 0;

    // Evita estourar à direita: se não couber, abre pelo lado esquerdo da engrenagem.
    if (left + modalWidth > vw) {
        left = (gearBtn ? gearBtn.getBoundingClientRect().left : 8) - modalWidth - gap;
    }
    // Garante limite mínimo à esquerda.
    left = Math.max(8, left);

    // Limites verticais: não ultrapassar o topo/rodapé da janela.
    top = Math.max(8, Math.min(top, Math.max(8, vh - 250)));

    modal.style.left = left + 'px';
    modal.style.top = top + 'px';
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
    // Ponto 3: ao criar a categoria, ela já é selecionada para a nota
    // e o modal é fechado automaticamente.
    input.value = '';
    selectCategory(value);
    closeCategoryModal();
    showToast(`Categoria "${value}" criada e selecionada!`, 'success');
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

    // Re-renderiza a lista PRIMEIRO (removendo a categoria da tela) e só
    // depois exibe o [Desfazer]. A ordem importa: _refreshCategoryModal
    // limpa o innerHTML da lista, o que removeria o Desfazer se ele
    // fosse adicionado antes.
    _refreshCategoryModal();
    _showUndoOption(name);
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
    // O modal agora é anexado ao document.body (para position:fixed), então
    // buscamos nele em vez de dentro do note-item.
    const modal = document.querySelector('.category-modal');
    if (modal) _renderCategoryList(modal, noteItem);
}

/**
 * Seleciona uma categoria para a nota.
 * @param {string} name
 */
function selectCategory(name) {
    const note = getNoteById(_activeNoteId);
    if (!note) return;
    // Apenas altera em memória — NÃO persiste aqui.
    // A persistência acontece no saveEditing (ou é revertida no cancelEditing).
    note.category = name;
    _refreshCategoryModal();
    showToast(`Categoria "${name}" selecionada`, 'success');
    // Re-foca o editor para não perder o texto digitado
    const editor = document.querySelector('.note-editor');
    if (editor) editor.focus();
}
