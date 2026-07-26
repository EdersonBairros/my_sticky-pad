/**
 * Sistema de notificações toast para feedback ao usuário.
 * Substitui alert() nativo.
 * @module ui/notifications
 */

const TOAST_DURATION = 3000;

/**
 * Exibe uma notificação toast na tela.
 * @param {string} message - Mensagem a ser exibida
 * @param {'success'|'warning'|'error'} [type='success'] - Tipo de toast
 */
function showToast(message, type) {
    type = type || 'success';

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 16px;
        left: 50%;
        transform: translateX(-50%) translateY(80px);
        background: ${type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#4caf50'};
        color: white;
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 500;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        z-index: 9999;
        opacity: 0;
        transition: transform 0.3s ease, opacity 0.3s ease;
        pointer-events: none;
        white-space: nowrap;
    `;

    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.transform = 'translateX(-50%) translateY(0)';
        toast.style.opacity = '1';
    });

    setTimeout(() => {
        toast.style.transform = 'translateX(-50%) translateY(80px)';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, TOAST_DURATION);
}