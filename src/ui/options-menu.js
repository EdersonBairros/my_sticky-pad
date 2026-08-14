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
 * @param {HTMLElement} elements.reportBugMenuItem - Item "Reportar um bug"
 * @param {HTMLElement} elements.notesContainer - Container de notas
 */
function initOptionsMenu(elements) {
    const {
        optionsBtn,
        optionsMenu,
        exportMenuItem,
        importMenuItem,
        importFileInput,
        reportBugMenuItem,
        notesContainer
    } = elements;

    optionsBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        // Giro suave da engrenagem ao abrir/fechar o menu (mesmo efeito do
        // botão de categoria): só inicia se não estiver girando, e a classe sai
        // quando a animação termina (nunca corta no meio).
        if (!optionsBtn.classList.contains('spin')) {
            optionsBtn.classList.add('spin');
            optionsBtn.addEventListener('animationend', () => optionsBtn.classList.remove('spin'), { once: true });
        }
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

        // No Firefox, abrir o seletor de arquivo do SO tira o foco do popup da
        // barra de ferramentas, e o Firefox FECHA popups de extensão ao perder
        // o foco — cancelando a escolha do arquivo antes do 'change' disparar
        // (falha silenciosa: nada acontece, sem erro). Na janela flutuante
        // (janela de verdade, não popup ancorado) isso não ocorre. Detecção via
        // user-agent (não via `typeof browser`): o namespace `browser` já não é
        // exclusividade do Firefox — builds recentes de Chrome também o expõem.
        const isFirefox = /firefox/i.test(navigator.userAgent);
        const isWindowMode = document.documentElement.classList.contains('window-mode');
        if (isFirefox && !isWindowMode) {
            // Mensagem curta de propósito: cabe numa linha só no popup (330px),
            // sem precisar alterar o componente de toast (nowrap padrão).
            showToast('Firefox: importe pela janela flutuante.', 'warning');
            return;
        }

        importFileInput.click();
    });

    reportBugMenuItem.addEventListener('click', function (e) {
        e.stopPropagation();
        optionsMenu.classList.remove('open');
        // Aba nova (não mailto:): o Forms tem campo de upload de print/vídeo,
        // que exige a tela de verdade do Google (mailto: não suportaria anexo,
        // e um seletor de arquivo do SO ainda fecharia popups no Firefox).
        window.open(_buildBugReportUrl(), '_blank');
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
 * Detecta o navegador atual para pré-selecionar o campo "Navegador usado" do
 * Forms — precisa bater com o TEXTO EXATO das opções do formulário. Brave se
 * identifica via `navigator.brave` (só existe nele); os demais, por trechos
 * característicos do user-agent (Vivaldi e Edge incluem o próprio nome nele;
 * Brave e Chrome puro não, daí a ordem de checagem importar).
 * @returns {string}
 */
function _detectBrowserOptionLabel() {
    const ua = navigator.userAgent;
    if (navigator.brave) return 'Brave';
    if (/Edg\//.test(ua)) return 'Microsoft Edge';
    if (/Vivaldi/.test(ua)) return 'Vivaldi';
    if (/Firefox/.test(ua)) return 'FireFox';
    return 'Google Chrome';
}

/**
 * Monta o link do Google Forms de "Reportar um bug", com o campo "Navegador
 * usado" pré-preenchido (poupa o usuário de descrever isso manualmente). Os
 * demais campos ficam em branco, para o usuário preencher com suas palavras.
 * @returns {string}
 */
function _buildBugReportUrl() {
    const params = new URLSearchParams({ usp: 'pp_url' });
    params.set(`entry.${BUG_REPORT_BROWSER_ENTRY_ID}`, _detectBrowserOptionLabel());
    return `${BUG_REPORT_FORM_URL}?${params.toString()}`;
}

/**
 * Abre a extensão como JANELA independente, redimensionável livremente pelo SO
 * (contorna a âncora do popup do Chrome, que trava o resize horizontal). A
 * querystring `?mode=window` ativa o layout fluido (ver theme-init.js + .window-mode).
 */
async function handleOpenInWindow() {
    if (typeof chrome === 'undefined' || !chrome.windows || !chrome.windows.create) {
        showToast('Não foi possível abrir em janela neste navegador.', 'error');
        return;
    }
    const url = chrome.runtime.getURL('popup.html?mode=window');

    // Se a janela flutuante já estiver aberta, só a traz pra frente (evita abrir
    // várias). Usa getContexts (Chrome 116+); se não existir, apenas abre nova.
    if (chrome.runtime.getContexts) {
        try {
            const ctxs = await chrome.runtime.getContexts({ documentUrls: [url] });
            const existing = ctxs && ctxs.find(c => c.windowId != null && c.windowId >= 0);
            if (existing) {
                chrome.windows.update(existing.windowId, { focused: true });
                window.close();
                return;
            }
        } catch (e) { /* segue e abre uma nova janela */ }
    }

    chrome.windows.create({ url, type: 'popup', width: 420, height: 560 });
    window.close(); // fecha o popup da barra de ferramentas
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