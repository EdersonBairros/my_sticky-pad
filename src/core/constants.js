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
    // Largura é FIXA (350px, via CSS) — só a altura é ajustável (borda inferior).
    MIN_HEIGHT: 200,
    // O popup do Chrome tem teto de ~600px de altura. Passar disso fazia o body
    // ficar maior que a janela -> o popup inteiro ganhava scroll e o cabecalho/
    // rodape rolavam junto (sumiam). Limitamos a 600 pra so a lista rolar.
    MAX_HEIGHT: 600
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
const MAX_TITLE_LENGTH = 25;

// Campo de busca: limita para não quebrar o layout do rodapé.
const MAX_SEARCH_LENGTH = 30;

// Destino do "Reportar um bug" (menu ⋮): Google Forms (suporta anexo de
// print/vídeo, o que um mailto: não permitiria). ID do campo "Navegador
// usado" para pré-selecionar automaticamente (ver options-menu.js).
const BUG_REPORT_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLScCsgvH7jhkxoQqhFqij749PyayDfzrVFRWf_QcOEntgwmaiQ/viewform';
const BUG_REPORT_BROWSER_ENTRY_ID = '1261568458';
