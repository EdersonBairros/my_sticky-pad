/**
 * Renderização das notas na interface.
 * @module ui/notes.renderer
 */

/**
 * Ícone SVG de lixeira (lata clássica com tampa, alça e frisos). A cor da lata
 * vem de `currentColor` (definida no CSS de `.delete-btn`); os frisos são
 * brancos. Definido uma vez e reutilizado nos cards (principal e arquivado).
 */
const TRASH_ICON_SVG = `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M10.4 3.6C10.4 2.7 11.1 2.1 12 2.1s1.6.6 1.6 1.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><ellipse cx="12" cy="6" rx="7.2" ry="1.9" fill="currentColor"/><path d="M5.3 6h13.4l-1.2 13.8c-.1 1.1-2.5 1.9-5.5 1.9s-5.4-.8-5.5-1.9L5.3 6z" fill="currentColor"/><g stroke="#fff" stroke-width="1" stroke-linecap="round" opacity="0.9"><line x1="9.3" y1="9" x2="9.6" y2="18.4"/><line x1="12" y1="9" x2="12" y2="18.6"/><line x1="14.7" y1="9" x2="14.4" y2="18.4"/></g></svg>`;

/**
 * Cria o elemento DOM completo de uma nota (modo edição ou visualização).
 * @param {object} note - Dados da nota
 * @param {string|null} editingId - ID da nota em edição (null se nenhuma)
 * @returns {HTMLElement}
 */
