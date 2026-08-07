/**
 * Utilitários de manipulação de DOM e segurança.
 * @module utils/dom
 */

/**
 * Escapa caracteres especiais de HTML para evitar XSS.
 * @param {string} text - Texto para escapar
 * @returns {string} Texto seguro
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}