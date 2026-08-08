# 📝 My Sticky Pad — WebExtension

Uma extensão de navegador (Chrome/Firefox Manifest V3) que funciona como um bloco de notas post-it em popup. Crie lembretes rápidos com formatação de texto, emojis, cores personalizadas, exportação e importação de dados.

## ✨ Funcionalidades

- ✅ Criar, editar e excluir lembretes
- ✅ **Título por nota** (opcional, até 20 caracteres) — fixa no topo-esquerdo da nota na listagem, com hierarquia tipográfica (Segoe UI semibold)
- ✅ Formatação de texto (negrito, itálico, sublinhado, listas)
- ✅ Seletor de emojis com categorias e favoritos
- ✅ Rolagem infinita entre categorias de emoji
- ✅ Cores personalizadas (predefinidas + gradiente customizado)
- ✅ Redimensionamento da janela popup arrastando as bordas
- ✅ Exportar notas para arquivo JSON
- ✅ Importar notas de arquivo JSON (adiciona às existentes, com sanitização de segurança)
- ✅ Persistência durável via `chrome.storage.local` (com fallback para `localStorage`)
- ✅ Modo edição com toolbar de formatação
- ✅ **Categorias de notas** — organize lembretes por categoria (Trabalho, Escola, Casa + personalizadas)
  - Botão ⚙️ no rodapé da nota em edição
  - Modal flutuante com radio-buttons
  - Criar até 5 categorias personalizadas (máx. 15 caracteres)
  - Excluir categorias com opção "Desfazer" (2s)
  - Bloqueio de exclusão se a categoria estiver em uso (feedback visual "Categoria em uso")
  - Badge/caixinha retangular da categoria na listagem da nota

## 🏗️ Arquitetura

O projeto segue uma arquitetura modular baseada em separação de responsabilidades:

```
src/
├── core/
│   ├── app.js                 → Bootstrap, orquestração e dispatchers de eventos
│   ├── constants.js           → Constantes (chaves storage, limites, cores)
│   └── note.controller.js     → Regras de negócio CRUD (media UI ↔ Services)
├── data/
│   └── emojis.js              → Dados puros dos emojis organizados por categoria
├── models/
│   └── note.js                → Modelo Note (factory, validação e campo `category`)
├── services/
│   ├── storage.service.js     → Persistência das notas + tamanho do popup (cache em memória)
│   ├── export.service.js      → Serialização, download e parse de JSON
│   └── category.service.js    → CRUD de categorias (predefinidas + personalizadas)
├── ui/
│   ├── notes.renderer.js      → Criação e renderização dos elementos DOM das notas
│   ├── editor.js              → Toolbar de formatação e comandos contenteditable
│   ├── color-picker.js        → Seletor de cores com gradiente canvas
│   ├── emoji-picker.js        → Seletor de emojis com categorias, scroll infinito e favoritos
│   ├── category-picker.js     → Modal de categorias da nota (radio, criar/excluir, desfazer)
│   ├── resize.js              → Handles de redimensionamento do popup
│   ├── options-menu.js        → Menu de opções (⋮) com exportar/importar
│   └── notifications.js       → Sistema de notificações toast
├── utils/
│   ├── date.js                → Formatação relativa de datas
│   ├── color.js               → Utilitários de cor (escurecer, validar hex)
│   ├── storage.js             → Adaptador chrome.storage.local (async, fallback localStorage)
│   └── dom.js                 → escapeHtml + sanitizeHtml (proteção XSS)
├── index.js                   → Entry point (DOMContentLoaded → bootstrap)
```

### Princípios

- **SRP (Single Responsibility Principle)**: Cada arquivo tem uma única responsabilidade
- **Baixo acoplamento**: Services não manipulam DOM; UI não acessa o armazenamento diretamente (usa `utils/storage.js`)
- **Alta coesão**: Funções relacionadas estão no mesmo módulo
- **Estado mínimo**: O estado global é gerenciado apenas pelos services (caches em memória)
- **Zero diálogos nativos**: `alert()`/`confirm()` substituídos por toast e modal não-bloqueantes

## 🔒 Segurança (XSS)

