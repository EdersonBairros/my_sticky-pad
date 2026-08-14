# 📝 My Sticky Pad — WebExtension

Uma extensão de navegador (Chrome/Firefox Manifest V3) que funciona como um bloco de notas post-it em popup. Crie lembretes rápidos com formatação de texto, emojis, cores personalizadas, exportação e importação de dados.

## ✨ Funcionalidades

- ✅ Criar, editar e excluir lembretes
- ✅ **Título por nota** (opcional, até 25 caracteres) — fixa no topo-esquerdo da nota na listagem, com hierarquia tipográfica (semibold)
- ✅ **Fixar notas (pin)** — alfinete no topo-esquerdo (e ao lado do Salvar na edição); notas fixadas sobem para o topo (mais recente fixada primeiro), com sombra de destaque e efeito de "cravar"
- ✅ **Filtro de busca** — campo no rodapé (live search com debounce de 300ms) que filtra por título, categoria e corpo; sem acento/maiúsculas ("café" = "cafe"), grifa o termo encontrado e respeita a ordem das notas fixadas
- ✅ **Notas arquivadas** — caixa 🗃️ no rodapé abre uma tela separada só com as arquivadas (visual "guardado"); arquivar (🗂️) tira o pin e manda para a caixa, restaurar (↩️) traz de volta, e a lixeira exclui definitivamente. Busca e contador funcionam nas duas telas
- ✅ **Tema claro/escuro** — botão animado (sol ☀️ ↔ lua 🌙) ao lado do `+`; segue o tema do sistema por padrão e lembra a escolha manual. Cores centralizadas em `theme.css` (design tokens)
- ✅ **Apoie o projeto** — botão ☕ no cabeçalho abre um modal com QR Code Pix e chave Pix copiável
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
  - Botão 🏷️ (ícone de tag) no rodapé da nota em edição
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
│   ├── search.js              → Filtro de busca do rodapé (live search com grifo)
│   ├── views.js               → Navegação entre telas Principal e Arquivadas
│   ├── resize.js              → Handles de redimensionamento do popup
│   ├── options-menu.js        → Menu de opções (⋮) com exportar/importar
│   ├── notifications.js       → Sistema de notificações toast
│   ├── theme-init.js          → Aplica o tema antes do paint (sem flash), no <head>
│   ├── theme.js               → Toggle de tema (sol/lua), persistência e animação
│   └── support.js             → Modal "Apoie o projeto" (Pix / QR Code / copiar chave)
├── utils/
│   ├── date.js                → Formatação relativa de datas
│   ├── color.js               → Utilitários de cor (escurecer, validar hex)
│   ├── storage.js             → Adaptador chrome.storage.local (async, fallback localStorage)
│   └── dom.js                 → escapeHtml + sanitizeHtml (proteção XSS)
├── index.js                   → Entry point (DOMContentLoaded → bootstrap)
```

Na **raiz** ficam `popup.html` (marcação), `popup.css` (estilos) e `theme.css`
(design tokens dos temas + `@font-face` da Inter). Assets: `fonts/` (fonte Inter
`.woff2` empacotada) e `icons/` (ícones da extensão + `sticky_pad_icon.svg`, logo
do cabeçalho).

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

- `title` → **título** curto e opcional (texto puro, máx. `MAX_TITLE_LENGTH` = 25 chars). Exibido no topo-esquerdo da nota na listagem (Inter semibold, 17px — ver Sistema tipográfico).
- `text` → corpo em HTML rico (sanitizado).
- `createdAt` → data de **criação**, imutável (é a data exibida na nota).
- `updatedAt` → data da **última edição**.
- `pinned` / `pinnedAt` → fixação (pin). `pinnedAt` guarda quando foi fixada.
- `archived` → se a nota está na "caixa" de arquivadas (tela separada). **Invariante**: nota arquivada nunca tem pin.

**Ordenação da listagem**: (1) notas **fixadas** primeiro, da mais recente fixada (`pinnedAt`) para a mais antiga; (2) depois as **não fixadas**, da última edição (`updatedAt`) para a mais antiga.

**Regra de "nota em branco"**: uma nota só é descartada se estiver sem corpo **E** sem título — portanto uma nota só com título é válida e é salva normalmente.

Notas antigas/importadas sem `updatedAt` fazem *backfill* a partir do `createdAt`; sem `title`, tratam o título como vazio; sem `pinned`, são consideradas não fixadas (não quebram nada).

## 🔡 Sistema tipográfico

A extensão usa a fonte **Inter** — **empacotada/self-hosted** em `fonts/` (subset
*latin*, que cobre os acentos do PT-BR; pesos 400/500/600/700; licença SIL OFL).
É carregada via `@font-face` no `theme.css` e vem **primeiro** em `--font-ui`, com
o *system stack* (`-apple-system`, `Segoe UI`, …) apenas como fallback.

> **Por que empacotar?** O stack de sistema caía para a **Segoe UI** no Windows
> (as fontes `-apple-system`/`SF Pro` só existem no Mac), e o espaçamento fino
> pensado para a SF Pro deixava os textos "espremidos". Com a Inter local, o
> visual fica moderno e **consistente em qualquer SO**.

Hierarquia por **tamanho, peso, cor e espaçamento** (nunca se misturam fontes),
toda em variáveis CSS no `theme.css` (`:root`) — ponto único para reajustar o
"tom" da extensão inteira.

| Papel | Token | Tamanho | Peso |
|-------|-------|---------|------|
| Título da extensão | `--fs-app-title` | 18px | 700 |
| Título da nota | `--fs-note-title` | 16px | 600 |
| Corpo / editor | `--fs-body` | 13px | 400 |
| Botões, menus, inputs, radios | `--fs-ui` | 12px | 500/400 |
| Contador, textos auxiliares | `--fs-caption` | 11px | 400 |
| Data e rótulos (ex.: CORES) | `--fs-micro` | 10px | 600 |

Espaçamento (letter-spacing): títulos `--ls-tight` (-0.6px), corpo `--ls-body`
(-0.4px), rótulos em caixa-alta `--ls-label` (0.4px). Entrelinha do corpo
`--lh-body` 1.25. Valores definidos no afinador de tipografia (preview com a
Inter real). Cores de texto via `--text-primary` / `--text-secondary` / `--text-muted`.
A monoespaçada (`--font-mono`) fica restrita ao campo de hex de cor.

## 🎨 Temas (claro/escuro)

Todas as cores vivem como **design tokens** (variáveis CSS) em **`theme.css`** —
um bloco para o tema claro (`:root`) e um para o escuro (`:root[data-theme="dark"]`).
O `popup.css` nunca usa cor fixa; sempre `var(--token)`. Para reajustar cores ou
os temas, mexa só no `theme.css`.

**Como o tema é resolvido:**
1. `theme-init.js` roda no `<head>` (antes do primeiro paint) e define
   `data-theme="light|dark"` no `<html>` — evita o "flash" de tema errado.
2. A preferência vem do `localStorage` (`stickypad-theme`); se não houver, segue
   o tema do sistema (`prefers-color-scheme`).
3. O botão de tema (`ui/theme.js`) alterna claro↔escuro, salva a escolha (que
   passa a ter prioridade sobre o SO) e anima a troca.

> A preferência de tema fica em `localStorage` (e não em `chrome.storage`) porque
> precisa ser lida de forma **síncrona** para aplicar antes do paint.

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
| **3.4.0** | 🟡 MINOR | Fixar notas (pin): campos `pinned`/`pinnedAt`, ordenação com fixadas no topo (mais recente fixada primeiro), botão de alfinete na listagem (topo-esquerdo do título) e na edição (ao lado do Salvar), sombra de destaque na nota fixada e animação de "cravar". Export → v4 (import tolerante a v1–v3). Retrocompatível com notas sem `pinned` |
| **3.5.0** | 🟡 MINOR | Filtro de busca no rodapé: live search com debounce de 300ms sobre título/categoria/corpo, case- e acento-insensível, grifo do termo (verde), botão "X" para limpar, estado vazio "Nenhuma nota encontrada", respeitando a ordem das fixadas e com surgimento suave. Limite do título 20 → 25 caracteres |
| **3.6.0** | 🟡 MINOR | Notas arquivadas: campo `archived`, tela separada (caixa 🗃️ no rodapé) com cabeçalho "Notas Arquivadas" + botão "← Voltar", cards read-only "guardados" (fundo cinza + sombra) com Restaurar (↩️) e Excluir definitivo, botão de arquivar 🗂️ nos cards da principal (remove o pin). Contador e busca globais nas duas telas; transição suave; caixa treme + micro-texto quando vazia; estado reseta ao reabrir o popup. Export → v5 (inclui arquivadas; import tolerante a v1–v4, importadas sempre abaixo) |
| **3.7.0** | 🟡 MINOR | Redesign visual + tema claro/escuro. **Tema:** todas as cores viraram design tokens em `theme.css` (claro + escuro); botão animado (sol ↔ lua) com "rolagem" ao lado do `+`; segue o SO por padrão (`prefers-color-scheme`), lembra a escolha manual (localStorage) e aplica antes do paint (`theme-init.js`, sem flash); transição suave ao alternar. **Redesign (inspiração iOS):** paleta iOS no claro (acento azul `#007aff` / índigo `#5856d6`) e azul-acinzentado no escuro; fonte **Inter** empacotada (self-hosted em `fonts/`, subset latin, OFL) com escala tipográfica — antes o stack `-apple-system` caía pra Segoe UI no Windows; degradê vertical sutil no fundo (claro e escuro); logo SVG no cabeçalho; gradiente nos botões `+` / emoji; cabeçalho, rodapé e tela de arquivados **sem separadores e transparentes** (fundo contínuo); modal de confirmação menor; bordas de edição em azul. **Limpeza:** removidas as "orelhinhas" (gradiente) das alças de canto, mantendo o resize funcional; tokens órfãos eliminados |
| **3.7.1** | 🟢 PATCH | Corrige cabeçalho e rodapé "sumindo" ao rolar a lista com muitas notas — agora **só a lista rola** e as barras ficam fixas. Limita a altura do popup ao teto do Chrome (`MAX_HEIGHT` 800 → 600px), clampa o tamanho salvo no carregamento (`loadPopupSize`) e impede o scroll no nível da janela (`html { overflow: hidden }` + altura padrão do `body`). Adiciona sombra sutil nas bordas internas do cabeçalho/rodapé, dando o efeito das notas passando por baixo das áreas fixas |
| **3.8.0** | 🟡 MINOR | Redimensionamento confiável + **"Abrir em janela"**. **Correção:** o resize horizontal quebrava no popup do Chrome (ancorado no topo-direito → "janela sobre janela" ao encolher) — agora a largura é **fixa (350px)** e só o **vertical** (borda inferior) redimensiona, que funciona 100%. A persistência passa a guardar só a altura. **Recurso:** botão dedicado "Janela flutuante" no cabeçalho (entre o + e o ⋮, ícone `icons/floating-windows.svg`) abre a extensão como **janela independente** (`chrome.windows.create`, `?mode=window`), redimensionável livremente em qualquer direção pelo SO. **Segurança de dados:** com a extensão aberta em dois lugares ao mesmo tempo (popup + janela), as cópias se **sincronizam automaticamente** (`chrome.storage.onChanged`) pra uma não sobrescrever/apagar nota da outra; a janela flutuante não duplica (foca a já aberta, via `getContexts`). Limpeza: removido `setPopupSize` e as constantes de largura órfãs |
| **3.9.0** | 🟡 MINOR | Botão **"Apoie o projeto"** no cabeçalho (☕ `icons/apoie.svg`, colorido com as cores do projeto) abre um modal de apoio: mensagem, **QR Code do Pix** (`icons/pix-qrcode.svg`), **chave Pix** visível com botão **Copiar** (clipboard + toast, com fallback) e dados de **transferência bancária em negrito**. Segue o padrão de modal do projeto (overlay, fecha no Esc / clique fora / botão ✕); o QR fica sobre fundo branco pra escanear bem inclusive no tema escuro. Dados de doação centralizados em `SUPPORT_INFO` (`src/ui/support.js`). Reorganização do cabeçalho/rodapé: o ☕ assumiu o lugar do ⋮ no cabeçalho; o menu ⋮ (exportar/importar) desceu para o rodapé (abrindo para cima); e "Limpar tudo" virou **"Esvaziar"** (ícone próprio `icons/esvaziar.svg`, só ícone com tooltip, sem a redundância das lixeiras), trocando de lugar com o ⋮. Ajustado o z-index do rodapé para o menu ⋮ ficar acima das tags de categoria |
| **3.11.2** | 🟢 PATCH | Centraliza verticalmente as mensagens de estado vazio (`.empty-state`): "Nenhum lembrete ainda", "Sua gaveta de arquivos está limpa e vazia" e "Nenhuma nota encontrada" ficavam coladas no topo por falta de altura no elemento — o `justify-content: center` só centralizava dentro do próprio tamanho do conteúdo. Adicionado `height: 100%` para preencher a lista e centralizar de fato |
| **3.11.1** | 🟢 PATCH | Corrige a barra de ações (Tag, 📌, Salvar, Cancelar) do editor "sumindo" quando o texto é longo — ao criar, editar ou colar muito conteúdo, o formulário inteiro crescia e o `.notes-container` criava um scroll **externo** que empurrava os botões pra fora da tela. Agora o formulário de edição é uma **coluna flex limitada à altura visível** (`.note-item.editing` com `max-height: 100%`): título e toolbar ficam fixos no topo, a **barra de ações fixa no rodapé**, e o editor preenche o meio **rolando internamente** (removido o teto fixo de `300px` do `.note-editor`, que estourava a altura do popup). O scroll passa a aparecer só no texto, na hora certa; sem mudança de comportamento em notas curtas |
| **3.11.0** | 🟡 MINOR | Removido o bloco "Transferência bancária" do modal "Apoie o projeto" (Favorecido, CPF, Banco, Agência e Conta); o modal agora exibe apenas QR Code Pix e chave Pix copiável com botão Copiar. Campos de banco removidos de SUPPORT_INFO em src/ui/support.js e CSS órfão (.support-bank/.support-bank-title) removido do popup.css |
| **3.10.0** | 🟡 MINOR | Categorias com ícone de TAG (🏷️): o botão de engrenagem do rodapé de edição virou tag com efeitos de preenchimento azul (fill) e balanço (swing) ao clicar; o ícone fica preenchido enquanto o modal de categorias está aberto ou a nota tem categoria associada. A engrenagem ⚙️ migrou para o menu ⋮ (rodapé) com animação de giro mantida; hover arredondado (círculo) no botão de opções. Novo arquivo `icons/tag-icon-filled.svg` |
| **3.9.1** | 🟢 PATCH | Ajustes pontuais de UI: (1) toasts sobem acima do rodapé (não sobrepõem mais os botões); (2) hover dos botões de ação da nota **padronizado** (mesmo realce em editar/arquivar/restaurar/excluir — corrige o valor CSS quebrado do arquivar); (3) **"Esvaziar"** treme + avisa quando não há lembretes (feedback de ação vazia, como a caixa 🗃️); (4) picker de emoji: **volta** pra categoria anterior ao rolar pra cima no topo (antes só avançava), e a troca de aba (avançar **e** voltar) ganhou um **pequeno atraso** (evita pular quando você só quer clicar num emoji do fim/topo); (5) **toolbar do editor mais fina** (menos altura); (6) **trava anti-duplo-clique** global nos botões (ignora cliques repetidos no mesmo botão em ~400ms — evita ações/alertas duplicados; emoji e toolbar de formato ficam de fora); (7) engrenagem ⚙️ de categorias **gira** ao clicar; (8) alerta de "nenhuma nota arquivada" **padronizado** (virou toast, era um tooltip próprio); (9) **ícone da barra de extensões** (`icon16/48/128.png`) regerado a partir do `sticky_pad_icon.svg` — agora bate com o logo do título |
