/**
 * Serviço de gerenciamento de categorias.
 * Responsável por persistir, criar e remover categorias.
 * Categorias predefinidas não podem ser removidas.
 * @module services/category
 */

let _customCategories = [];

/**
 * Inicializa o serviço carregando categorias do localStorage.
 */
function initCategories() {
    try {
        const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
        _customCategories = data ? JSON.parse(data) : [];
    } catch (e) {
        _customCategories = [];
    }
}

/**
 * Retorna todas as categorias (predefinidas + customizadas).
 * @returns {string[]}
 */
function getAllCategories() {
    return [...PREDEFINED_CATEGORIES, ..._customCategories];
}

/**
 * Verifica se a categoria é predefinida.
 * @param {string} name
 * @returns {boolean}
 */
function isPredefinedCategory(name) {
    return PREDEFINED_CATEGORIES.includes(name);
}

/**
 * Adiciona uma nova categoria customizada.
 * @param {string} name - Nome da categoria
 * @returns {{ok: boolean, message?: string}}
 */
function addCustomCategory(name) {
    const trimmed = name.trim();

    if (!trimmed) return { ok: false, message: 'Nome vazio' };
    if (trimmed.length > MAX_CUSTOM_CATEGORIES_LENGTH) return { ok: false, message: 'Máximo de 15 caracteres' };
    if (_customCategories.length >= MAX_CUSTOM_CATEGORIES) return { ok: false, message: 'Limite de 5 categorias atingido' };
    if (isCategoryNameExists(trimmed)) return { ok: false, message: 'Categoria já existe' };

    _customCategories.push(trimmed);
    _persistCategories();
    return { ok: true };
}

/**
 * Verifica se o nome da categoria já existe (predefinida ou customizada).
 * @param {string} name
 * @returns {boolean}
 */
function isCategoryNameExists(name) {
    return getAllCategories().some(cat => cat.toLowerCase() === name.toLowerCase());
}

/**
 * Remove uma categoria customizada.
 * @param {string} name - Nome da categoria a remover
 * @returns {{ok: boolean, message?: string}}
 */
function removeCustomCategory(name) {
    if (isCategoryInUse(name)) {
        return { ok: false, message: 'Categoria em uso' };
    }
    const index = _customCategories.indexOf(name);
    if (index === -1) return { ok: false, message: 'Categoria não encontrada' };
    _customCategories.splice(index, 1);
    _persistCategories();
    return { ok: true };
}

/**
 * Restaura uma categoria customizada removida (usado pelo Desfazer).
 * @param {string} name - Nome da categoria a restaurar
 * @returns {boolean} Verdadeiro se restaurada
 */
function restoreCustomCategory(name) {
    if (isCategoryNameExists(name)) return false;
    if (_customCategories.length >= MAX_CUSTOM_CATEGORIES) return false;
    _customCategories.push(name);
    _persistCategories();
    return true;
}

/**
 * Verifica se alguma nota está usando a categoria.
 * @param {string} name
 * @returns {boolean}
 */
function isCategoryInUse(name) {
    return getNotes().some(note => note.category === name);
}

/**
 * Persiste as categorias customizadas no localStorage.
 */
function _persistCategories() {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(_customCategories));
}