As notas guardam **HTML rico** (o editor é `contenteditable`), então o conteúdo
não pode ser injetado cru via `innerHTML`. Um arquivo importado ou um trecho
colado poderia conter `<img onerror=...>`, `<script>`, etc.

Proteção via **whitelist** em `utils/dom.js` → `sanitizeHtml()`:

- Mantém apenas tags de formatação (`b, i, u, s, ul, ol, li, div, span, p, ...`)
- Remove `<script>`, `<iframe>`, `<img>`, handlers `on*`, `src`/`href`, `style` perigoso
- Aplicada em **3 pontos** (defesa em profundidade): no **import**, no **save** e na **renderização** (choke point final, protege até dados antigos)
- Reforçada por `content_security_policy` explícito no `manifest.json` (bloqueia scripts/handlers inline)

> Para texto puro (ex.: nome de categoria) usa-se `escapeHtml()`, não `sanitizeHtml()`.

## 💾 Armazenamento

Persistência via **`chrome.storage.local`** (durável — não é apagada pela limpeza
de "dados de navegação", diferente do `localStorage`). O adaptador `utils/storage.js`
cai automaticamente para `localStorage` quando a API de extensão não está
disponível (ex.: abrir `popup.html` direto no navegador para testar).

**Padrão de acesso** (importante para manutenção):

- As funções do adaptador são **assíncronas**.
- Cada service mantém um **cache em memória**; as **leituras da UI são síncronas** (do cache).
- Só o **carregamento inicial** (no `bootstrap`, que é `async`) precisa de `await`.
- As **escritas** são "fire-and-forget": atualizam o cache na hora e persistem em background.

Chaves usadas (ver `core/constants.js`): `postitNotes`, `postitSize`,
`postitFavoriteEmojis`, `postitCategories`.

**Migração de dados legados**: versões `<= 3.1.0` guardavam tudo em `localStorage`.
Ao ler uma chave ainda inexistente no `chrome.storage.local`, o adaptador busca o
valor legado no `localStorage` e o migra automaticamente (uma vez por chave), de
modo que usuários **não perdem notas** ao atualizar.

## 📅 Modelo de Nota

Campos (ver `models/note.js`):

- `title` → **título** curto e opcional (texto puro, máx. `MAX_TITLE_LENGTH` = 20 chars). Exibido no topo-esquerdo da nota na listagem (Segoe UI semibold, 16px — ver Sistema tipográfico).
- `text` → corpo em HTML rico (sanitizado).
- `createdAt` → data de **criação**, imutável (é a data exibida na nota).
- `updatedAt` → data da **última edição**, usada para **ordenar** (mais recente no topo).

**Regra de "nota em branco"**: uma nota só é descartada se estiver sem corpo **E** sem título — portanto uma nota só com título é válida e é salva normalmente.

Notas antigas/importadas sem `updatedAt` fazem *backfill* a partir do `createdAt`; sem `title`, tratam o título como vazio (não quebram nada).

## 🔡 Sistema tipográfico

Uma **família única** — `Segoe UI` (fonte nativa do Windows) — com hierarquia
criada por **tamanho, peso, cor e espaçamento** (nunca se misturam fontes).
Definido em variáveis CSS no topo de `popup.css` (`:root`), que é o **ponto
único** para reajustar o "tom" da extensão inteira.

| Papel | Tamanho | Peso | Cor |
|-------|---------|------|-----|
| Título da extensão | 17px | 600 | primário |
| Título da nota | 16px | 600 | primário |
| Corpo / editor | 14px | 400 | primário |
| Botões, menus, inputs, radios | 13px | 500/400 | primário |
| Contador, textos auxiliares | 12px | 400 | muted |
| Data e rótulos (ex.: CORES) | 11px | 600 | muted/secundário |

