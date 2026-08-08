/**
 * Utilitários de manipulação de DOM e segurança.
 * @module utils/dom
 */

/**
 * Escapa caracteres especiais de HTML para evitar XSS.
 * Use quando o valor é TEXTO puro (ex.: nome de categoria).
 * @param {string} text - Texto para escapar
 * @returns {string} Texto seguro
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/*
 * ============================================================================
 * SANITIZAÇÃO DE HTML (proteção XSS para conteúdo rico das notas)
 * ============================================================================
 * O editor é `contenteditable`, então uma nota guarda HTML de formatação
 * (negrito, listas, alinhamento...). Não dá para simplesmente escapar tudo
 * (perderíamos a formatação). Também não podemos injetar o HTML cru: um JSON
 * importado ou um trecho colado poderia conter `<img onerror=...>`, `<script>`
 * etc. A solução é uma sanitização por WHITELIST: mantemos apenas as tags e
 * atributos de formatação conhecidos e removemos o resto.
 *
 * Onde é aplicada (defesa em profundidade):
 *   - Na ESCRITA: import (options-menu) e save (note.controller) → storage limpo.
 *   - Na RENDERIZAÇÃO: _buildViewNote (notes.renderer) → choke point final,
 *     protege inclusive dados já persistidos antes desta correção.
 */

/** Tags de formatação permitidas (todas as demais são "desembrulhadas"). */
const _ALLOWED_TAGS = new Set([
    'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'DEL',
    'UL', 'OL', 'LI', 'BR', 'DIV', 'SPAN', 'P', 'FONT'
]);

/** Tags removidas INTEGRALMENTE (junto com seu conteúdo). */
const _DANGEROUS_TAGS = new Set([
    'SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'NOSCRIPT',
    'TEMPLATE', 'SVG', 'MATH', 'LINK', 'META', 'BASE', 'FORM'
]);

/** Propriedades de estilo inline permitidas (formatação de texto). */
const _ALLOWED_STYLE_PROPS = new Set([
    'text-align', 'font-weight', 'font-style',
    'text-decoration', 'text-decoration-line'
]);

/**
 * Sanitiza uma string de HTML, mantendo apenas formatação segura.
 * @param {string} html - HTML potencialmente inseguro
 * @returns {string} HTML seguro para injetar via innerHTML
 */
function sanitizeHtml(html) {
    if (typeof html !== 'string' || html === '') return '';
    // `<template>` faz o parse SEM executar scripts nem carregar recursos
    // (imagens não disparam requisição enquanto estão dentro do fragment).
    const template = document.createElement('template');
    template.innerHTML = html;
    _sanitizeChildren(template.content);
    return template.innerHTML;
}

/**
 * Percorre e limpa recursivamente os filhos de um nó.
 * @private
 * @param {Node} node
 */
function _sanitizeChildren(node) {
    // Snapshot: vamos remover/desembrulhar nós durante a iteração.
    Array.from(node.childNodes).forEach(child => {
        if (child.nodeType === Node.COMMENT_NODE) {
            child.remove();
            return;
        }
        if (child.nodeType !== Node.ELEMENT_NODE) return; // texto: mantém

        const tag = child.tagName;

        if (_DANGEROUS_TAGS.has(tag)) {
            child.remove();
            return;
        }

        // Limpa descendentes ANTES de decidir sobre a própria tag.
        _sanitizeChildren(child);

        if (_ALLOWED_TAGS.has(tag)) {
            _cleanAttributes(child);
        } else {
            // Tag desconhecida (ex.: <a>, <img>, <table>): remove a tag mas
            // preserva o conteúdo interno já sanitizado.
            _unwrap(child);
        }
    });
}

/**
 * Remove todos os atributos, exceto `style` (que é filtrado).
 * Isso elimina handlers `on*`, `src`, `href`, `class`, `id`, etc.
 * @private
 * @param {HTMLElement} el
 */
