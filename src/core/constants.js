/**
 * Constantes globais da aplicação.
 * @module core/constants
 */

const STORAGE_KEYS = Object.freeze({
    NOTES: 'postitNotes',
    SIZE: 'postitSize',
    FAVORITE_EMOJIS: 'postitFavoriteEmojis',
    CATEGORIES: 'postitCategories'
});

const RESIZE_LIMITS = Object.freeze({
    MIN_WIDTH: 250,
    MIN_HEIGHT: 200,
    MAX_WIDTH: 800,
    MAX_HEIGHT: 800
});

const PRESET_COLORS = Object.freeze([
    { name: 'Amarelo', hex: '#FFF3CD' },
    { name: 'Verde', hex: '#D4EDDA' },
    { name: 'Azul', hex: '#D6EAF8' },
    { name: 'Rosa', hex: '#F8D7DA' }
]);

const MAX_FAVORITE_EMOJIS = 24;

const PREDEFINED_CATEGORIES = Object.freeze(['Trabalho', 'Escola', 'Casa']);
const MAX_CUSTOM_CATEGORIES = 5;
const MAX_CUSTOM_CATEGORIES_LENGTH = 15;

// Título da nota: curto de propósito (é um rótulo, não um corpo de texto).
const MAX_TITLE_LENGTH = 20;
