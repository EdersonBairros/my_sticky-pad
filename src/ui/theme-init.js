/**
 * Aplica o tema ANTES do primeiro paint, evitando o "flash" de tema errado.
 * Carregado no <head> (bloqueante) — roda antes de o corpo ser desenhado.
 *
 * Fonte da preferência: `localStorage` (precisa ser SÍNCRONO para não piscar;
 * o tema é uma preferência de UI, não dado crítico). Se não houver preferência
 * salva, segue o tema do sistema operacional (prefers-color-scheme).
 * @module ui/theme-init
 */
(function () {
    try {
        var saved = localStorage.getItem('stickypad-theme');
        var theme = (saved === 'light' || saved === 'dark')
            ? saved
            : (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        document.documentElement.setAttribute('data-theme', theme);
    } catch (e) {
        document.documentElement.setAttribute('data-theme', 'light');
    }
})();
