/**
 * Compatibilidade Firefox: unifica o namespace `browser` (WebExtensions API
 * padrão, baseada em Promises) sob `chrome`, que é o que todo o resto do
 * código usa. No Firefox EXISTEM os dois (`browser` promise-based e `chrome`
 * callback-based, este último só para compatibilidade) — por isso `browser`
 * sempre vence quando presente, mesmo com `chrome` já definido; sem isso, o
 * `await chrome.storage.local.get(...)` do projeto receberia `undefined` (API
 * de callback) em vez do valor esperado. No Chrome/Brave (onde só `chrome`
 * existe) este arquivo não faz nada. Precisa ser o PRIMEIRO script carregado,
 * antes de qualquer uso de `chrome.*`.
 * @module utils/browser-polyfill
 */
if (typeof browser !== 'undefined') {
    globalThis.chrome = browser;
}
