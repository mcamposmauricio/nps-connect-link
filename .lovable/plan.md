
# Remoção de Seções e Redução de Espaçamento na Landing Page

## O que será removido

### 1. Section 3 — Core Modules (LandingFeatures)
A linha `<LandingFeatures t={t} />` e seu bloco de comentário na linha 426–427 serão deletados. O componente `LandingFeatures.tsx` não será apagado — apenas deixará de ser renderizado na página.

O import `LandingFeatures` na linha 5 também será removido para limpar o código.

As chaves de texto relacionadas (`featuresLabel`, `featuresH2a`, `featuresH2b`, `featuresSub`, `feature1Title`, `feature1Desc`, `feature2Title`, `feature2Desc`, `feature3Title`, `feature3Desc`) podem permanecer no objeto `texts` sem problema pois não serão usadas e não afetam nada.

### 2. Section 6 — Final CTA com a quote
O bloco inteiro das linhas 553–576 (a `<section>` com a quote "Customer Experience is a Signal. Revenue is the Outcome." e o botão duplicado) será removido.

As chaves `quote` e `quoteSpan` no objeto `texts` também serão limpas dos dois idiomas.

---

## Redução de espaçamentos entre seções

As seções restantes usam `py-14` (56px top + bottom). Vamos reduzir para `py-10` (40px) nas seções intermediárias, mantendo o Hero com seu espaçamento atual.

| Seção | Antes | Depois |
|---|---|---|
| Hero | `py-16` | `py-12` |
| LandingTimeline (interno) | `py-14` | `py-8` |
| LandingKanban (interno) | `py-14` | `py-8` |
| Early Access Form | `py-14` | `py-10` |
| Footer | `py-10` | `py-7` |

Os componentes `LandingTimeline` e `LandingKanban` têm o `py-14` hardcoded internamente. Eles serão ajustados diretamente nos seus arquivos.

---

## Estrutura da página após as mudanças

```text
Navbar
Hero (py-12)
Timeline (py-8)
Kanban (py-8)
Early Access Form (py-10)
Footer (py-7)
```

---

## Arquivos a modificar

| Arquivo | O que muda |
|---|---|
| `src/pages/LandingPage.tsx` | Remover import + render de `LandingFeatures`, remover Section 6 (quote + CTA final), reduzir `py-16` → `py-12` no Hero, `py-14` → `py-10` no form, `py-10` → `py-7` no footer, limpar chaves `quote`/`quoteSpan` do objeto `texts` |
| `src/components/landing/LandingTimeline.tsx` | Reduzir `py-14` → `py-8` |
| `src/components/landing/LandingKanban.tsx` | Reduzir `py-14` → `py-8` |

## O que NÃO muda

- Lógica de idioma, persistência e toggle PT/EN
- Formulário de lead e submissão
- Seções Hero, Timeline, Kanban e Footer (apenas espaçamentos ajustados)
- Qualquer outra página ou componente fora da landing
