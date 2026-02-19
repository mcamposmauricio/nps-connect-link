
# Ajustes Visuais — Landing Page

## Alterações Solicitadas

### 1. Logos maiores (mais visibilidade)

**Navbar** (`LandingPage.tsx`, linha 134):
- `className="h-7 w-auto"` → `className="h-9 w-auto"`

**Footer** (`LandingPage.tsx`, linha 383):
- `className="h-6 w-auto"` → `className="h-8 w-auto"`

---

### 2. Diminuir tons de coral nas letras

O coral `#FF7A59` aparece em **textos** (não botões) em dois lugares críticos:

- **Hero** — `<span style={{ color: "#FF7A59" }}>Predictable Revenue.</span>` → mudar para `rgba(255,122,89,0.72)` (tom mais suave, menos saturado)
- **Final CTA** — `<span style={{ color: "#FF7A59" }}>Revenue is the Outcome."</span>` → mesma redução
- **Labels de seção** em coral (ex: `color: "#FF7A59"` no label "CRM + Timeline") → `rgba(255,122,89,0.72)`

Botões **não são alterados** — continuam com `#FF7A59` sólido, pois precisam de contraste máximo para conversão.

---

### 3. Diminuir espaçamento entre as seções

Cada seção usa `py-24` (96px top + bottom). Reduzir para `py-14` (56px):

| Arquivo | Seção | Mudança |
|---|---|---|
| `LandingPage.tsx` | Hero | `py-32` → `py-20` e `minHeight: "88vh"` → `"72vh"` |
| `LandingPage.tsx` | Early Access Form | `py-24` → `py-14` |
| `LandingPage.tsx` | Final CTA | `py-24` → `py-14` |
| `LandingFeatures.tsx` | Core Modules | `py-24` → `py-14` |
| `LandingTimeline.tsx` | CRM Timeline | `py-24` → `py-14` |

---

### 4. Retirar a seção do Kanban

O usuário enviou um print da seção Kanban (Customer Journey Pipeline) — essa é a seção a ser removida.

**`LandingPage.tsx`**: remover a linha que importa e renderiza `<LandingKanban />`:
```tsx
// Remover import:
import LandingKanban from "@/components/landing/LandingKanban";

// Remover do JSX:
{/* ── SECTION 4: KANBAN ─────────────────────────────── */}
<LandingKanban />
```

O arquivo `LandingKanban.tsx` pode ser mantido no projeto (não deletado), já que pode ser reutilizado futuramente.

---

### 5. Textos mais próximos da landing anterior

Comparando o arquivo original fornecido no contexto inicial com a versão atual, os textos do hero eram idênticos. O usuário quer que a subheadline do hero seja mais direta, sem quebras de linha artificiais:

**Hero subheadline** — de:
```
Monitor churn in real time. Automate NPS. Track customer health.
Engage customers in-product. Manage journeys and revenue signals
in one unified platform.
```
Para um parágrafo fluido sem `<br />` forçados (mais próximo da versão anterior).

**Seção Core Modules** — o subtítulo voltará para versão mais concisa:
- "Everything your CS team needs. In one unified platform." (idêntico à versão anterior)

---

## Arquivos a Modificar

| Arquivo | Mudanças |
|---|---|
| `src/pages/LandingPage.tsx` | Logo maior (navbar + footer), coral mais suave em textos, espaçamentos reduzidos, remoção do import e render de `LandingKanban`, subheadline do hero sem quebras forçadas |
| `src/components/landing/LandingFeatures.tsx` | `py-24` → `py-14` |
| `src/components/landing/LandingTimeline.tsx` | `py-24` → `py-14` |

## O que NÃO é alterado

- Cores dos botões (coral sólido mantido)
- Lógica do formulário e submissão de leads
- Mockups visuais (Chat, NPS, Dashboard, Timeline)
- Backend, rotas, autenticação
- Design system global
