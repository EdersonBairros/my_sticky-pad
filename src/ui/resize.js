/**
 * Gerenciamento do redimensionamento do popup.
 * @module ui/resize
 */

let _resizeState = {
    isResizing: false,
    startY: 0,
    startHeight: 0,
    currentHandle: null,
    rafId: null
};

/**
 * Inicializa os handles de redimensionamento do popup.
 */
function initResize() {
    const handles = document.querySelectorAll('[data-resize]');
    loadPopupSize();

    handles.forEach(handle => {
        handle.addEventListener('mousedown', function (e) {
            e.preventDefault();
            e.stopPropagation();
            const s = _resizeState;
            s.isResizing = true;
            s.currentHandle = this;
            // Coordenada de TELA (screenY), não de viewport (clientY): ao
            // redimensionar, a janela do popup se move e reposicionava o viewport,
            // o que criava um loop de crescimento. screenY é absoluto à tela.
            // Só resize vertical — a largura é fixa (350px).
            s.startY = e.screenY;
            s.startHeight = window.innerHeight || document.body.offsetHeight;

            document.body.style.userSelect = 'none';
            document.documentElement.style.userSelect = 'none';

            document.addEventListener('mousemove', _onMouseMove);
            document.addEventListener('mouseup', _onMouseUp);
        });
    });
}

function _onMouseMove(e) {
    const s = _resizeState;
    if (!s.isResizing || !s.currentHandle) return;
    if (s.rafId) return;

    s.rafId = requestAnimationFrame(() => {
        s.rafId = null;
        _performResize(e);
    });
}

function _performResize(e) {
    const s = _resizeState;
    // Só a borda inferior redimensiona (vertical). A largura fica fixa (350px):
    // o popup do Chrome é ancorado no topo-direito e o resize horizontal quebra.
    const dy = e.screenY - s.startY;
    const newHeight = Math.min(RESIZE_LIMITS.MAX_HEIGHT, Math.max(RESIZE_LIMITS.MIN_HEIGHT, s.startHeight + dy));
    document.body.style.height = newHeight + 'px';
}

function _onMouseUp() {
    const s = _resizeState;
    if (s.isResizing) {
        s.isResizing = false;
        if (s.rafId) { cancelAnimationFrame(s.rafId); s.rafId = null; }
        document.body.style.userSelect = '';
        document.documentElement.style.userSelect = '';
        savePopupSize(window.innerHeight || document.body.offsetHeight);
        s.currentHandle = null;
        document.removeEventListener('mousemove', _onMouseMove);
        document.removeEventListener('mouseup', _onMouseUp);
    }
}

// (setPopupSize removido: largura é fixa e a altura é aplicada em loadPopupSize.)