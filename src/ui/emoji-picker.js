/**
 * Componente de seletor de emojis.
 * @module ui/emoji-picker
 */

/**
 * Retorna a lista completa de categorias incluindo Favoritos no início.
 * @returns {Array}
 */
function getFullCategoryList() {
    const favoritesCat = {
        name: 'Favoritos',
        icon: '⭐',
        get emojis() { return getFavoritesEmojiList(); }
    };
    return [favoritesCat, ...EMOJI_CATEGORIES];
}

/**
 * Cria o elemento DOM do picker de emoji com abas e grid.
 * @returns {HTMLElement}
 */
function createEmojiPicker() {
    const picker = document.createElement('div');
    picker.className = 'emoji-picker';
    picker.dataset.emojiPicker = 'true';
    const cats = getFullCategoryList();

    let categoriesHtml = '<div class="emoji-picker-categories">';
    cats.forEach((cat, index) => {
        categoriesHtml += `<button class="emoji-cat-btn ${index === 0 ? 'active' : ''}" data-cat-index="${index}" title="${cat.name}">${cat.icon}</button>`;
    });
    categoriesHtml += '</div>';

    let gridHtml = '<div class="emoji-picker-grid" data-cat="0">';
    cats[0].emojis.forEach(emoji => {
        gridHtml += `<button class="emoji-item" data-emoji="${emoji}">${emoji}</button>`;
    });
    gridHtml += '</div>';

    picker.innerHTML = categoriesHtml + gridHtml;
    return picker;
}

/**
 * Troca a categoria ativa do picker e recarrega o grid.
 * @param {HTMLElement} picker
 * @param {number} catIndex
 */
function switchEmojiCategory(picker, catIndex) {
    picker.querySelectorAll('.emoji-cat-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.catIndex) === catIndex);
    });

    let grid = picker.querySelector('.emoji-picker-grid');
    if (!grid) {
        grid = document.createElement('div');
        grid.className = 'emoji-picker-grid';
        picker.appendChild(grid);
    }

    if (grid._scrollHandler) {
        grid.removeEventListener('scroll', grid._scrollHandler);
    }
    if (grid._wheelHandler) {
        grid.removeEventListener('wheel', grid._wheelHandler);
    }
    if (grid._advanceTimer) {
        clearTimeout(grid._advanceTimer);
        grid._advanceTimer = null;
    }
    if (grid._backTimer) {
        clearTimeout(grid._backTimer);
        grid._backTimer = null;
    }

    grid.dataset.cat = catIndex;

    const cats = getFullCategoryList();
    const category = cats[catIndex];
    grid.innerHTML = '';
    category.emojis.forEach(emoji => {
        const btn = document.createElement('button');
        btn.className = 'emoji-item';
        btn.dataset.emoji = emoji;
        btn.textContent = emoji;
        grid.appendChild(btn);
    });

    grid._scrollHandler = function () {
        // Rolou pra longe do topo → cancela o "voltar" que estava pendente.
        if (grid.scrollTop > 0 && grid._backTimer) {
            clearTimeout(grid._backTimer);
            grid._backTimer = null;
        }
        const atBottom = grid.scrollTop + grid.clientHeight >= grid.scrollHeight - 1;
        if (atBottom) {
            // Só avança pra próxima aba se o usuário PERMANECER no fim por um
            // instante — dá tempo de clicar num emoji do fim da lista sem o
            // sistema "pular" de aba sozinho (tela pequena).
            if (grid._advanceTimer) return;
            grid._advanceTimer = setTimeout(() => {
                grid._advanceTimer = null;
                // Reconfirma: pode ter rolado pra cima nesse meio-tempo.
                if (grid.scrollTop + grid.clientHeight < grid.scrollHeight - 1) return;
                const next = parseInt(grid.dataset.cat) + 1;
                if (next < cats.length) {
                    switchEmojiCategory(picker, next);
                    requestAnimationFrame(() => { grid.scrollTop = 0; });
                }
            }, 600);
        } else if (grid._advanceTimer) {
            // Saiu do fim antes do tempo → cancela o avanço.
            clearTimeout(grid._advanceTimer);
            grid._advanceTimer = null;
        }
    };
    grid.addEventListener('scroll', grid._scrollHandler);

    // Voltar: rolando PRA CIMA já no topo, volta pra categoria anterior (o evento
    // 'scroll' não dispara quando já se está em scrollTop 0, por isso usamos 'wheel').
    // Vai pro TOPO da lista anterior (não pro fim) — senão a regra "no fim → próxima"
    // dispararia na hora e prenderia o usuário num loop sem conseguir voltar.
    grid._wheelHandler = function (e) {
        if (e.deltaY < 0 && grid.scrollTop <= 0) {
            // Mesmo atraso do avanço: só volta se INSISTIR (rolar pra cima) por um
            // instante — dá tempo de clicar num emoji do topo antes de trocar de aba.
            if (grid._backTimer) return;
            grid._backTimer = setTimeout(() => {
                grid._backTimer = null;
                if (grid.scrollTop > 0) return; // saiu do topo nesse meio-tempo
                const prev = parseInt(grid.dataset.cat) - 1;
                if (prev >= 0) {
                    switchEmojiCategory(picker, prev);
                    requestAnimationFrame(() => { grid.scrollTop = 0; });
                }
            }, 600);
        }
    };
    grid.addEventListener('wheel', grid._wheelHandler, { passive: true });
}

