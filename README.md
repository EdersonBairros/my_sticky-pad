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

##  Versionamento

- **1.0.0** → Versão inicial monolítica
- **2.0.0** → Primeira refatoração modular
- **2.1.0** → Favoritos + scroll infinito em emojis
- **2.2.0** → Novo ícone com gradiente
- **3.0.0** → Refatoração completa com Clean Architecture