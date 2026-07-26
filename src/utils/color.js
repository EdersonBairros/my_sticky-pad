/**
 * Utilitários para manipulação de cores.
 * @module utils/color
 */

/**
 * Escurece uma cor hexadecimal em uma quantidade especificada.
 * @param {string} hex - Cor no formato #RRGGBB
 * @param {number} amount - Valor para escurecer (0-255)
 * @returns {string} Cor escurecida no formato #RRGGBB
 */
function darkenColor(hex, amount) {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);

    r = Math.max(0, r - amount);
    g = Math.max(0, g - amount);
    b = Math.max(0, b - amount);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Valida se uma string é uma cor hexadecimal válida.
 * @param {string} hex - String para validar
 * @returns {boolean} Verdadeiro se for um hex válido
 */
function isValidHex(hex) {
    return /^#[0-9A-Fa-f]{6}$/.test(hex);
}