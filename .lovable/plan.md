
# Corrigir: Workspace não deve colapsar ao navegar entre menus

## Diagnóstico Preciso

### Root Cause — linha 344 em `AppSidebar.tsx`

```tsx
// PROBLEMA: Collapsible sem onOpenChange = não é controlado corretamente
<Collapsible open={workspaceOpen}>
```

O Radix UI `Collapsible` sem `onOpenChange` fica em modo **semi-controlado**: lê `open` na montagem mas não sincroniza estado ao re-renderizar. Quando o usuário navega para outra rota (ex: "Dashboard"), o React re-renderiza o `AppSidebar`. O Collapsible do Workspace, sem `onOpenChange`, perde o controle do estado e faz a animação de fechar+abrir — causando o colapso visual que o usuário vê.

Compare com os outros menus colapsáveis (NPS, Chat) que funcionam corretamente:
```tsx
// NPS — CORRETO: controlado com onOpenChange
<Collapsible open={npsOpen} onOpenChange={handleNpsOpen}>

// Chat — CORRETO: controlado com onOpenChange
<Collapsible open={chatOpen} onOpenChange={handleChatOpen}>

// Workspace — ERRADO: sem onOpenChange
<Collapsible open={workspaceOpen}>  // ← falta onOpenChange
```

### Causa Secundária — comportamento do botão de toggle

O botão de seta (ChevronDown/ChevronRight) na linha 356 chama `handleWorkspaceOpen(!workspaceOpen)` com `e.stopPropagation()`. Isso está correto. Mas como o Collapsible pai não tem `onOpenChange`, quando o próprio Radix tenta fechar o Collapsible por detecção interna de estado, ele entra em conflito com o estado React, resultando no flash visual.

### Por que os attendants "somem"

Quando o Collapsible faz o flash fechar→abrir, o `CollapsibleContent` é removido e re-inserido no DOM. Os attendants já estão no state do React (`teamAttendants`), mas a animação de fechar/abrir faz parecer que eles desapareceram por ~300ms.

---

## Solução: Uma linha de mudança

Adicionar `onOpenChange={handleWorkspaceOpen}` no `Collapsible` do Workspace:

```tsx
// ANTES (linha 344):
<Collapsible open={workspaceOpen}>

// DEPOIS:
<Collapsible open={workspaceOpen} onOpenChange={handleWorkspaceOpen}>
```

Isso torna o Collapsible **totalmente controlado**: o estado é gerenciado exclusivamente pelo React + localStorage, exatamente igual ao NPS e Chat. O Radix não tentará modificar o estado internamente.

---

## Comportamento Esperado

| Ação | Antes | Depois |
|---|---|---|
| Navegar para Dashboard (dentro do Chat) | Workspace colapsa e re-abre (flash dos attendants) | Workspace permanece exatamente no estado que estava |
| Navegar para History | Workspace colapsa e re-abre | Workspace permanece no estado que estava |
| Navegar para qualquer outra rota | Workspace colapsa e re-abre | Workspace permanece no estado que estava |
| Clicar na seta (ChevronDown/Right) | Toggle funciona, mas estado não persiste corretamente entre navegações | Toggle funciona E estado persiste no localStorage entre navegações |

---

## Arquivo a Modificar

| Arquivo | Linha | Mudança |
|---|---|---|
| `src/components/AppSidebar.tsx` | 344 | Adicionar `onOpenChange={handleWorkspaceOpen}` ao `<Collapsible>` do Workspace |

É uma mudança de uma linha. Nenhum outro arquivo precisa ser alterado.
