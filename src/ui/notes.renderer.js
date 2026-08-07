/**
 * Renderização das notas na interface.
 * @module ui/notes.renderer
 */

/**
 * Cria o elemento DOM completo de uma nota (modo edição ou visualização).
 * @param {object} note - Dados da nota
 * @param {string|null} editingId - ID da nota em edição (null se nenhuma)
 * @returns {HTMLElement}
 */
function createNoteElement(note, editingId) {
    const div = document.createElement('div');
    div.className = 'note-item' + (editingId === note.id ? ' editing' : '');
    div.dataset.id = note.id;

    if (note.color && editingId !== note.id) {
        div.style.backgroundColor = note.color;
        div.style.borderLeftColor = darkenColor(note.color, 30);
    }

    if (editingId === note.id) {
        _buildEditingNote(div, note);
    } else {
        _buildViewNote(div, note);
    }

    return div;
}

/**
 * Monta o HTML do modo de edição.
 * @private
 * @param {HTMLElement} div
 * @param {object} note
 */
function _buildEditingNote(div, note) {
    div.innerHTML = `
        <div class="format-toolbar">
            <div class="toolbar-group">
                <button class="format-btn" data-cmd="bold" title="Negrito"><span class="bold-text">B</span></button>
                <button class="format-btn" data-cmd="italic" title="Itálico"><span class="italic-text">I</span></button>
                <button class="format-btn" data-cmd="underline" title="Sublinhado"><span class="underline-text">U</span></button>
                <button class="format-btn" data-cmd="strike" title="Tachado"><span class="strike-text">S</span></button>
            </div>
            <div class="toolbar-group">
                <button class="format-btn" data-cmd="align-left" title="Alinhar à esquerda">≡</button>
                <button class="format-btn" data-cmd="align-center" title="Centralizar">≡</button>
                <button class="format-btn" data-cmd="align-right" title="Alinhar à direita">≡</button>
            </div>
            <div class="toolbar-group">
                <button class="format-btn" data-cmd="list-ul" title="Lista com marcadores">•</button>
                <button class="format-btn" data-cmd="list-ol" title="Lista numerada">1.</button>
            </div>
        </div>
        <div class="editor-wrapper">
            <div class="note-editor" contenteditable="true" data-placeholder="Digite seu lembrete..."></div>
            <button class="emoji-btn" data-action="emoji-toggle" title="Inserir emoji">😊</button>
        </div>
        <div class="edit-actions">
            <button class="category-btn" data-action="category-toggle" title="Categorias">⚙️</button>
            <div class="edit-actions-right">
                <button class="save-btn" data-action="save">💾 Salvar</button>
                <button class="cancel-btn" data-action="cancel">❌ Cancelar</button>
            </div>
        </div>
    `;

    const editorWrapper = div.querySelector('.editor-wrapper');
    const picker = createEmojiPicker();
    editorWrapper.appendChild(picker);

    setTimeout(() => {
        setEditorHTML(note.text);
        const editor = div.querySelector('.note-editor');
        if (!editor) return;
        editor.focus();

        const range = document.createRange();
        const sel = window.getSelection();
        if (editor.childNodes.length > 0) {
            range.setStartAfter(editor.lastChild);
            range.setEndAfter(editor.lastChild);
        } else {
            range.setStart(editor, 0);
            range.setEnd(editor, 0);
        }
        sel.removeAllRanges();
        sel.addRange(range);
    }, 50);
}

/**
 * Monta o HTML do modo de visualização.
 * @private
 * @param {HTMLElement} div
 * @param {object} note
 */
function _buildViewNote(div, note) {
    div.innerHTML = `
        <button class="color-btn" data-action="color-toggle" title="Alterar cor da nota">🎨</button>
        ${note.category ? `<span class="note-category-badge">${escapeHtml(note.category)}</span>` : ''}
        <div class="note-text">${note.text || ''}</div>
        <div class="note-date">${formatDate(note.createdAt)}</div>
        <div class="note-actions">
            <button class="edit-btn" data-action="edit" title="Editar">✏️</button>
            <button class="delete-btn" data-action="delete" title="Excluir">🗑️</button>
        </div>
    `;

    const colorPicker = createColorPicker(note.id, note.color || '');
    div.appendChild(colorPicker);
}

/**
 * Renderiza todas as notas no container.
 * @param {HTMLElement} notesContainer - Elemento container
 * @param {string|null} editingId - ID da nota em edição
 */
function renderNotes(notesContainer, editingId) {
    notesContainer.innerHTML = '';
    const notes = getNotes();

    if (notes.length === 0) {
        notesContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📋</div>
                <p>Nenhum lembrete ainda.<br>Clique no <strong>+</strong> para adicionar!</p>
            </div>
        `;
        return;
    }

    const sorted = [...notes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (editingId) {
        const idx = sorted.findIndex(n => n.id === editingId);
        if (idx > 0) {
            const [editingNote] = sorted.splice(idx, 1);
            sorted.unshift(editingNote);
        }
    }

    sorted.forEach(note => {
        notesContainer.appendChild(createNoteElement(note, editingId));
    });
}

/**
 * Atualiza o contador de notas na UI.
 * @param {HTMLElement} noteCountElement - Elemento do contador
 */
function updateNoteCount(noteCountElement) {
    if (!noteCountElement) return;
    const count = getNotes().length;
    noteCountElement.textContent = count === 1 ? '1 lembrete' : `${count} lembretes`;
}