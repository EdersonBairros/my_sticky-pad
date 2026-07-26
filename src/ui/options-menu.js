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
            const existingIds = new Set(getNotes().map(n => n.id));
            let added = 0;

            imported.forEach(n => {
                if (!n || typeof n !== 'object') return;
                const id = (n.id && !existingIds.has(n.id))
                    ? n.id
                    : Date.now().toString() + Math.random().toString(36).slice(2);
                existingIds.add(id);
                storageAddNote(createNote({
                    text: n.text,
                    createdAt: n.createdAt,
                    color: n.color
                }));
                added++;
            });

            renderNotes(notesContainer, null);
            showToast(`${added} nota(s) importada(s) com sucesso!`, 'success');
        } catch (err) {
            showToast('Falha ao ler o arquivo. Verifique se é um JSON válido.', 'error');
        }
    };
    reader.readAsText(file);
}