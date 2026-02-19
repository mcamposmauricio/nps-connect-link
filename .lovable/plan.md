
# Landing Page — Tradução PT/EN + Reestilização Alinhada à Identidade da Ferramenta

## Diagnóstico de Estado Atual

### Sobre a tradução
A landing page (`LandingPage.tsx`) e seus componentes filhos (`LandingFeatures`, `LandingTimeline`, `LandingKanban`, `LandingDifferentials`) têm **todo o texto hardcoded em inglês**, sem usar o sistema de i18n (`LanguageContext`) já existente no projeto.

### Sobre o estilo
A landing usa `#0F1115` como fundo (correto), `Manrope` (correto), `#FF7A59` como coral (correto). Mas há divergências visuais em relação à identidade da ferramenta:
- Os **componentes mock** (ChatMockup, NPSMockup, DashboardMockup) usam `#1E2433` como surface, mas o padrão do sistema é `#171C28` (Surface) e `#131722` (Sidebar)
- Os cards de features têm `boxShadow: "0 4px 24px rgba(0,0,0,0.3)"` — muito suave para a identidade dark-premium
- O badge "Early Access" usa `rgba(255,122,89,0.1)` mas deveria usar `rgba(255,122,89,0.08)` para mais sofisticação
- A tipografia dos headings no Hero está um pouco grande demais e o letterSpacing poderia ser mais refinado
- O formulário de lead não segue exatamente o padrão de bordas arredondadas de 8px (rounded-lg vs rounded-xl nos buttons)
- Os botões CTA usam `rounded-xl` enquanto o padrão da ferramenta é `rounded-lg` (8px)

---

## Solução — Duas frentes

### Frente 1 — Sistema de Língua da Landing Page

**Lógica de persistência (sem repetir toda vez que voltar):**
- Chave `landing_lang` no `localStorage`
- Na primeira visita (sem `landing_lang` salvo): detectar `navigator.language` — se começar com `"pt"`, usar `"pt-BR"`, caso contrário `"en"`
- Nas visitas seguintes: ler diretamente do `landing_lang` (ignorar o navegador)
- O botão no Navbar troca a língua e persiste no `localStorage`
- O botão exibe **sempre a língua oposta** ("PT" quando está em EN, "EN" quando está em PT)

```ts
// Inicialização
const initLang = () => {
  const saved = localStorage.getItem("landing_lang");
  if (saved) return saved as "en" | "pt-BR";
  // primeira visita — detectar pelo navegador
  return navigator.language.startsWith("pt") ? "pt-BR" : "en";
};
```

**Strings da landing em português** — adicionadas diretamente no `LandingPage.tsx` como um objeto `ptTexts` e `enTexts` (sem usar o `LanguageContext` do app, pois a landing é pública e não requer o Provider do sistema). Isso evita criar dependências desnecessárias.

**Conteúdo traduzido (PT-BR):**

