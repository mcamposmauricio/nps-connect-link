
# Ajustes no Menu do Workspace e Contadores em Tempo Real

## Problemas identificados

1. **Clicar em "Workspace" no menu navega para a rota com o parametro `?attendant=` de outro atendente** em vez de abrir a fila propria do usuario.
2. **Os subitens de equipe mostram nomes genericos** e nao diferenciam o usuario logado como "Sua fila".
3. **O contador de chats ativos no menu nao atualiza em tempo real** quando um chat e transferido -- so atualiza com F5.
4. **O item "Workspace" no menu nao reflete o conceito de "Sua fila"** com o contador de chats do proprio usuario.

## Solucao

### 1. "Workspace" sempre abre a fila propria do usuario

No `AppSidebar.tsx`, o botao "Workspace" vai navegar para `/admin/workspace` (sem parametro `attendant`), garantindo que sempre abra a visao propria.

### 2. Reorganizar subitens: "Sua fila" + nomes dos colegas

Remover o item separado "Workspace" e o sub-grupo "Equipe". Em vez disso, apos expandir o collapsible do Chat, exibir direto:

- **Dashboard** (como ja esta)
- **Sua fila (N)** -- navega para `/admin/workspace` sem parametro, badge com contagem de chats do usuario logado
- **Nome Atendente A (N)** -- navega para `/admin/workspace?attendant=<id>`
- **Nome Atendente B (N)** -- idem
- **Historico, Atendentes, Banners, etc.** (como ja estao)

A identificacao de "Sua fila" sera feita buscando o `attendant_profiles.id` do usuario logado e comparando com a lista de atendentes.

### 3. Contadores com Realtime

Substituir o `useEffect` que busca atendentes e contagens apenas uma vez por uma implementacao com **Supabase Realtime subscription** na tabela `chat_rooms`. Quando qualquer sala muda de `attendant_id` ou `status`, a contagem e recalculada automaticamente.

Fluxo:
- Fetch inicial de `attendant_profiles` + contagem de `chat_rooms` com `status` in (`active`, `waiting`)
- Subscription em `postgres_changes` na tabela `chat_rooms` para eventos `INSERT`, `UPDATE`, `DELETE`
- A cada evento, re-fetch das contagens (query leve de `select attendant_id, count`)
- Cleanup do channel no unmount

### 4. Badge no item "Sua fila"

O item "Sua fila" tera uma badge mostrando quantos chats estao atribuidos ao usuario logado (incluindo ativos). Isso da visao rapida sem clicar.

## Mudancas tecnicas

### Arquivo: `src/components/AppSidebar.tsx`

1. **Buscar `attendant_profiles.id` do usuario logado** usando `user.id` do `useAuth()`
2. **Reestruturar lista** dentro do collapsible Chat:
   - "Sua fila" com contagem propria (primeiro item, destaque)
   - Demais atendentes (exceto o logado) com suas contagens
   - Sem sub-collapsible "Equipe" -- todos direto no nivel
3. **Adicionar subscription Realtime** em `chat_rooms` para atualizar contagens automaticamente
4. **Navegacao**: "Sua fila" navega para `/admin/workspace` (limpo), colegas para `/admin/workspace?attendant=<id>`
5. **isActive**: "Sua fila" fica ativo quando pathname e `/admin/workspace` e NAO tem `attendant` no search params

### Nenhuma mudanca em outros arquivos

O `AdminWorkspace.tsx` ja trata corretamente a ausencia de `attendant` param como "minha fila" e a presenca como "fila de outro atendente".

## Estrutura visual do menu

```text
Chat
  Dashboard
  Sua fila                    [3]   <-- sempre abre /admin/workspace
  Ana Silva                   [2]   <-- /admin/workspace?attendant=xxx
  Carlos Santos               [1]   <-- /admin/workspace?attendant=yyy
  Historico
  Atendentes
  Banners
  Gerencial
  Configuracoes
```

## Arquivo modificado

| # | Arquivo | Descricao |
|---|---------|-----------|
| 1 | `src/components/AppSidebar.tsx` | Reestruturar subitens, "Sua fila", realtime nos contadores |
