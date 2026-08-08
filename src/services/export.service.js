/**
 * Serviço de exportação e importação de notas.
 * Responsável apenas pela serialização/deserialização.
 * NÃO manipula DOM nem chama UI diretamente.
 * @module services/export
 */

/**
 * Gera o objeto de exportação com metadados.
 * @param {Array} notes - Lista de notas
 * @returns {object} Dados prontos para serializar
 */
function buildExportData(notes) {
    return {
        // v4: notas passaram a ter `pinned`/`pinnedAt`, além de `title` (v3) e
        // `updatedAt` (v2). O import é tolerante a arquivos v1/v2/v3 (campos
        // ausentes viram padrões seguros: sem título, não fixada, etc.).
        version: 4,
        exportedAt: new Date().toISOString(),
        notes: notes
    };
}

/**
 * Dispara o download de um arquivo JSON no navegador.
 * @param {object} data - Dados para exportar
 * @param {string} filename - Nome do arquivo
 */
function downloadJSON(data, filename) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Parseia um arquivo JSON importado, aceitando tanto array puro
 * quanto objeto { notes: [...] }.
 * @param {string} jsonText - Conteúdo do arquivo
 * @returns {Array} Lista de notas importadas
 * @throws {Error} Se o formato for inválido
 */
function parseImportData(jsonText) {
    const data = JSON.parse(jsonText);
    const imported = Array.isArray(data) ? data : (data.notes || []);
    if (!Array.isArray(imported) || imported.length === 0) {
        throw new Error('Nenhuma nota encontrada no arquivo.');
    }
    return imported;
}

/**
 * Gera um nome de arquivo baseado na data atual.
 * @returns {string}
 */
function getExportFilename() {
    const dateStr = new Date().toISOString().slice(0, 10);
    return `sticky-pad-notas-${dateStr}.json`;
}