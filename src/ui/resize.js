/**
 * Gerenciamento do redimensionamento do popup.
 * @module ui/resize
 */

let _resizeState = {
    isResizing: false,
    startX: 0, startY: 0,
    startWidth: 0, startHeight: 0,
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
            s.startX = e.clientX;
            s.startY = e.clientY;
            s.startWidth = window.innerWidth || document.body.offsetWidth;
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
    const dir = s.currentHandle.dataset.resize;
    let newWidth = s.startWidth;
    let newHeight = s.startHeight;

    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;

    if (dir === 'right' || dir === 'se' || dir === 'ne') {
        newWidth = Math.min(RESIZE_LIMITS.MAX_WIDTH, Math.max(RESIZE_LIMITS.MIN_WIDTH, s.startWidth + dx));
    }
    if (dir === 'left') {
        newWidth = Math.min(RESIZE_LIMITS.MAX_WIDTH, Math.max(RESIZE_LIMITS.MIN_WIDTH, s.startWidth - dx));
    }
    if (dir === 'bottom' || dir === 'se') {
        newHeight = Math.min(RESIZE_LIMITS.MAX_HEIGHT, Math.max(RESIZE_LIMITS.MIN_HEIGHT, s.startHeight + dy));
    }
    if (dir === 'ne') {
        newHeight = Math.min(RESIZE_LIMITS.MAX_HEIGHT, Math.max(RESIZE_LIMITS.MIN_HEIGHT, s.startHeight - dy));
    }

    document.body.style.width = newWidth + 'px';
    document.body.style.height = newHeight + 'px';
}

function _onMouseUp() {
    const s = _resizeState;
    if (s.isResizing) {
        s.isResizing = false;
        if (s.rafId) { cancelAnimationFrame(s.rafId); s.rafId = null; }
        document.body.style.userSelect = '';
        document.documentElement.style.userSelect = '';
        savePopupSize(
            window.innerWidth || document.body.offsetWidth,
            window.innerHeight || document.body.offsetHeight
        );
        s.currentHandle = null;
        document.removeEventListener('mousemove', _onMouseMove);
        document.removeEventListener('mouseup', _onMouseUp);
    }
}

/**
 * Redimensiona o popup para valores específicos.
 * @param {number} w - Largura
 * @param {number} h - Altura
 */
function setPopupSize(w, h) {
    document.body.style.width = Math.min(RESIZE_LIMITS.MAX_WIDTH, Math.max(RESIZE_LIMITS.MIN_WIDTH, w)) + 'px';
    document.body.style.height = Math.min(RESIZE_LIMITS.MAX_HEIGHT, Math.max(RESIZE_LIMITS.MIN_HEIGHT, h)) + 'px';
}