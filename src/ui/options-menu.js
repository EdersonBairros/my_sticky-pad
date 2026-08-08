/**
 * Gerenciamento do menu de opções (⋮).
 * @module ui/options-menu
 */

/**
 * Inicializa os eventos do menu de opções.
 * @param {Object} elements - Elementos DOM necessários
 * @param {HTMLElement} elements.optionsBtn - Botão ⋮
 * @param {HTMLElement} elements.optionsMenu - Dropdown do menu
 * @param {HTMLElement} elements.exportMenuItem - Item "Exportar"
 * @param {HTMLElement} elements.importMenuItem - Item "Importar"
 * @param {HTMLElement} elements.importFileInput - Input file oculto
 * @param {HTMLElement} elements.notesContainer - Container de notas
 */
function initOptionsMenu(elements) {
    const {
        optionsBtn,
        optionsMenu,
        exportMenuItem,
        importMenuItem,
        importFileInput,
        notesContainer
    } = elements;

    optionsBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        const isOpen = optionsMenu.classList.toggle('open');
        if (isOpen) {
            closeEmojiPicker();
            closeColorPickers();
        }
    });

    exportMenuItem.addEventListener('click', function (e) {
        e.stopPropagation();
        optionsMenu.classList.remove('open');
        handleExport();
    });

    importMenuItem.addEventListener('click', function (e) {
        e.stopPropagation();
        optionsMenu.classList.remove('open');
        importFileInput.click();
    });

    importFileInput.addEventListener('change', function (e) {
        const file = e.target.files && e.target.files[0];
        if (file) {
            handleImport(file, notesContainer);
        }
        e.target.value = '';
    });

    // Fecha menu ao clicar fora
    document.addEventListener('click', function (e) {
        if (!e.target.closest('.options-wrap')) {
            optionsMenu.classList.remove('open');
        }
    });
}

/**
 * Dispara a exportação de notas.
 */
function handleExport() {
    const notes = getNotes();
    if (notes.length === 0) {
        showToast('Não há notas para exportar.', 'warning');
        return;
    }
    const data = buildExportData(notes);
    downloadJSON(data, getExportFilename());
    showToast('Notas exportadas com sucesso!', 'success');
}

/**
 * Processa a importação de um arquivo JSON.
 * @param {File} file
 * @param {HTMLElement} notesContainer
 */
function handleImport(file, notesContainer) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (ev) {
        try {
            const imported = parseImportData(ev.target.result);
            const existing = getNotes();

            // "Sempre abaixo": encontramos o menor timestamp entre as notas
            // existentes para rebaixar a ordenação das importadas (sem alterar a
            // data exibida `createdAt`), garantindo que nunca subam acima do
            // trabalho atual — respeitando pin/arquivado dentro da mescla.
            let floor = Date.now();
            existing.forEach(n => {
                [n.updatedAt, n.createdAt, n.pinnedAt].forEach(t => {
                    if (!t) return;
                    const ms = new Date(t).getTime();
                    if (!isNaN(ms) && ms < floor) floor = ms;
                });
            });

            let added = 0;
            imported.forEach(n => {
                if (!n || typeof n !== 'object') return;
                // Sanitiza o HTML importado (vetor de XSS), preserva estado
                // (arquivada/pin/cor/categoria) e a data exibida (createdAt).
                const note = createNote({
                    title: n.title,
                    text: sanitizeHtml(typeof n.text === 'string' ? n.text : ''),
                    createdAt: n.createdAt,
                    updatedAt: n.updatedAt,
                    color: n.color,
                    category: n.category || null,
                    pinned: n.pinned === true,
                    pinnedAt: n.pinnedAt,
                    archived: n.archived === true
                });
                // Chave de ordenação abaixo de todas as existentes.
                const low = new Date(floor - (++added) * 60000).toISOString();
                note.updatedAt = low;
                if (note.pinned) note.pinnedAt = low;
                storageAddNote(note);
            });

            renderNotes(notesContainer, null);
            showToast(`${added} nota(s) importada(s) com sucesso!`, 'success');
        } catch (err) {
            showToast('Falha ao ler o arquivo. Verifique se é um JSON válido.', 'error');
        }
    };
    reader.readAsText(file);
}