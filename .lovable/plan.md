
# Padronização Tipográfica — Manrope System Scale

## Diagnóstico

A tipografia está definida de forma **inconsistente** em ~35 arquivos:

- `h1` aparece como `text-2xl font-bold`, `text-4xl font-bold`, `text-[28px] font-medium` — sem padrão
- `font-bold` e `font-semibold` são usados intercambiavelmente sem hierarquia
- Não há uma escala tipográfica global definida em CSS — cada componente improvisa
- O `PageHeader` (componente reutilizado) usa `text-[28px]` em vez de um token semântico

## Estratégia

Ao invés de editar 35+ arquivos individualmente (frágil, risco de regressão), a solução é definir a escala **em dois pontos centrais**:

1. **`tailwind.config.ts`** — adicionar tokens de fonte semânticos (`fontSize`) com line-height e letter-spacing já embutidos
2. **`src/index.css`** — aplicar via `@layer base` as regras para `h1`, `h2`, `h3`, `body` globalmente
3. **`src/components/ui/page-header.tsx`** — atualizar para usar o token correto (`text-h1`)
4. **`src/components/ui/card.tsx`** — ajustar `CardTitle` de `font-semibold` para `font-medium`
5. **`src/components/ui/dialog.tsx`** — ajustar título de dialog para escala subheadline
6. **`src/components/ui/button.tsx`** — confirmar que já usa `font-medium` ✓ (já está correto)

---

## Escala Tipográfica Definida

| Token | Tamanho | Peso | Uso |
|---|---|---|---|
| `h1` / `text-h1` | 36px (clamp 32–40px) | Medium (500) | Títulos de página |
| `h2` / `text-h2` | 20px | Regular (400) | Subheadlines, seções |
| `h3` / `text-h3` | 18px | Medium (500) | Títulos de card, grupos |
| `body` | 15px | Regular (400) | Conteúdo geral |
| `text-sm` | 14px | Regular (400) | Labels, helper text |
| Botões | 14px | Medium (500) | Já correto no `button.tsx` |

Todos com `tracking-normal` (letter-spacing: 0) — sem exageros.

---

## Mudanças Planejadas

### 1. `tailwind.config.ts` — Adicionar tokens de fonte semânticos

```ts
extend: {
  fontSize: {
    // H1 — clamp entre 32 e 40px, centralizado em 36px
    'h1': ['clamp(32px, 2.5vw, 40px)', { lineHeight: '1.2', fontWeight: '500', letterSpacing: '0' }],
    // Subheadline
    'h2': ['20px', { lineHeight: '1.4', fontWeight: '400', letterSpacing: '0' }],
    // Card titles / section labels
    'h3': ['18px', { lineHeight: '1.4', fontWeight: '500', letterSpacing: '0' }],
    // Body text
    'body-md': ['15px', { lineHeight: '1.6', fontWeight: '400', letterSpacing: '0' }],
  }
}
```

### 2. `src/index.css` — Regras globais via `@layer base`

Adicionar ao bloco `@layer base` existente:

```css
@layer base {
  /* ... variáveis CSS já existentes ... */

  /* Escala tipográfica global */
  h1 {
    font-size: clamp(32px, 2.5vw, 40px);
    font-weight: 500;
    line-height: 1.2;
    letter-spacing: 0;
  }

  h2 {
    font-size: 20px;
    font-weight: 400;
    line-height: 1.4;
    letter-spacing: 0;
  }

  h3 {
    font-size: 18px;
    font-weight: 500;
    line-height: 1.4;
    letter-spacing: 0;
  }

  body {
    font-size: 15px;
    font-weight: 400;
    line-height: 1.6;
    letter-spacing: 0;
  }
}
```

Isso resolve automaticamente todos os `<h1>`, `<h2>`, `<h3>` espalhados no sistema sem tocar em cada arquivo.

### 3. `src/components/ui/page-header.tsx` — Usar token correto

```tsx
// ANTES
<h1 className="text-[28px] font-medium tracking-normal leading-tight">{title}</h1>
<p className="text-sm text-muted-foreground mt-1">{subtitle}</p>

// DEPOIS
<h1 className="text-h1">{title}</h1>
<p className="text-[15px] text-muted-foreground mt-1">{subtitle}</p>
```

O `text-h1` aplica automaticamente tamanho, peso e line-height corretos via o token Tailwind definido acima.

### 4. `src/components/ui/card.tsx` — CardTitle de semibold para medium

```tsx
// ANTES
<h3 ref={ref} className={cn("text-xl font-semibold leading-none tracking-tight", className)} {...props} />

// DEPOIS
<h3 ref={ref} className={cn("text-h3 leading-none", className)} {...props} />
```

### 5. `src/components/ui/dialog.tsx` — Dialog title para escala subheadline

```tsx
// ANTES
className={cn("text-lg font-semibold leading-none tracking-tight", className)}

// DEPOIS
className={cn("text-h3 leading-none", className)}
```

### 6. `src/components/ui/alert-dialog.tsx` — Mesmo ajuste

```tsx
// ANTES
className={cn("text-lg font-semibold", className)}

// DEPOIS
className={cn("text-h3", className)}
```

---

## Efeito Cascata (automático, sem edições adicionais)

Com as regras globais de `h1`, `h2`, `h3` no `@layer base`, os seguintes arquivos se corrigem **automaticamente**:

- `AdminBanners.tsx` — `<h1 className="text-2xl font-bold">` → o `font-bold` será sobrescrito pela regra global
- `AdminChatHistory.tsx` — `<h1 className="text-2xl font-semibold">`
- `OrganizationSettingsTab.tsx` — `<h2 className="text-2xl font-bold">`
- `CampaignDetails.tsx` — `<h1 className="text-4xl font-bold">`

> **Nota**: Classes Tailwind como `font-bold` têm especificidade de classe CSS, enquanto regras `@layer base` têm especificidade de elemento. Portanto, onde há conflito, os utilitários Tailwind vencerão. Por isso também ajustamos os 4 arquivos de componentes UI (card, dialog, alert-dialog, page-header) que são os mais críticos e reutilizados.

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---|---|
| `tailwind.config.ts` | Adicionar tokens `text-h1`, `text-h2`, `text-h3`, `text-body-md` |
| `src/index.css` | Adicionar regras globais `h1`, `h2`, `h3`, `body` no `@layer base` |
| `src/components/ui/page-header.tsx` | Usar `text-h1` em vez de `text-[28px] font-medium tracking-normal` |
| `src/components/ui/card.tsx` | `CardTitle` usar `text-h3` em vez de `text-xl font-semibold tracking-tight` |
| `src/components/ui/dialog.tsx` | `DialogTitle` usar `text-h3` em vez de `text-lg font-semibold tracking-tight` |
| `src/components/ui/alert-dialog.tsx` | `AlertDialogTitle` usar `text-h3` em vez de `text-lg font-semibold` |

## O que NÃO será alterado

- Lógica de negócio, hooks, queries
- Estrutura de rotas e permissões
- Cores, espaçamentos, bordas
- Componentes de badge, button (já correto), input
- Edge functions e banco de dados
