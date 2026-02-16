

# Correcao de 3 Bugs: Navegacao, Flickering e Dark Mode

## Problemas Identificados

### 1. "Visao Geral" navega para a Landing Page
No `AppSidebar.tsx` (linha 113), o item "Visao Geral" tem `path: "/"`, que e a rota da `LandingPage`. O correto e `/cs-dashboard`.

### 2. Menu piscando a cada clique
O `SidebarLayout.tsx` executa `checkAuth` (chamada ao Supabase) toda vez que o componente monta. Como cada navegacao remonta o layout, isso causa um estado `loading = true` momentaneo que exibe o spinner e esconde o conteudo, gerando o "piscar". A solucao e usar o hook `useAuth` ja existente (que compartilha estado via cache) em vez de fazer uma chamada avulsa ao Supabase.

### 3. Botao Dark Mode nao funciona
O `useTheme()` do `next-themes` requer um `ThemeProvider` envolvendo a aplicacao. Esse provider nao existe no `App.tsx` nem no `main.tsx`. Sem ele, `setTheme()` nao faz nada.

---

## Solucoes

### Arquivo 1: `src/components/AppSidebar.tsx`
- Alterar linha 113: `path: "/"` para `path: "/cs-dashboard"`

### Arquivo 2: `src/components/SidebarLayout.tsx`
- Remover a logica manual de `checkAuth` com `useState(loading)` e `supabase.auth.getSession()`
- Usar o hook `useAuth()` que ja existe no projeto e gerencia sessao de forma centralizada
- Isso elimina o estado de loading intermediario que causa o flickering

### Arquivo 3: `src/App.tsx`
- Importar `ThemeProvider` de `next-themes`
- Envolver toda a aplicacao com `<ThemeProvider attribute="class" defaultTheme="light">`
- O atributo `attribute="class"` adiciona a classe `dark` ao elemento `<html>`, que e como o Tailwind CSS aplica dark mode

---

## Detalhes Tecnicos

### SidebarLayout simplificado
```text
Antes:
  - useState(loading) = true
  - useEffect -> supabase.auth.getSession() -> se nao tem sessao, redireciona -> setLoading(false)
  - Enquanto loading, mostra spinner (causa o flash)

Depois:
  - useAuth() -> { user, loading }
  - Se loading, mostra spinner (so na primeira carga, nao em cada navegacao)
  - Se !user e !loading, redireciona
  - Sem remontagem do estado entre navegacoes
```

### ThemeProvider no App.tsx
```text
<ThemeProvider attribute="class" defaultTheme="light">
  <QueryClientProvider>
    <LanguageProvider>
      <TooltipProvider>
        ...
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
</ThemeProvider>
```

O `attribute="class"` faz o provider adicionar/remover a classe `dark` no `<html>`, ativando as variaveis CSS do dark mode definidas no `index.css`.

---

## Arquivos Modificados

| # | Arquivo | Mudanca |
|---|---------|---------|
| 1 | `src/components/AppSidebar.tsx` | Corrigir path do "Visao Geral" de `/` para `/cs-dashboard` |
| 2 | `src/components/SidebarLayout.tsx` | Substituir checkAuth manual por useAuth(), eliminar loading desnecessario |
| 3 | `src/App.tsx` | Adicionar ThemeProvider do next-themes envolvendo a app |

