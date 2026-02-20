
# Ajustes na Landing Page In-App Chat e na LP Journey

## Resumo das Mudanças

São 4 mudanças distintas, em 3 arquivos.

---

## 1. ChatLandingPage.tsx — Remover Prova Social e Integrações

**Seção Social Proof** (faixa com "Startups que escalam com a Journey" + logos fictícios): removida integralmente.

**Seção Integrações** (`id="integrations"`) com Slack, HubSpot e Pipedrive: removida integralmente.

Resultado: a página ficará Hero → Diferenciais → Final CTA → Footer.

---

## 2. ChatLandingPage.tsx — Remover links "Funcionalidades" e "Integrações" do Navbar

O navbar atualmente tem um bloco `hidden md:flex` com dois botões de scroll (`features` e `integrations`) + o link "Journey Platform →". Como as seções de destino foram removidas, os dois botões de scroll também saem. Sobra apenas o link cruzado para `/journey`.

---

## 3. ChatLandingPage.tsx + LandingPage.tsx — Remover a seta dos links cruzados

- Em `ChatLandingPage.tsx`: `navCrossLink` em PT e EN passa de `"Journey Platform →"` para `"Journey Platform"` (sem seta).
- Em `LandingPage.tsx`: o texto hardcoded `"In-App Chat →"` no Link passa para `"In-App Chat"` (sem seta).

---

## 4. LandingFeatures.tsx — Inverter a alternância das Feature Rows na LP Journey

Atualmente:
- Row 1 (Conversas no Produto): texto esquerda, card direita (`cardRight: true`)
- Row 2 (NPS): card esquerda, texto direita (`cardRight: false`)
- Row 3 (Dashboard): texto esquerda, card direita (`cardRight: true`)

**Novo comportamento** (card primeiro, texto depois — começando em imagem):
- Row 1 (Conversas no Produto): **card esquerda, texto direita** → `cardRight: false`
- Row 2 (NPS): **texto esquerda, card direita** → `cardRight: true`
- Row 3 (Dashboard): **card esquerda, texto direita** → `cardRight: false`

Isso inverte a alternância para que a primeira seção de feature mostre o mockup à esquerda e o texto à direita, conforme solicitado.

---

## Arquivos a Modificar

| Arquivo | O que muda |
|---|---|
| `src/pages/ChatLandingPage.tsx` | Remover seção Social Proof, remover seção Integrações, remover botões de nav "Funcionalidades"/"Integrações", remover `→` do navCrossLink em PT e EN |
| `src/pages/LandingPage.tsx` | Remover `→` do link "In-App Chat →" |
| `src/components/landing/LandingFeatures.tsx` | Inverter `cardRight` nas 3 rows: `false → true → false` |

## O que NÃO muda

- Seção de Diferenciais (3 cards) na ChatLandingPage
- Final CTA e Footer em ambas as páginas
- Hero, Timeline, Kanban e formulário na LP Journey
- Lógica de idioma, autenticação e submissão de leads
- Qualquer outra rota ou componente
