/**
 * Modelo de dados para uma nota (lembrete).
 * @module models/note
 */

/**
 * Cria uma nova nota com valores padrão.
 * @param {object} [data] - Dados parciais para inicializar a nota
 * @param {string} [data.text=''] - Conteúdo HTML da nota
 * @param {string|null} [data.color=null] - Cor de fundo em hex
 * @returns {Note} Nova nota
 */
function createNote(data = {}) {
    return {
        id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
        text: data.text || '',
        createdAt: data.createdAt || new Date().toISOString(),
        color: data.color || null
    };
}

/**
 * Valida se um objeto tem a estrutura mínima de uma nota.
 * @param {*} obj - Objeto a validar
 * @returns {boolean} Verdadeiro se for uma nota válida
 */
function isValidNote(obj) {
    return obj && typeof obj === 'object' && typeof obj.text === 'string';
}