/**
 * Gerenciamento do editor de texto contenteditable e toolbar.
 * @module ui/editor
 */

const FORMAT_CMD_MAP = Object.freeze({
    'bold': 'bold',
    'italic': 'italic',
    'underline': 'underline',
    'strike': 'strikeThrough',
    'align-left': 'justifyLeft',
    'align-center': 'justifyCenter',
    'align-right': 'justifyRight',
    'list-ul': 'insertUnorderedList',
    'list-ol': 'insertOrderedList'
});

const FORMAT_STATE_MAP = Object.freeze({
    'bold': 'bold',
    'italic': 'italic',
    'underline': 'underline',
    'strikeThrough': 'strike',
    'justifyLeft': 'align-left',
    'justifyCenter': 'align-center',
    'justifyRight': 'align-right',
    'insertUnorderedList': 'list-ul',
    'insertOrderedList': 'list-ol'
});

/**
 * Executa um comando de formatação no editor ativo.
 *
 * DÉBITO TÉCNICO CONHECIDO: `document.execCommand` está formalmente descontinuado
 * (deprecated). Ainda é suportado por todos os navegadores atuais e é a forma
 * mais simples de formatar `contenteditable` sem bibliotecas. A substituição
 * (Selection/Range API ou um editor rico) é um refactor grande, fora do escopo
 * atual. A saída dele é sanitizada por `sanitizeHtml` antes de ser persistida.
 *
 * @param {string} command - Nome do comando document.execCommand
 */
function execFormat(command) {
    document.execCommand(command, false, null);
    const editor = document.querySelector('.note-editor');
    if (editor) editor.focus();
}

/**
 * Atualiza o estado ativo/inativo dos botões da toolbar
 * baseado na seleção atual do editor.
 */
function updateToolbarState() {
    const editor = document.querySelector('.note-editor');
    if (!editor) return;

    Object.keys(FORMAT_STATE_MAP).forEach(command => {
        const btn = document.querySelector(`[data-cmd="${FORMAT_STATE_MAP[command]}"]`);
        if (btn) {
            btn.classList.toggle('active', document.queryCommandState(command));
        }
    });
}

/**
 * Obtém o título digitado (texto puro, já aparado). Vazio se não houver campo.
 * @returns {string}
 */
function getTitleValue() {
    const input = document.querySelector('.note-title-input');
    return input ? input.value.trim() : '';
}

/**
 * Obtém o HTML atual do editor.
 * @returns {string}
 */
function getEditorHTML() {
    const editor = document.querySelector('.note-editor');
    if (!editor) return '';
    const html = editor.innerHTML;
    return (html === '' || html === '<br>') ? '' : html;
}

/**
 * Define o HTML do editor.
 * @param {string} html
 */
function setEditorHTML(html) {
    const editor = document.querySelector('.note-editor');
    if (!editor) return;
    editor.innerHTML = (!html || html.trim() === '') ? '' : html;
}

/**
 * Cria eventos de teclado para salvar (Ctrl+Enter) e cancelar (Escape).
 * @param {Function} onSave - Callback para salvar
 * @param {Function} onCancel - Callback para cancelar
 */
function bindEditorKeyboardEvents(onSave, onCancel) {
    document.addEventListener('keydown', function (e) {
        const editor = e.target.closest('.note-editor');
        if (!editor) return;

        const noteItem = editor.closest('.note-item');
        if (!noteItem) return;

        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            onSave(noteItem.dataset.id);
            return;
        }

        if (e.key === 'Escape') {
            const openPicker = noteItem.querySelector('.emoji-picker.open');
            if (openPicker) {
                closeEmojiPicker();
                return;
            }
            const openColor = noteItem.querySelector('.color-picker-dropdown.open');
            if (openColor) {
                closeColorPickers();
                return;
            }
            onCancel();
        }
    });
}