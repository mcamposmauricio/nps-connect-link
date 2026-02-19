
# Correção do Estado do Submenu Workspace ao Navegar

## Diagnóstico Real

O componente `AppSidebar` **não desmonta** ao navegar (está fora do `{children}` no `SidebarLayout`). O problema, portanto, é outro: o `Collapsible` do Workspace (linha 333) tem `onOpenChange={handleWorkspaceOpen}`, e o Radix `Collapsible` chama `onOpenChange` sempre que seu estado interno muda — incluindo quando o `open` prop muda de `undefined` para um valor booleano, ou quando eventos de bubble chegam ao trigger.

O fluxo problemático identificado:

1. O usuário abre o workspace (workspaceOpen = true, localStorage = "true")
2. Clica em "Chat Settings", "History", "Banners" etc.
3. O evento de clique no `SidebarMenuButton` sobe pela árvore DOM
4. Chega ao `CollapsibleTrigger asChild` do Chat (`SidebarGroupLabel`, linha 301-312) — esse trigger envolve todo o label do Chat
5. Isso dispara o `chatOpen` toggle → `chatOpen` vira `false` → o `CollapsibleContent` do Chat (linha 313) desmonta
6. O `Collapsible` do Workspace, que está **dentro** do `CollapsibleContent` do Chat, é desmontado e remontado
7. Na remontagem, `workspaceOpen` reinicia do localStorage (correto), mas o Radix `Collapsible` passa por um ciclo de mount que causa o flash visual

**Confirmação:** Os botões de "Dashboard", "History", "Banners", "Chat Settings" estão todos **dentro** do `CollapsibleContent` do Chat (linhas 313-454), mas seus `onClick` chamam apenas `navigate()` sem `e.stopPropagation()`. O evento sobe até o `CollapsibleTrigger asChild` do Chat (o `SidebarGroupLabel`).

## Causa Raiz Definitiva

O `SidebarGroupLabel` na linha 302-312 é um `CollapsibleTrigger asChild` — qualquer clique que bubblar até ele vai disparar o toggle do `chatOpen`. Todos os `SidebarMenuButton` dentro do `CollapsibleContent` do Chat (Dashboard, History, Banners, Settings) **não têm** `e.stopPropagation()`, então seus eventos sobem livremente.

Quando `chatOpen` é toggleado por engano:
- O `CollapsibleContent` do Chat desmonta
- O `Collapsible` do Workspace dentro dele também desmonta
- Na remontagem, `workspaceOpen` é lido do localStorage novamente → gera o flash de "fecha e reabre"

## Solução

Adicionar `onClick={(e) => e.stopPropagation()}` no `<CollapsibleContent>` do **Chat** (linha 313), não apenas no do Workspace. Isso bloqueia todos os cliques nos itens filhos do Chat de chegarem ao `SidebarGroupLabel` (CollapsibleTrigger do Chat).

```tsx
// ANTES — linha 313
<CollapsibleContent>

// DEPOIS
<CollapsibleContent onClick={(e) => e.stopPropagation()}>
```

Isso resolve de forma abrangente: qualquer clique dentro do bloco Chat (Dashboard, Workspace, atendentes, History, Banners, Settings) fica isolado dentro do `CollapsibleContent` e não consegue mais atingir o `CollapsibleTrigger` do label pai.

O mesmo padrão deve ser aplicado ao `CollapsibleContent` do NPS (linha 274) e do Relatórios (linha 475), pois sofrem do mesmo problema potencial.

## Arquivos a Modificar

| Arquivo | Linha | Mudança |
|---|---|---|
| `src/components/AppSidebar.tsx` | 274 | `<CollapsibleContent>` do NPS → adicionar `onClick={(e) => e.stopPropagation()}` |
| `src/components/AppSidebar.tsx` | 313 | `<CollapsibleContent>` do Chat → adicionar `onClick={(e) => e.stopPropagation()}` |
| `src/components/AppSidebar.tsx` | 475 | `<CollapsibleContent>` do Relatórios → adicionar `onClick={(e) => e.stopPropagation()}` |

A linha 368 (`CollapsibleContent` do Workspace) já tem o `stopPropagation` do fix anterior — mantida.

## O que NÃO é alterado

- Lógica de navegação e `navigate()` dos itens
- Estado dos submenus e persistência no localStorage
- SidebarTrigger e colapso da sidebar (já corrigido)
- Qualquer outro arquivo, componente ou página