/**
 * Posiciona o picker para cima ou para baixo conforme o espaço disponível.
 * @param {HTMLElement} picker
 * @param {HTMLElement} notesContainer
 */
function positionEmojiPicker(picker, notesContainer) {
    picker.classList.remove('open-up', 'open-down');

    const noteItem = picker.closest('.note-item');
    if (!noteItem) return;

    const noteRect = noteItem.getBoundingClientRect();
    const containerRect = notesContainer.getBoundingClientRect();

    if (noteRect.top - containerRect.top < 200) {
        picker.classList.add('open-down');
    } else {
        picker.classList.add('open-up');
    }
}

/**
 * Insere um emoji no editor ativo e registra o uso.
 * @param {string} emoji
 */
function emojiClicked(emoji) {
    incrementEmojiUsage(emoji);
    _insertEmojiText(emoji);
}

/**
 * Insere texto emoji no editor contenteditable.
 * @private
 * @param {string} emoji
 */
function _insertEmojiText(emoji) {
    const editor = document.querySelector('.note-editor');
    if (!editor) return;

    editor.focus();
    if (document.queryCommandSupported('insertText')) {
        document.execCommand('insertText', false, emoji);
    } else {
        const textNode = document.createTextNode(emoji);
        const sel = window.getSelection();
        if (sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            range.deleteContents();
            range.insertNode(textNode);
            range.setStartAfter(textNode);
            range.setEndAfter(textNode);
            sel.removeAllRanges();
            sel.addRange(range);
        } else {
            editor.appendChild(textNode);
        }
    }
    editor.focus();
}

/** Fecha todos os pickers de emoji abertos. */
function closeEmojiPicker() {
    document.querySelectorAll('.emoji-picker.open').forEach(p => p.classList.remove('open'));
    document.querySelectorAll('.emoji-btn.active').forEach(b => b.classList.remove('active'));
}

// --- Gerenciamento de favoritos ---

/**
 * @type {Array} Cache em memória dos favoritos ({emoji, count}).
 * Necessário porque `getFavoriteEmojis` é lido de forma SÍNCRONA durante a
 * renderização do picker, enquanto o armazenamento agora é assíncrono.
 */
let _favoriteEmojis = [];

/**
 * Carrega os favoritos do armazenamento para o cache. Deve ser aguardado no
 * bootstrap antes da primeira abertura do picker.
 * @returns {Promise<void>}
 */
async function initFavoriteEmojis() {
    try {
        const data = await storageGet(STORAGE_KEYS.FAVORITE_EMOJIS);
        _favoriteEmojis = Array.isArray(data) ? data : [];
    } catch (e) {
        _favoriteEmojis = [];
    }
}

/**
 * Obtém a lista de emojis favoritos (do cache, síncrono).
 * @returns {Array}
 */
function getFavoriteEmojis() {
    return _favoriteEmojis;
}

/**
 * Salva a lista de favoritos (atualiza o cache e persiste fire-and-forget).
 * @param {Array} favorites
 */
function saveFavoriteEmojis(favorites) {
    _favoriteEmojis = favorites;
    storageSet(STORAGE_KEYS.FAVORITE_EMOJIS, favorites).catch(e =>
        console.warn('Erro ao salvar favoritos:', e)
    );
}

/**
 * Incrementa o contador de uso de um emoji e atualiza favoritos.
 * @param {string} emoji
 */
function incrementEmojiUsage(emoji) {
    let favorites = getFavoriteEmojis();
    const existing = favorites.find(f => f.emoji === emoji);
    if (existing) {
        existing.count = (existing.count || 1) + 1;
    } else {
        favorites.push({ emoji, count: 1 });
    }
    favorites.sort((a, b) => b.count - a.count);
    if (favorites.length > MAX_FAVORITE_EMOJIS) {
        favorites = favorites.slice(0, MAX_FAVORITE_EMOJIS);
    }
    saveFavoriteEmojis(favorites);
}

/**
 * Retorna lista plana de emojis favoritos.
 * @returns {string[]}
 */
function getFavoritesEmojiList() {
    return getFavoriteEmojis().map(f => f.emoji);
}