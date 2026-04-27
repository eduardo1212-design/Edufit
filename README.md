# ⚡ EduFit — App de Treino do Eduardo

App de controle de treinos pessoal, responsivo, com suporte a PWA (instalável no celular).

---

## 📂 Estrutura de Arquivos

```
edufit/
├── index.html          → Estrutura do app
├── style.css           → Estilos (dark mode premium)
├── script.js           → Toda a lógica do app
├── manifest.json       → Config PWA
├── service-worker.js   → Cache offline
├── gerar-icones.html   → Ferramenta para gerar os ícones
└── icons/              → (criar manualmente — veja passo abaixo)
    ├── icon-72.png
    ├── icon-96.png
    ├── icon-128.png
    ├── icon-144.png
    ├── icon-152.png
    ├── icon-192.png
    ├── icon-384.png
    └── icon-512.png
```

---

## 🚀 Como Usar Localmente (VS Code)

1. Abra a pasta `edufit/` no VS Code
2. Instale a extensão **Live Server**
3. Clique com botão direito em `index.html` → **"Open with Live Server"**
4. O app abre em `http://127.0.0.1:5500/`

> ⚠️ O Service Worker só funciona com Live Server (ou HTTPS). Não use `file://`.

---

## 🖼️ Gerar os Ícones PWA

1. Abra `gerar-icones.html` no navegador (via Live Server ou direto)
2. Clique em **"Baixar Todos os Ícones"**
3. Crie a pasta `icons/` dentro de `edufit/`
4. Mova todos os arquivos `.png` baixados para `edufit/icons/`

---

## 📱 Instalar no Celular (PWA)

### Android (Chrome):
1. Acesse o app hospedado ou via Live Server na mesma rede Wi-Fi
2. Menu do Chrome (⋮) → **"Adicionar à tela inicial"**
3. Confirme → Ícone aparece na home

### iPhone (Safari):
1. Acesse o app no Safari
2. Toque em **Compartilhar** (ícone de seta ↑)
3. **"Adicionar à Tela de Início"**
4. Confirme → App instalado!

---

## ☁️ Deploy no Vercel

1. Faça login em [vercel.com](https://vercel.com)
2. Clique em **"Add New Project"**
3. Importe a pasta `edufit/` (ou arraste para o deploy)
4. Clique em **Deploy**
5. Seu app terá uma URL HTTPS — perfeito para PWA!

Ou via CLI:
```bash
npm i -g vercel
cd edufit
vercel
```

---

## 🎯 Funcionalidades

- ✅ Dashboard com estatísticas semanais
- ✅ 7 dias configurados (seg a dom)
- ✅ Adicionar / editar / excluir exercícios
- ✅ Modo treino com séries clicáveis
- ✅ Timer de descanso configurável (60s–180s)
- ✅ Histórico de cargas (PR e última carga)
- ✅ Gráfico de evolução por exercício
- ✅ Duplicar treino entre dias
- ✅ Reset semanal
- ✅ Exportar / importar backup JSON
- ✅ PWA — funciona offline
- ✅ Instalável no celular (Android + iPhone)
- ✅ Dark mode premium

---

## ⌨️ Atalhos de Teclado

| Tecla | Ação |
|-------|------|
| `Esc` | Fechar modal / timer |
| `/`   | Abrir busca de exercícios |

---

## 🛠️ Tecnologias

- HTML5, CSS3, JavaScript puro (sem bibliotecas)
- localStorage para persistência
- Canvas API para gráficos
- Service Worker + Manifest para PWA
- Fontes: Bebas Neue + DM Sans (Google Fonts)

---

Made with ⚡ for Eduardo