| Seção | EN | PT-BR |
|---|---|---|
| Badge Hero | Early Access · Limited Spots | Acesso Antecipado · Vagas Limitadas |
| H1 | Turn Customer Success into Predictable Revenue. | Transforme Customer Success em Receita Previsível. |
| Subtítulo | Monitor churn in real time... | Monitore churn em tempo real. Automatize NPS... |
| CTA primário | Request Early Access | Solicitar Acesso Antecipado |
| Sub CTA | Launching soon. Early access is limited. | Em breve. Vagas de acesso antecipado limitadas. |
| Nav Sign In | Sign In | Entrar |
| Nav Go to Dashboard | Go to Dashboard | Ir ao Dashboard |
| Features section label | Core Modules | Módulos Principais |
| Features H2 | Everything your CS team needs... | Tudo que seu time de CS precisa... |
| Feature 1 | In-Product Conversations | Conversas no Produto |
| Feature 2 | NPS Connected to Revenue | NPS Conectado à Receita |
| Feature 3 | Revenue & Health Signals | Sinais de Receita e Health |
| Timeline label | CRM + Timeline | CRM + Timeline |
| Timeline H2 | Track every interaction... | Rastreie cada interação... |
| Kanban label | Customer Journey | Jornada do Cliente |
| Kanban H2 | Visualize every customer journey stage. | Visualize cada etapa da jornada do cliente. |
| Form label | Early Access | Acesso Antecipado |
| Form H2 | Be the First to Access Journey | Seja um dos Primeiros a Usar o Journey |
| Form subtitle | We are onboarding... | Estamos abrindo para um grupo limitado... |
| Form - Full Name | Full Name * | Nome Completo * |
| Form - Email | Work Email * | Email Corporativo * |
| Form - Company | Company Name * | Nome da Empresa * |
| Form - Role | Role / Position | Cargo / Função |
| Form submit | Join Early Access | Entrar para o Acesso Antecipado |
| Form footnote | Selected early users... | Usuários selecionados terão acesso direto... |
| Success | You're on the list! | Você está na lista! |
| Success sub | We'll reach out soon... | Entraremos em contato em breve com seu convite. |
| Submit another | Submit another | Enviar outro |
| Quote | Customer Experience is a Signal... | Experiência do Cliente é um Sinal... |
| Quote span | Revenue is the Outcome. | Receita é o Resultado. |
| Footer | Infrastructure for Revenue-Driven CS Teams | Infraestrutura para times de CS orientados a Receita |
| Footer copyright | All rights reserved. | Todos os direitos reservados. |

**Componentes filhos** (`LandingFeatures`, `LandingTimeline`, `LandingKanban`) receberão as strings via props ao invés de hardcode, para respeitar a língua selecionada.

---

### Frente 2 — Reestilização Alinhada à Identidade

**Ajustes por seção:**

**Navbar:**
- Botão de língua: estilo `ghost` consistente com os outros botões — `border: 1px solid rgba(255,255,255,0.08)`, fonte `text-xs font-medium uppercase tracking-widest`
- Separado dos outros botões por um `|` visual

**Hero:**
- Badge: opacidade reduzida para `rgba(255,122,89,0.08)` e `border rgba(255,122,89,0.15)` — mais sofisticado
- H1: `letterSpacing: "-0.025em"` (mais refinado)
- Botão CTA: mudar de `rounded-xl` para `rounded-lg` (padrão 8px)

**Features (LandingFeatures):**
- Cards: border mudar para `rgba(255,255,255,0.05)` — mais sutil
- Surface dos mocks: `#171C28` (mesmo da Surface do sistema) ao invés de `#1E2433`
- Botão CTA no card: `rounded-lg`

**Timeline (LandingTimeline):**
- Cabeçalho do card da empresa: surface `#131722` ao invés de `#171C28` para criar hierarquia visual correta
- A área interna do timeline: `#171C28` (Surface)

**Form:**
- `rounded-xl` → `rounded-lg` no card do form
- Inputs: já usam `rounded-lg` — OK
- Botão submit: `rounded-lg` ao invés de `rounded-xl`

**Footer:**
- Já está correto

---

## Arquivos a Modificar

| Arquivo | O que muda |
|---|---|
| `src/pages/LandingPage.tsx` | Adicionar estado de língua com persistência localStorage, botão de troca de língua no Navbar, objeto de strings EN/PT, passar strings como props para os componentes filhos, ajustes de estilo nos botões/badges |
| `src/components/landing/LandingFeatures.tsx` | Receber strings via props, ajustar cores de surface dos mocks, border dos cards |
| `src/components/landing/LandingTimeline.tsx` | Receber strings via props, ajustar cores de surface |
| `src/components/landing/LandingKanban.tsx` | Receber strings via props |

## O que NÃO é alterado

- `src/locales/pt-BR.ts` e `src/locales/en.ts` — nenhuma chave de landing adicionada nos arquivos globais (as strings ficam no próprio componente da landing)
- `LanguageContext` — não alterado
- Lógica do formulário de lead (submissão, validação, tracking)
- Qualquer outra página ou componente fora da landing
- CSS global (`index.css`)