function createNoteElement(note, editingId) {
    const div = document.createElement('div');
    div.className = 'note-item'
        + (editingId === note.id ? ' editing' : '')
        + (note.pinned ? ' pinned' : '')
        + (note.archived ? ' archived' : '');
    div.dataset.id = note.id;

    if (note.archived) {
        // Arquivada: mantém a cor de fundo, mas a borda cinza + opacidade
        // reduzida (CSS .archived) sinalizam que está "guardada".
        if (note.color) div.style.backgroundColor = note.color;
        _buildArchivedNote(div, note);
        return div;
    }

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
 * Monta o card de uma nota ARQUIVADA (read-only): categoria + título (sem pin) +
 * corpo + data, e rodapé com Restaurar (↩️) e Excluir definitivo (🗑️).
 * @private
 * @param {HTMLElement} div
 * @param {object} note
 */
function _buildArchivedNote(div, note) {
    div.innerHTML = `
        ${note.category ? `<span class="note-category-badge">${escapeHtml(note.category)}</span>` : ''}
        ${note.title ? `<div class="note-head"><span class="note-title">${escapeHtml(note.title)}</span></div>` : ''}
        <div class="note-text">${sanitizeHtml(note.text || '')}</div>
        <div class="note-footer">
            <span class="note-date">${formatDate(note.createdAt)}</span>
            <div class="note-actions">
                <button class="restore-btn" data-action="restore" title="Restaurar nota" aria-label="Restaurar nota"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg></button>
                <button class="delete-btn" data-action="delete" title="Excluir definitivamente" aria-label="Excluir definitivamente">${TRASH_ICON_SVG}</button>
            </div>
        </div>
    `;
}

/**
 * Monta o HTML do modo de edição.
 * @private
 * @param {HTMLElement} div
 * @param {object} note
 */
function _buildEditingNote(div, note) {
    div.innerHTML = `
        <input type="text" class="note-title-input" placeholder="Título (opcional)" maxlength="${MAX_TITLE_LENGTH}">
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
                <button class="pin-btn edit-pin ${note.pinned ? 'active' : ''}" data-action="pin-toggle" title="${note.pinned ? 'Desafixar nota' : 'Fixar nota'}" aria-label="${note.pinned ? 'Desafixar nota' : 'Fixar nota'}">📌</button>
                <button class="save-btn" data-action="save">💾 Salvar</button>
                <button class="cancel-btn" data-action="cancel">❌ Cancelar</button>
            </div>
        </div>
    `;

    const editorWrapper = div.querySelector('.editor-wrapper');
    const picker = createEmojiPicker();
    editorWrapper.appendChild(picker);

    setTimeout(() => {
        // Preenche o título via .value (evita injeção via atributo).
        const titleInput = div.querySelector('.note-title-input');
        if (titleInput) titleInput.value = note.title || '';

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
    // `note.text` é HTML rico da nota. Passa por sanitizeHtml (whitelist) como
    // choke point final de XSS — protege inclusive dados persistidos antes da
    // correção. A data exibida é `createdAt` (data real de criação, imutável).
    const pinLabel = note.pinned ? 'Desafixar nota' : 'Fixar nota';
    div.innerHTML = `
        <button class="color-btn" data-action="color-toggle" title="Alterar cor da nota">🎨</button>
        ${note.category ? `<span class="note-category-badge">${escapeHtml(note.category)}</span>` : ''}
        <div class="note-head">
            <button class="pin-btn ${note.pinned ? 'active' : ''}" data-action="pin-toggle" title="${pinLabel}" aria-label="${pinLabel}">📌</button>
            ${note.title ? `<span class="note-title">${escapeHtml(note.title)}</span>` : ''}
        </div>
        <div class="note-text">${sanitizeHtml(note.text || '')}</div>
        <div class="note-footer">
            <span class="note-date">${formatDate(note.createdAt)}</span>
            <div class="note-actions">
                <button class="edit-btn" data-action="edit" title="Editar">✏️</button>
                <button class="archive-btn" data-action="archive" title="Arquivar nota">🗂️</button>
                <button class="delete-btn" data-action="delete" title="Excluir" aria-label="Excluir">${TRASH_ICON_SVG}</button>
            </div>
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

    // Filtro por tela: a principal mostra as NÃO-arquivadas; a caixa (arquivados)
    // mostra apenas as arquivadas.
    const archivedView = (typeof isArchivedView === 'function') && isArchivedView();
    const viewNotes = getNotes().filter(n => archivedView ? n.archived === true : !n.archived);

    if (viewNotes.length === 0) {
        if (archivedView) {
            notesContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🗃️</div>
                    <p>Sua gaveta de arquivos está limpa e vazia.</p>
                </div>
            `;
        } else {
            notesContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📋</div>
                    <p>Nenhum lembrete ainda.<br>Clique no <strong>+</strong> para adicionar!</p>
                </div>
            `;
        }
        return;
    }

    // Filtro de busca (case- e acento-insensível) em título, categoria e corpo.
    // A nota em edição sempre aparece, para não sumir enquanto está sendo escrita.
    const term = (typeof getSearchTerm === 'function') ? getSearchTerm() : '';
    let notes = viewNotes;
    if (term) {
        const nterm = normalizeForSearch(term);
        notes = viewNotes.filter(n => n.id === editingId || _noteMatches(n, nterm));
    }

    if (notes.length === 0) {
        // Construído via DOM com textContent: o termo do usuário é tratado como
        // TEXTO puro (impossível injetar HTML/script por construção).
        const empty = document.createElement('div');
        empty.className = 'empty-state';

        const icon = document.createElement('div');
        icon.className = 'empty-icon';
        icon.textContent = '🔍';

        const p = document.createElement('p');
        p.appendChild(document.createTextNode('Nenhuma nota encontrada para o termo'));
        p.appendChild(document.createElement('br'));
        const strong = document.createElement('strong');
        strong.textContent = `"${term}"`;
        p.appendChild(strong);

        empty.appendChild(icon);
        empty.appendChild(p);
        notesContainer.appendChild(empty);
        return;
    }

    // Ordenação: notas FIXADAS primeiro (mais recente fixada no topo, via
    // `pinnedAt`); depois as demais pela última edição (mais recente no topo).
    // Notas antigas sem `updatedAt`/`pinned` caem nos fallbacks (retrocompatível).
    const sorted = [...notes].sort((a, b) => {
        const ap = a.pinned === true, bp = b.pinned === true;
        if (ap !== bp) return ap ? -1 : 1;
        if (ap && bp) return new Date(b.pinnedAt || 0) - new Date(a.pinnedAt || 0);
        return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
    });

    if (editingId) {
        const idx = sorted.findIndex(n => n.id === editingId);
        if (idx > 0) {
            const [editingNote] = sorted.splice(idx, 1);
            sorted.unshift(editingNote);
        }
    }

    sorted.forEach(note => {
        const el = createNoteElement(note, editingId);
        notesContainer.appendChild(el);
        // Grifa o termo (só nas notas em visualização; a nota em edição não).
        if (term && note.id !== editingId) _highlightNote(el, term);
    });
}

/**
 * Verifica se a nota casa com o termo (já normalizado) em título/categoria/corpo.
 * @private
 * @param {object} note
 * @param {string} nterm - Termo já normalizado (sem acento, minúsculo)
 * @returns {boolean}
 */
function _noteMatches(note, nterm) {
    return normalizeForSearch(note.title || '').includes(nterm)
        || normalizeForSearch(note.category || '').includes(nterm)
        || normalizeForSearch(_htmlToText(note.text || '')).includes(nterm);
}

/**
 * Extrai o texto visível de um HTML (para buscar no corpo sem casar com tags).
 * @private
 * @param {string} html
 * @returns {string}
 */
function _htmlToText(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || '';
}

/**
 * Grifa o termo no título, badge de categoria e corpo do elemento da nota.
 * @private
 * @param {HTMLElement} el
 * @param {string} term
 */
function _highlightNote(el, term) {
    ['.note-title', '.note-category-badge', '.note-text'].forEach(sel => {
        const target = el.querySelector(sel);
        if (target) highlightMatches(target, term);
    });
}

/**
 * Atualiza o contador de notas na UI.
 * @param {HTMLElement} noteCountElement - Elemento do contador
 */
function updateNoteCount(noteCountElement) {
    if (!noteCountElement) return;
    // Conta apenas as notas da tela atual (principal x arquivados).
    const archivedView = (typeof isArchivedView === 'function') && isArchivedView();
    const count = getNotes().filter(n => archivedView ? n.archived === true : !n.archived).length;
    if (archivedView) {
        noteCountElement.textContent = count === 1 ? '1 arquivada' : `${count} arquivadas`;
    } else {
        noteCountElement.textContent = count === 1 ? '1 lembrete' : `${count} lembretes`;
    }
}