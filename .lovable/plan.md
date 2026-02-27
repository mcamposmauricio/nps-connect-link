

# Tema Escuro para Area Logada

## Resumo

Adicionar um tema escuro completo que sera o padrao **apenas para usuarios logados** (atendentes, admins, backoffice). Todas as rotas externas (widget, landing pages, auth, NPS response, embed, portal) permanecem no tema claro.

---

## Estrategia

Em vez de usar o `ThemeProvider` do `next-themes` (que aplica globalmente), o tema escuro sera controlado pela classe `dark` aplicada diretamente no wrapper do `SidebarLayout`. Isso garante isolamento total: paginas fora do layout protegido nunca recebem dark mode.

---

## 1. Variaveis CSS Dark (`src/index.css`)

Adicionar um bloco `.dark` dentro do `@layer base` com todas as variaveis invertidas:

```text
.dark {
  --background: 224 47% 5%;          /* #0B0E18 */
  --foreground: 220 15% 90%;         /* #E2E4EA */

  --card: 222 22% 10%;               /* #151A26 */
  --card-foreground: 220 15% 90%;

  --popover: 222 22% 10%;
  --popover-foreground: 220 15% 90%;

  --primary: 14 100% 67%;            /* Growth Coral */
  --primary-foreground: 0 0% 100%;

  --secondary: 222 18% 16%;
  --secondary-foreground: 220 15% 85%;

  --muted: 222 15% 14%;
  --muted-foreground: 220 10% 55%;

  --accent: 207 80% 52%;
  --accent-foreground: 0 0% 100%;

  --destructive: 0 85% 55%;
  --destructive-foreground: 0 0% 100%;

  --border: 222 15% 18%;
  --input: 222 15% 18%;
  --ring: 207 80% 52%;

  --sidebar-background: 224 35% 7%;
  --sidebar-foreground: 220 15% 85%;
  --sidebar-primary: 207 80% 52%;
  --sidebar-primary-foreground: 0 0% 100%;
  --sidebar-accent: 222 18% 14%;
  --sidebar-accent-foreground: 220 15% 85%;
  --sidebar-border: 222 15% 15%;
  --sidebar-ring: 207 80% 52%;
}
```

As cores semanticas (success, warning, promoter, etc.) mantem os mesmos valores no dark pois ja sao cores absolutas com bom contraste em ambos os temas.

## 2. Tailwind Config (`tailwind.config.ts`)

Adicionar `darkMode: "class"` ao config para habilitar as variantes `dark:` do Tailwind:

```text
export default {
  darkMode: "class",
  content: [...],
  ...
}
```

## 3. SidebarLayout - Aplicar Classe Dark (`src/components/SidebarLayout.tsx`)

O wrapper principal do `SidebarLayout` recebera a classe `dark` por padrao. Opcionalmente, o usuario pode alternar via um toggle na sidebar/header, persistido em `localStorage`.

Mudancas:
- Adicionar estado `isDark` inicializado de `localStorage` (default: `true`)
- Aplicar `className={isDark ? "dark" : ""}` no div raiz do layout
- As telas de loading e selecao de tenant dentro do SidebarLayout tambem receberao a classe

## 4. Toggle de Tema na Sidebar (`src/components/AppSidebar.tsx`)

Adicionar um botao de alternancia de tema no footer da sidebar, ao lado do logout:
- Icone `Sun`/`Moon` com transicao suave
- Tooltip "Tema claro" / "Tema escuro"
- Persiste a preferencia em `localStorage("journey-theme")`

Para isso, criar um mini-contexto ou simplesmente usar um callback passado via props do SidebarLayout para a AppSidebar.

## 5. ThemeProvider Global

Manter o `ThemeProvider` do `next-themes` com `defaultTheme="light"` no `App.tsx` como fallback, mas ele nao controlara o dark mode do backoffice. As rotas publicas continuarao usando o tema light que vem do `:root`.

## 6. Logos Condicionais

O SidebarLayout ja usa `/logo-dark.svg` e `/logo-icon-dark.svg`. No tema escuro, trocar para `/logo-light.svg` e `/logo-icon-light.svg`:
- Na sidebar: condicionar `src` baseado no estado `isDark`
- No loading screen: idem

## 7. Widget e Rotas Externas

Nenhuma mudanca. O `ChatWidget`, `NPSResponse`, `NPSEmbed`, `UserPortal`, `Auth`, `LandingPage`, `ChatLandingPage` ficam fora do `SidebarLayout` e nunca recebem a classe `dark`. A regra CSS `html[data-embed]` para transparencia permanece inalterada.

---

## Resumo de Arquivos

| Arquivo | Mudanca |
|---------|---------|
| `src/index.css` | Adicionar bloco `.dark` com variaveis de tema escuro |
| `tailwind.config.ts` | Adicionar `darkMode: "class"` |
| `src/components/SidebarLayout.tsx` | Aplicar classe `dark` condicionalmente + estado persistido |
| `src/components/AppSidebar.tsx` | Adicionar toggle Sun/Moon no footer |

**Sem mudancas no banco de dados. Sem mudancas em rotas externas ou no widget.**

