/**
 * Botão de alternância de tema (claro ↔ escuro).
 *
 * O tema efetivo é aplicado por `theme-init.js` (no <head>) via `data-theme`
 * no <html>. Aqui só refletimos o estado no botão e alternamos ao clicar,
 * salvando a escolha do usuário em localStorage (que passa a ter prioridade
 * sobre o tema do sistema).
 * @module ui/theme
 */

const THEME_STORAGE_KEY = 'stickypad-theme';

/** @returns {'light'|'dark'} Tema atual (do atributo data-theme). */
function getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

/**
 * Inicializa o botão de tema.
 * @param {HTMLElement} btn - Botão de alternância
 */
function initThemeToggle(btn) {
    if (!btn) return;
    _reflectThemeOnButton(btn);

    btn.addEventListener('click', () => {
        const next = getCurrentTheme() === 'dark' ? 'light' : 'dark';
        // Anima as cores da UI só durante a troca (classe temporária).
        document.body.classList.add('theme-animating');
        document.documentElement.setAttribute('data-theme', next);
        try { localStorage.setItem(THEME_STORAGE_KEY, next); } catch (e) { /* ignora */ }
        _reflectThemeOnButton(btn);
        setTimeout(() => document.body.classList.remove('theme-animating'), 550);
    });
}

/**
 * Sincroniza o visual/acessibilidade do botão com o tema atual.
 * @private
 * @param {HTMLElement} btn
 */
function _reflectThemeOnButton(btn) {
    const dark = getCurrentTheme() === 'dark';
    btn.classList.toggle('is-dark', dark);
    btn.setAttribute('aria-pressed', String(dark));
    const label = dark ? 'Mudar para o tema claro' : 'Mudar para o tema escuro';
    btn.title = label;
    btn.setAttribute('aria-label', label);
}
