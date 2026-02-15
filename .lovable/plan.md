

# Reestruturacao do Menu "Workspace" na Sidebar

## Resumo

Transformar o item "Sua fila" e a lista de atendentes avulsos em um **submenu colapsavel** chamado "Estacao de Trabalho" (pt-BR) / "Workspace" (en). O usuario logado aparece como uma linha dentro do submenu, junto com os colegas dos times em que participa. O badge do menu principal mostra o total de chats de todos os membros visiveis.

---

## Comportamento desejado

1. **Nome do menu**: "Estacao de Trabalho" em portugues, "Workspace" em ingles
2. **Menu colapsavel**: ao clicar na seta, expande e mostra todos os atendentes dos times do usuario logado
3. **Badge totalizador**: o numero ao lado do titulo mostra a soma de chats ativos de todos os atendentes visiveis no submenu
4. **Clique no titulo**: navega para `/admin/workspace` (workspace do usuario logado) -- comportamento default
5. **Usuario logado dentro do submenu**: aparece como uma linha normal (com indicacao visual sutil, ex: "(voce)") junto com os demais
6. **Outros atendentes**: aparecem abaixo, cada um com seu contador individual
7. **Visibilidade por time**: o sistema busca os times do usuario logado via `chat_team_members`, depois lista todos os atendentes desses times. Administradores verao mais pessoas porque pertencem a mais times ou tem acesso total
8. **Ao clicar em qualquer atendente**: navega para `/admin/workspace?attendant={id}` para visualizar a fila daquele atendente
9. **Estado fechado**: mostra apenas a linha "Estacao de Trabalho" com o totalizador; sem listar os membros

---

## Mudancas na logica de busca (`AppSidebar.tsx`)

Atualmente a sidebar busca TODOS os `attendant_profiles` e lista todos. A nova logica:

1. Buscar o `attendant_profiles.id` do usuario logado
2. Buscar os `team_id`s do usuario via `chat_team_members` onde `attendant_id = meu_attendant_id`
3. Buscar todos os `attendant_id`s desses times via `chat_team_members`
4. Buscar os `attendant_profiles` correspondentes (sem duplicatas)
5. Se o usuario for admin (`isAdmin`), buscar TODOS os attendant_profiles (visao completa)
6. Contar chats ativos por attendant (mesmo padrao atual)
7. Totalizar para o badge do menu

---

## Estrutura visual do submenu

```text
Chat
  Dashboard
  [v] Estacao de Trabalho [12]     <-- colapsavel, badge = soma total
      | Joao Silva (voce)  [3]     <-- usuario logado, sempre primeiro
      | Maria Santos       [4]
      | Pedro Oliveira     [5]
  Historico
  Banners
  Configuracoes
```

Quando fechado:

```text
Chat
  Dashboard
  [>] Estacao de Trabalho [12]     <-- fechado, so mostra totalizador
  Historico
  ...
```

---

## Arquivos modificados

| # | Arquivo | Descricao |
|---|---------|-----------|
| 1 | `src/components/AppSidebar.tsx` | Reestruturar secao do workspace: submenu colapsavel com Collapsible, nova logica de busca por times, badge totalizador, usuario logado como linha interna |
| 2 | `src/locales/pt-BR.ts` | Adicionar `"chat.workspace.station": "Estacao de Trabalho"`, `"chat.workspace.you": "(voce)"` |
| 3 | `src/locales/en.ts` | Adicionar `"chat.workspace.station": "Workspace"`, `"chat.workspace.you": "(you)"` |

---

## Detalhes tecnicos

### Logica de busca dos atendentes visiveis

```text
1. Buscar attendant_profiles onde user_id = auth.uid()  ->  meu_attendant_id
2. Se isAdmin:
     Buscar TODOS os attendant_profiles
3. Senao:
     Buscar chat_team_members onde attendant_id = meu_attendant_id  ->  meus_team_ids[]
     Buscar chat_team_members onde team_id IN meus_team_ids  ->  todos_attendant_ids[]
     Buscar attendant_profiles onde id IN todos_attendant_ids (deduplicados)
4. Para cada attendant, contar chat_rooms ativos (status IN ['active','waiting'])
5. Total = soma de todos os active_count
```

### Estrutura do Collapsible no JSX

O submenu usara `Collapsible` (ja importado no componente) com:
- `CollapsibleTrigger`: linha "Estacao de Trabalho" com badge totalizador e seta
- Clique no texto/icone do trigger: navega para workspace do usuario logado
- Clique na seta: expande/recolhe o submenu
- `CollapsibleContent`: lista de SidebarMenuItem para cada atendente

Para permitir que o clique no titulo navegue E a seta expanda, o trigger tera dois elementos: o botao de navegacao (SidebarMenuButton) e um botao pequeno separado para expandir/recolher.

### Ordenacao dos atendentes

1. Usuario logado sempre primeiro
2. Demais ordenados por display_name alfabeticamente