Cores de texto em 3 tons: `--text-primary` (#2b2b2b), `--text-secondary`
(#6b6b6b), `--text-muted` (#9a9a9a). A fonte monoespaçada fica restrita ao campo
de código hexadecimal de cor (`--font-mono`).

## ⚠️ Limitações conhecidas / Débito técnico

- **`document.execCommand`** (`ui/editor.js`): API de formatação formalmente
  descontinuada. Mantida por simplicidade (sem dependências); ainda suportada por
  todos os navegadores atuais. Substituí-la (Selection/Range API ou editor rico)
  é um refactor maior, planejado para o futuro.

## 🔄 Fluxo da Aplicação

```
1. Usuário abre a extensão (clica no ícone)
2. popup.html carrega todos os módulos src/ na ordem correta
3. index.js dispara DOMContentLoaded → bootstrap()
4. bootstrap() (async) inicializa:
   - Storage (await: carrega notas, categorias e favoritos do chrome.storage.local)
   - Note Controller (conecta regras de negócio)
   - Resize (handles de redimensionamento)
   - Options Menu (exportar/importar)
   - Dispatchers de eventos (cliques, teclado)
5. Notas são renderizadas na tela
6. Qualquer ação do usuário passa pelo controller
7. Controller chama storage para persistir e UI para re-renderizar
```

## 🚀 Como Executar

### Chrome / Edge

1. Abra `chrome://extensions`
2. Ative o **Modo do desenvolvedor**
3. Clique em **"Carregar sem compactação"**
4. Selecione a pasta raiz do projeto
5. A extensão aparecerá na barra de ferramentas

### Firefox (temporário)

1. Abra `about:debugging#/runtime/this-firefox`
2. Clique em **"Carregar extensão temporária..."**
3. Selecione o arquivo `manifest.json`

##  Versionamento

Seguimos **SemVer** (`MAJOR.MINOR.PATCH`). A cada mudança, a versão em
`manifest.json` **deve** ser atualizada e o impacto sinalizado abaixo:

- 🔴 **MAJOR** → mudança incompatível (quebra dados/API; exige migração)
- 🟡 **MINOR** → nova funcionalidade **retrocompatível**
- 🟢 **PATCH** → correção de bug retrocompatível, sem nova funcionalidade

| Versão | Impacto | Descrição |
|--------|---------|-----------|
| **1.0.0** | 🔴 MAJOR | Versão inicial monolítica |
| **2.0.0** | 🔴 MAJOR | Primeira refatoração modular |
| **2.1.0** | 🟡 MINOR | Favoritos + scroll infinito em emojis |
| **2.2.0** | 🟢 PATCH | Novo ícone com gradiente |
| **3.0.0** | 🔴 MAJOR | Refatoração completa com Clean Architecture |
| **3.1.0** | 🟡 MINOR | Categorias de notas (modal, CRUD, desfazer, badge) + correções de UX |
| **3.2.0** | 🟡 MINOR | Segurança e limpeza: sanitização XSS (`sanitizeHtml`), migração para `chrome.storage.local` **com migração automática de dados legados** (sem perda para o usuário), CSP explícito no manifest, separação `createdAt`/`updatedAt`, e `confirm()` nativo → modal não-bloqueante |
| **3.2.1** | 🟢 PATCH | Corrige o bug "Nota em branco": nota nova vira rascunho só em memória (persiste apenas ao salvar com conteúdo), então fechar o popup antes de salvar não deixa mais notas vazias. Inclui limpeza defensiva de notas em branco legadas no carregamento |
| **3.3.0** | 🟡 MINOR | Título opcional por nota (máx. 20 chars, Trebuchet MS negrito no topo-esquerdo da listagem). Nota é válida com título OU corpo. Retrocompatível: notas antigas sem `title` funcionam normalmente. Export passa a v3 (import tolerante a v1/v2) |
| **3.3.1** | 🟢 PATCH | Sistema tipográfico unificado: família única (Segoe UI) com hierarquia por tamanho/peso/cor/espaçamento, aplicado a todas as superfícies (cabeçalho, notas, inputs, botões, menus, alertas, radios). Título da nota migra de Trebuchet MS para Segoe UI semibold. Ajustes de UX: negrito em Exportar/Importar e "Limpar tudo", mensagem de limpar encurtada ("Limpar todos os lembretes?"), e data reposicionada no rodapé da nota (borda inferior-esquerda). Sem mudança de comportamento |
| **3.3.2** | 🟢 PATCH | Corrige regressão da 3.3.1: o botão ✓ de criar categoria transbordava para fora da modal (o input, com fonte 13px, não encolhia no flex). Adicionado `min-width: 0` no `.category-input` |
