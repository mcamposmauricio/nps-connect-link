
# Remover Suporte a Tema Escuro Completamente

## Resumo

Remover todo o suporte a dark mode da aplicacao: bloco CSS `.dark`, toggle de tema no sidebar, `defaultTheme` para `"light"`, e limpeza de todas as classes `dark:` nos componentes.

## Arquivos a Alterar

### 1. `src/index.css`
- Remover o bloco `.dark { ... }` inteiro (linhas 76-109 aproximadamente) que define as variaveis CSS do tema escuro

### 2. `src/App.tsx`
- Mudar `defaultTheme="dark"` para `defaultTheme="light"` no `ThemeProvider`

### 3. `src/components/AppSidebar.tsx`
- Remover import de `Moon`, `Sun` (linha 25-26)
- Remover import de `useTheme` do `next-themes` (linha 30)
- Remover `const { theme, setTheme } = useTheme()` (linha 65)
- Fixar `logoSrc` e `iconSrc` para usar sempre as versoes light (linhas 133-134):
  - `const logoSrc = "/logo-light.svg"`
  - `const iconSrc = "/logo-icon-light.svg"`
- Remover o botao de toggle de tema no footer (linhas 483-490)

### 4. `src/components/ui/chart.tsx`
- Simplificar constante THEMES para apenas `{ light: "" }` (linha 7)

### 5. `src/components/ui/alert.tsx`
- Linha 12: remover `dark:border-destructive` da variante destructive

### 6. Limpeza de classes `dark:` nos componentes (13 arquivos, 89 ocorrencias)

Cada `dark:*` sera simplesmente removido da string de classes, mantendo apenas a versao light:

| Arquivo | Mudanca |
|---------|---------|
| `src/components/EmailSettingsTab.tsx` | Remover `dark:bg-blue-900/20`, `dark:text-blue-300` |
| `src/pages/AdminDashboard.tsx` | Remover `dark:bg-green-900/30 dark:text-green-400`, `dark:bg-amber-900/30 dark:text-amber-400` |
| `src/pages/AdminDashboardGerencial.tsx` | Remover `dark:bg-*` e `dark:text-*` nos status colors |
| `src/pages/AdminChatHistory.tsx` | Remover `dark:bg-*` e `dark:text-*` nos badges de status |
| `src/pages/AdminSettings.tsx` | Remover `dark:text-green-400` |
| `src/components/chat/ChatInput.tsx` | Remover `dark:text-yellow-400` |
| `src/components/chat/ChatMessageList.tsx` | Remover `dark:bg-yellow-900/30`, `dark:border-yellow-700`, `dark:text-yellow-400` |
| `src/components/chat/ReadOnlyChatDialog.tsx` | Remover `dark:text-yellow-400` |
| `src/components/CNPJPreview.tsx` | Remover `dark:text-emerald-500` |
| `src/components/ImportApiKeysTab.tsx` | Remover `dark:text-amber-400` |
| `src/components/portal/PortalChatList.tsx` | Remover todos os `dark:bg-*` e `dark:text-*` nos badges |

### 7. `tailwind.config.ts`
- Remover a linha `darkMode: ["class"]` (linha 4), pois nao sera mais necessaria

## Resultado

A aplicacao funcionara exclusivamente no tema claro. O toggle de tema desaparece do sidebar, e nenhuma classe `dark:` tera efeito. A paleta de cores sera determinada apenas pelas variaveis `:root`.
