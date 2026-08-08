/**
 * Modelo de dados para uma nota (lembrete).
 * @module models/note
 */

/**
 * Cria uma nova nota com valores padrão.
 *
 * Campos de data:
 *   - `createdAt`: data de CRIAÇÃO, imutável após criada (exibida na nota).
 *   - `updatedAt`: data da última EDIÇÃO, usada para ordenar (mais recente no topo).
 *
 * @param {object} [data] - Dados parciais para inicializar a nota
 * @param {string} [data.title=''] - Título curto da nota (opcional)
 * @param {string} [data.text=''] - Conteúdo HTML da nota
 * @param {string} [data.createdAt] - Data de criação (ISO)
 * @param {string} [data.updatedAt] - Data da última edição (ISO)
 * @param {string|null} [data.color=null] - Cor de fundo em hex
 * @param {string|null} [data.category=null] - Categoria da nota
 * @param {boolean} [data.pinned=false] - Se a nota está fixada (pin)
 * @param {string|null} [data.pinnedAt=null] - Momento em que foi fixada (ISO); ordena as fixadas
 * @returns {Note} Nova nota
 */
function createNote(data = {}) {
    const now = new Date().toISOString();
    const createdAt = data.createdAt || now;
    return {
        id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
        // Título é texto puro e opcional; aparado ao limite (defensivo p/ import).
        title: typeof data.title === 'string' ? data.title.trim().slice(0, MAX_TITLE_LENGTH) : '',
        text: data.text || '',
        createdAt: createdAt,
        // Notas antigas/importadas sem `updatedAt` herdam o `createdAt` (backfill).
        updatedAt: data.updatedAt || createdAt,
        color: data.color || null,
        category: data.category || null,
        // Fixação (pin): `pinnedAt` guarda quando foi fixada, para ordenar as fixadas.
        pinned: data.pinned === true,
        pinnedAt: data.pinned === true ? (data.pinnedAt || now) : null
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