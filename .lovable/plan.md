

# Correcao Definitiva do Flickering no Menu

## Causa Raiz

O hook `useAuth()` usa `useState` local. Cada vez que o usuario navega, o `SidebarLayout` remonta, criando uma **nova instancia** do `useAuth()` que comeca com `loading: true`. Isso exibe o spinner por um instante ate a sessao ser verificada novamente, causando o flicker.

## Solucao

Transformar o `useAuth` em um **Context Provider** no nivel da aplicacao. Assim, o estado de autenticacao e carregado **uma unica vez** e compartilhado por todos os componentes que precisam dele.

## Mudancas

### 1. Criar `src/contexts/AuthContext.tsx` (novo arquivo)

- Mover toda a logica de `useAuth.ts` (getSession, roles, permissions, tenant) para dentro de um `AuthProvider`
- Criar o contexto com `createContext` e expor via `useAuth()` hook
- O estado `loading` so sera `true` na primeira carga da aplicacao

### 2. Atualizar `src/hooks/useAuth.ts`

- Simplificar para apenas consumir o `AuthContext`
- Manter a mesma interface de retorno (`user`, `isAdmin`, `loading`, etc.) para compatibilidade total
- Nenhuma pagina precisa ser alterada pois todas usam `useAuth()` da mesma forma

### 3. Atualizar `src/App.tsx`

- Envolver a aplicacao com `<AuthProvider>` dentro do `BrowserRouter` (precisa de acesso ao router para navegacao)
- Posicionar acima das `<Routes>` para que o estado persista entre navegacoes

### 4. Atualizar `src/components/SidebarLayout.tsx`

- O `useAuth()` agora vem do contexto compartilhado
- Na primeira visita, `loading` sera `true` e mostrara o spinner
- Em navegacoes subsequentes, `loading` ja sera `false` e o layout renderiza instantaneamente sem flicker

## Por que isso resolve

```text
Antes (hook local):
  Clica no menu → SidebarLayout remonta → useAuth() novo → loading=true → SPINNER → fetch → loading=false → renderiza

Depois (context global):
  Clica no menu → SidebarLayout remonta → useAuth() do contexto → loading=false (ja carregado) → renderiza IMEDIATAMENTE
```

## Arquivos

| # | Arquivo | Acao |
|---|---------|------|
| 1 | `src/contexts/AuthContext.tsx` | Criar - Provider com toda a logica de autenticacao |
| 2 | `src/hooks/useAuth.ts` | Modificar - Consumir do contexto em vez de gerenciar estado local |
| 3 | `src/App.tsx` | Modificar - Adicionar `<AuthProvider>` envolvendo as rotas |
| 4 | `src/components/SidebarLayout.tsx` | Sem mudanca necessaria - funciona automaticamente |