function _cleanAttributes(el) {
    Array.from(el.attributes).forEach(attr => {
        if (attr.name.toLowerCase() === 'style') {
            const clean = _sanitizeStyle(attr.value);
            if (clean) el.setAttribute('style', clean);
            else el.removeAttribute('style');
        } else {
            el.removeAttribute(attr.name);
        }
    });
}

/**
 * Mantém apenas propriedades de estilo da whitelist e valores sem vetores
 * de ataque (url(), expression, javascript:, @import).
 * @private
 * @param {string} cssText
 * @returns {string}
 */
function _sanitizeStyle(cssText) {
    const safe = [];
    cssText.split(';').forEach(decl => {
        const idx = decl.indexOf(':');
        if (idx === -1) return;
        const prop = decl.slice(0, idx).trim().toLowerCase();
        const value = decl.slice(idx + 1).trim();
        if (!_ALLOWED_STYLE_PROPS.has(prop)) return;
        if (/url\s*\(|expression|javascript:|@import/i.test(value)) return;
        safe.push(`${prop}: ${value}`);
    });
    return safe.join('; ');
}

/**
 * Substitui um elemento pelos seus filhos (remove a tag, mantém o conteúdo).
 * @private
 * @param {HTMLElement} el
 */
function _unwrap(el) {
    const parent = el.parentNode;
    if (!parent) return;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
}

/*
 * ============================================================================
 * BUSCA (normalização, regex sem acento e grifo)
 * ============================================================================
 */

/**
 * Normaliza texto para busca: remove acentos e coloca em minúsculas.
 * Assim "Café" e "cafe" casam entre si.
 * @param {string} s
 * @returns {string}
 */
function normalizeForSearch(s) {
    const nfd = (s || '').normalize('NFD');
    let out = '';
    for (const ch of nfd) {
        const code = ch.codePointAt(0);
        // Ignora marcas combinantes (acentos) no intervalo U+0300–U+036F.
        if (code >= 0x0300 && code <= 0x036f) continue;
        out += ch;
    }
    return out.toLowerCase();
}

/** Classes de caracteres para casar letras com/sem acento no grifo. */
const _ACCENT_CLASSES = {
    a: 'aàáâãä', e: 'eèéêë', i: 'iìíîï',
    o: 'oòóôõö', u: 'uùúûü', c: 'cç', n: 'nñ'
};

/**
 * Monta um regex (case- e acento-insensível) para grifar o termo buscado.
 * @param {string} term
 * @returns {RegExp|null} Regex global, ou null se termo vazio
 */
function buildSearchRegex(term) {
    const base = normalizeForSearch(term);
    if (!base) return null;
    const pattern = [...base].map(ch => {
        if (_ACCENT_CLASSES[ch]) {
            const set = _ACCENT_CLASSES[ch];
            return `[${set}${set.toUpperCase()}]`;
        }
        return ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }).join('');
    return new RegExp(pattern, 'gi');
}

/**
 * Grifa (envolve em <mark class="search-hl">) as ocorrências do termo dentro
 * dos nós de TEXTO de `root` — preserva as tags de formatação e não reparseia
 * HTML (o texto casado vira `textContent`, sem risco de injeção).
 * @param {HTMLElement} root
 * @param {string} term
 */
function highlightMatches(root, term) {
    const regex = buildSearchRegex(term);
    if (!regex || !root) return;

    const textNodes = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    let node;
    while ((node = walker.nextNode())) textNodes.push(node);

    textNodes.forEach(textNode => {
        const text = textNode.nodeValue;
        regex.lastIndex = 0;
        if (!regex.test(text)) return;

        regex.lastIndex = 0;
        const frag = document.createDocumentFragment();
        let last = 0, m;
        while ((m = regex.exec(text)) !== null) {
            if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
            const mark = document.createElement('mark');
            mark.className = 'search-hl';
            mark.textContent = m[0];
            frag.appendChild(mark);
            last = m.index + m[0].length;
            if (m[0].length === 0) regex.lastIndex++; // evita loop em match vazio
        }
        if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
        textNode.parentNode.replaceChild(frag, textNode);
    });
}