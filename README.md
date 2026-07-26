# 📝 My Sticky Pad — WebExtension

Uma extensão de navegador (Chrome/Firefox Manifest V3) que funciona como um bloco de notas post-it em popup. Crie lembretes rápidos com formatação de texto, emojis, cores personalizadas, exportação e importação de dados.

## ✨ Funcionalidades

- ✅ Criar, editar e excluir lembretes
- ✅ Formatação de texto (negrito, itálico, sublinhado, listas)
- ✅ Seletor de emojis com categorias e favoritos
- ✅ Rolagem infinita entre categorias de emoji
- ✅ Cores personalizadas (predefinidas + gradiente customizado)
- ✅ Redimensionamento da janela popup arrastando as bordas
- ✅ Exportar notas para arquivo JSON
- ✅ Importar notas de arquivo JSON (adiciona às existentes)
- ✅ Persistência local (localStorage)
- ✅ Modo edição com toolbar de formatação

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
│   └── note.js                → Modelo Note (factory e validação)
├── services/
│   ├── storage.service.js     → Persistência em localStorage (sem acoplamento com UI)
│   └── export.service.js      → Serialização, download e parse de JSON
├── ui/
│   ├── notes.renderer.js      → Criação e renderização dos elementos DOM das notas
│   ├── editor.js              → Toolbar de formatação e comandos contenteditable
│   ├── color-picker.js        → Seletor de cores com gradiente canvas
│   ├── emoji-picker.js        → Seletor de emojis com categorias, scroll infinito e favoritos
│   ├── resize.js              → Handles de redimensionamento do popup
│   ├── options-menu.js        → Menu de opções (⋮) com exportar/importar
│   └── notifications.js       → Sistema de notificações toast
├── utils/
│   ├── date.js                → Formatação relativa de datas
│   └── color.js               → Utilitários de cor (escurecer, validar hex)
└── index.js                   → Entry point (DOMContentLoaded → bootstrap)
```

### Princípios

- **SRP (Single Responsibility Principle)**: Cada arquivo tem uma única responsabilidade
- **Baixo acoplamento**: Services não manipulam DOM; UI não acessa localStorage diretamente
- **Alta coesão**: Funções relacionadas estão no mesmo módulo
- **Estado mínimo**: O estado global é gerenciado apenas pelo storage service
- **Zero alert()**: Substituído por notificações toast não-bloqueantes

## 🔄 Fluxo da Aplicação

```
1. Usuário abre a extensão (clica no ícone)
2. popup.html carrega todos os módulos src/ na ordem correta
3. index.js dispara DOMContentLoaded → bootstrap()
4. bootstrap() inicializa:
   - Storage (carrega notas do localStorage)
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

## 📦 Como Gerar o .zip para Publicação

```bash
python -c "import zipfile, os
files = ['manifest.json','popup.html','popup.css',
'icons/icon16.png','icons/icon48.png','icons/icon128.png','icons/icon16.svg',
'src/core/constants.js','src/utils/date.js','src/utils/color.js',
'src/data/emojis.js','src/models/note.js',
'src/services/storage.service.js','src/services/export.service.js',
'src/ui/notifications.js','src/ui/resize.js','src/ui/editor.js',
'src/ui/emoji-picker.js','src/ui/color-picker.js','src/ui/notes.renderer.js',
'src/ui/options-menu.js','src/core/note.controller.js','src/core/app.js',
'src/index.js']
with zipfile.ZipFile('sticky-pad-extensao.zip','w',zipfile.ZIP_DEFLATED) as z:
    for f in files:
        if os.path.exists(f):
            z.write(f)"
```

## 📤 Como Publicar

### Chrome Web Store

1. Acesse [chrome.google.com/webstore/devconsole](https://chrome.google.com/webstore/devconsole)
2. Faça login com sua conta Google
3. Clique em **"New item"**
4. Envie o arquivo `.zip`
5. Preencha os dados da listagem
6. Submeta para revisão

### Firefox Add-ons (Mozilla)

1. Acesse [addons.mozilla.org](https://addons.mozilla.org)
2. Vá em **"Developer Hub"** → **"Submit a New Add-on"**
3. Escolha **"On this site"**
4. Envie o arquivo `sticky-pad-extensao.zip`
5. Preencha os dados da listagem
6. Submeta para revisão automática

## 📊 Métricas do Projeto

| Métrica | Valor |
|---------|-------|
| Total de linhas (JS) | ~1.444 |
| Total de linhas (CSS) | ~927 |
| Total de linhas (HTML) | ~61 |
| Módulos JS | 17 |
| Arquivos totais | ~20 |

## 📝 Versionamento

- **1.0.0** → Versão inicial monolítica
- **2.0.0** → Primeira refatoração modular
- **2.1.0** → Favoritos + scroll infinito em emojis
- **2.2.0** → Novo ícone com gradiente
- **3.0.0** → Refatoração completa com Clean Architecture