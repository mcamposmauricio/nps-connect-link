
# Nova Landing Page "Journey In-App Chat" em `/` + Mover LP atual para `/journey`

## Visão Geral

A tarefa tem duas partes:

1. **Mover** a `LandingPage.tsx` atual (Journey Platform) para a rota `/journey`, renomeando o arquivo para `JourneyLandingPage.tsx` e adicionando um link no navbar para a nova LP de Chat.
2. **Criar** uma nova `ChatLandingPage.tsx` no root `/` com branding "Journey In-App Chat", focada em startups B2B SaaS — com seu próprio navbar contendo link para `/journey`.

Ambas as páginas mantêm todas as funcionalidades existentes (auth check, lang toggle, links de sign in/dashboard).

---

## Estrutura de Rotas (App.tsx)

```text
/           → ChatLandingPage  (NOVA - In-App Chat)
/journey    → JourneyLandingPage  (ATUAL LandingPage renomeada)
```

O link de navegação cruzada ficará no navbar de cada página:
- Na nova `ChatLandingPage` (root): link "Journey Platform →" apontando para `/journey`
- Na `JourneyLandingPage` (/journey): link "In-App Chat →" apontando para `/`

---

## Parte 1 — Renomear/Mover LP Atual para `/journey`

### Arquivo: `src/pages/LandingPage.tsx`
- Renomear o arquivo para `src/pages/JourneyLandingPage.tsx` (ou criar alias)
- Adicionar um link no navbar entre o lang toggle e o sign in:  
  `"In-App Chat →"` → navega para `/`

### Arquivo: `src/App.tsx`
- Trocar `<Route path="/" element={<LandingPage />} />` → `<Route path="/journey" element={<JourneyLandingPage />} />`
- Adicionar `<Route path="/" element={<ChatLandingPage />} />`

---

## Parte 2 — Nova `ChatLandingPage.tsx` (root `/`)

### Paleta de Cores
| Token | Valor |
|---|---|
| Background | `#0F1115` (dark navy, consistente com design system) |
| Surface | `#131722` |
| Card | `#171C28` |
| Primary CTA | `#FF7A59` (Coral) |
| Accent Blue | `#3498DB` |
| Success Green | `#2ECC71` |

> Note: O `#1A2B48` do brief seria uma mudança brusca em relação ao design system atual. Optamos por manter o `#0F1115` para coerência visual entre as duas LPs, mas o glow e os gradientes introduzem a sensação de "azul naval profundo" pedida.

### Estrutura de Seções

```text
1. Navbar
2. Hero
3. Social Proof (faixa de logos)
4. Diferenciais (grid 3 colunas)
5. Integrações (Slack, HubSpot, Pipedrive)
6. Final CTA (gradiente azul → coral)
7. Footer
```

---

### Seção 1 — Navbar

- Logo Journey à esquerda (mesmo `/logo-dark.svg`)
- Links de navegação: "Funcionalidades", "Integrações", "Preços" (scroll anchor)
- Link cruzado: `"Journey Platform →"` → `/journey`
- Lang toggle (PT/EN)
- Botão ghost: "Entrar" / "Dashboard"
- Botão CTA coral: "Começar Grátis"

---

### Seção 2 — Hero

Layout **2 colunas** no desktop (texto esquerda, mockup direita), stack vertical no mobile.

**Texto:**
- Badge: "In-App Chat · Para B2B SaaS"
- H1: `"Transforme conversas dentro do app em retenção de receita"` (EN: `"Turn in-app conversations into revenue retention"`)
- Subtítulo: `"O chat in-app mais leve do mercado, projetado para startups B2B que precisam de contexto real para fechar tickets e identificar oportunidades de expansão."` 
- CTA primário: `"Instalar em 5 minutos"` (botão coral grande com ícone)
- Sub-CTA: `"Sem cartão de crédito · Setup em minutos"`

**Visual (lado direito):**
Um mockup de widget de chat flutuante — construído com `div`s, sem imagem — simulando um widget no canto inferior direito de uma interface SaaS genérica. Inclui:
- Uma janela de chat com header do agente, mensagens alternadas (visitante/agente) e um input bar
- Um badge flutuante de "contexto" mostrando dados do plano do usuário (Plan: Pro, MRR impact: $2.4k)

---

### Seção 3 — Social Proof

Faixa sutil com:
- Texto: `"Startups que escalam com a Journey"` (EN: `"Startups scaling with Journey"`)
- 5 logotipos fictícios (texto em cinza, fonte mono, estilo placeholder): `Acme SaaS`, `Orbit`, `Stackly`, `Claros`, `Veryfi`

---

### Seção 4 — Diferenciais (3 colunas)

3 cards `rounded-xl` com:
1. **Contexto em Tempo Real** — ícone `Eye`, cor `#3498DB`  
   "Veja os metadados do plano e comportamento do usuário antes mesmo de responder."
2. **Central de Ajuda Integrada** — ícone `BookOpen`, cor `#2ECC71`  
   "Reduza o volume de tickets permitindo que o usuário se ajude sem sair do chat."
3. **Foco em Sucesso** — ícone `TrendingUp`, cor `#FF7A59`  
   "Identifique automaticamente se a conversa é um risco de churn ou chance de upsell."

---

### Seção 5 — Integrações

Bloco centralizado com:
- Título: `"Responda do Slack, sincronize com seu CRM"`
- Sub: `"Conecte em 1 clique com as ferramentas que seu time já usa"`
- 3 badges de integração: **Slack** (ícone `Hash`), **HubSpot** (ícone `BarChart2`), **Pipedrive** (ícone `GitMerge`)
- Cada badge tem logo/ícone + nome + linha de status "Conectado ✓"

---

### Seção 6 — Final CTA

Fundo com `background: "linear-gradient(135deg, #131722 0%, #1A2B48 50%, #2A1F18 100%)"` com glow coral suave.

- Título: `"Pronto para elevar o nível do seu atendimento?"`
- Sub: `"Instale o widget em minutos e comece a ver o contexto dos seus usuários."`
- Botão: `"Criar conta gratuita agora"` (coral, grande)
- Detalhe: `"Grátis para sempre até 500 conversas/mês"`

---

### Seção 7 — Footer

Mesmo padrão do footer atual: logo + tagline + copyright.

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---|---|
| `src/pages/ChatLandingPage.tsx` | **CRIAR** — nova LP In-App Chat no root |
| `src/pages/LandingPage.tsx` | **MODIFICAR** — adicionar link "In-App Chat →" para `/` no navbar |
| `src/App.tsx` | **MODIFICAR** — mover rota `/` para `ChatLandingPage`, adicionar rota `/journey` para `LandingPage` |

## O que NÃO muda

- `LandingPage.tsx` (apenas +1 link no navbar)
- Todos os sub-componentes (`LandingTimeline`, `LandingKanban`, `LandingFeatureRows`)
- Rota `/auth`, `/nps/*`, `/admin/*` e demais rotas internas
- Lógica de autenticação e supabase
- Design system, cores e fontes do projeto
