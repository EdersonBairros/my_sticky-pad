/**
 * Adaptador de armazenamento de baixo nível.
 *
 * Usa `chrome.storage.local` (persistência durável e recomendada para
 * extensões — não é apagada pela limpeza de "dados de navegação" como o
 * localStorage pode ser). Quando a API de extensão não está disponível
 * (ex.: abrir `popup.html` diretamente no navegador para testes), cai
 * graciosamente para `localStorage`.
 *
 * IMPORTANTE (manutenção): todas as funções são ASSÍNCRONAS. Os serviços
 * que consomem este módulo mantêm um cache em memória e fazem as ESCRITAS
 * em "fire-and-forget" (sem await), de modo que as LEITURAS da UI continuam
 * síncronas a partir do cache. Só o carregamento inicial (bootstrap) precisa
 * aguardar (`await`) estes métodos.
 *
 * Diferença de formato entre os back-ends:
 *   - chrome.storage.local armazena/retorna objetos JS já estruturados.
 *   - localStorage só guarda strings, então aqui fazemos JSON.stringify/parse.
 * Em ambos os casos, `storageGet` devolve o valor já desserializado (objeto),
 * e `storageSet` recebe o valor como objeto — os serviços nunca lidam com JSON.
 *
 * @module utils/storage
 */

/** @type {boolean} Indica se a API chrome.storage.local está disponível. */
const _hasChromeStorage =
    typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;

/**
 * Lê um valor bruto do localStorage já desserializado.
 * @private
 * @param {string} key
 * @returns {*} Valor, ou `undefined` se ausente/inválido
 */
function _readLocal(key) {
    const raw = localStorage.getItem(key);
    if (raw === null) return undefined;
    try {
        return JSON.parse(raw);
    } catch (e) {
        return undefined;
    }
}

/**
 * Lê um valor do armazenamento.
 *
 * MIGRAÇÃO DE COMPATIBILIDADE (v3.2.0): versões <= 3.1.0 guardavam tudo em
 * `localStorage`. Ao ler uma chave que ainda não existe no `chrome.storage.local`,
 * verificamos o `localStorage` legado e, se houver dado lá, migramos de forma
 * transparente (uma única vez por chave). Isso evita que usuários "percam" as
 * notas ao atualizar a extensão.
 *
 * @param {string} key - Chave (ver STORAGE_KEYS)
 * @returns {Promise<*>} Valor desserializado, ou `undefined` se ausente
 */
async function storageGet(key) {
    if (_hasChromeStorage) {
        const result = await chrome.storage.local.get(key);
        if (result[key] !== undefined) return result[key];

        // Fallback/migração: dado legado do localStorage.
        const legacy = _readLocal(key);
        if (legacy !== undefined) {
            await chrome.storage.local.set({ [key]: legacy });
            return legacy;
        }
        return undefined;
    }
    return _readLocal(key);
}

/**
 * Grava um valor no armazenamento.
 * @param {string} key - Chave (ver STORAGE_KEYS)
 * @param {*} value - Valor (objeto/array/etc.) a persistir
 * @returns {Promise<void>}
 */
async function storageSet(key, value) {
    if (_hasChromeStorage) {
        await chrome.storage.local.set({ [key]: value });
        return;
    }
    localStorage.setItem(key, JSON.stringify(value));
}

/**
 * Remove uma chave do armazenamento.
 * @param {string} key - Chave (ver STORAGE_KEYS)
 * @returns {Promise<void>}
 */
async function storageRemove(key) {
    if (_hasChromeStorage) {
        await chrome.storage.local.remove(key);
        return;
    }
    localStorage.removeItem(key);
}
