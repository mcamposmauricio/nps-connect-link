
# Três Correções na Sidebar

## 1. Logo — Redirecionar para Home do Usuário Logado

**Arquivo:** `src/components/AppSidebar.tsx`, linha 216

**Problema:** O `<Link to="/">` aponta para a landing page. O usuário já está logado e deve ir para sua página inicial.

**Solução:** Substituir o `Link` por um botão que usa `navigate` para a primeira rota acessível ao usuário. A lógica de prioridade de home já existe implicitamente no sistema — admin vai para `/admin/dashboard`, usuários com CS vão para `/cs-dashboard`, usuários com NPS vão para `/nps/dashboard`.

```tsx
// ANTES
<Link to="/" className="flex items-center justify-center gap-3 min-w-0 w-full">

// DEPOIS
<button
  onClick={() => {
    if (hasPermission("cs", "view")) navigate("/cs-dashboard");
    else if (hasPermission("nps", "view")) navigate("/nps/dashboard");
    else if (hasPermission("chat", "view")) navigate("/admin/dashboard");
    else navigate("/nps/dashboard");
  }}
  className="flex items-center justify-center gap-3 min-w-0 w-full"
>
```

---

## 2. Logout — Garantir Redirecionamento para /auth

**Arquivo:** `src/components/AppSidebar.tsx`, linha 188

**Problema:** O `handleLogout` já chama `navigate("/auth")` na linha 191, mas o `supabase.auth.signOut()` dispara o `onAuthStateChange` no `AuthContext`, que por sua vez atualiza o estado `user` para `null`. Isso faz o `SidebarLayout` detectar `!user` no `useEffect` e também chamar `navigate("/auth")` — mas o `toast` ainda não foi exibido quando isso acontece. O fluxo já funciona, mas pode haver corrida entre os dois `navigate`.

**Solução:** Nenhuma mudança funcional necessária — o logout já vai para `/auth`. O problema reportado deve ser um comportamento visual (toast não aparece). Verificar se o `toast` é exibido antes do redirecionamento. Se não, adicionar um `await` antes do `navigate` dentro de um `setTimeout` mínimo:

```tsx
const handleLogout = async () => {
  await supabase.auth.signOut();
  toast({ title: t("nav.logoutSuccess"), description: t("nav.logoutMessage") });
  navigate("/auth");
};
```

O código atual já está assim — se o problema é que não redireciona, a causa pode ser que o `AuthContext.onAuthStateChange` redireciona via o `SidebarLayout.useEffect` mas o `navigate` do `handleLogout` não é chamado a tempo porque o componente desmonta. A solução é manter o `navigate("/auth")` no `handleLogout` e garantir que o `AuthContext` **não** redirecione para `/auth` (pois o `SidebarLayout` já trata isso).

**Confirmação:** O `SidebarLayout` (linha 21) faz `navigate("/auth")` quando `!user` — isso já cobre o caso. O `navigate` no `handleLogout` é redundante mas inofensivo.

---

## 3. Workspace State Flash — Causa Raiz Definitiva e Solução

**Problema real identificado:** O `Collapsible` do Workspace (linha 333) usa `onOpenChange={handleWorkspaceOpen}`. O `CollapsibleTrigger asChild` (Button, linha 354) tem `onClick={(e) => e.stopPropagation()}`. 

O Radix `CollapsibleTrigger` funciona em dois níveis:
1. **Via Context interno do Radix** — o trigger chama `setOpen` diretamente via o context do `Collapsible` pai
2. **Via evento de click que bubbla** — o trigger também usa o evento para propagar

Quando `e.stopPropagation()` está no `onClick` do Button (que é o `CollapsibleTrigger asChild`), isso **não impede o Radix de funcionar** porque o Radix usa o `onClick` do próprio elemento, não o bubble. Então o toggle do workspace funciona corretamente via o chevron.

**O flash acontece por outro motivo:** O `workspaceOpen` é inicializado do localStorage na montagem (`useState(() => localStorage...)`). O `Collapsible` do Radix, ao montar, usa esse valor como `open` prop (modo controlado). Porém, **o Radix Collapsible em modo controlado** (`open` + `onOpenChange`) às vezes dispara `onOpenChange(false)` logo após a montagem quando detecta que o conteúdo está sendo renderizado pela primeira vez — isso é um comportamento documentado do Radix em versões específicas.

**Solução definitiva:** Remover o `onOpenChange` do `Collapsible` interno do Workspace e controlar o estado **exclusivamente** via o `onClick` do Button chevron — sem depender do `onOpenChange` do Radix para persistir no localStorage:

```tsx
// ANTES
<Collapsible open={workspaceOpen} onOpenChange={handleWorkspaceOpen}>
  ...
  <CollapsibleTrigger asChild>
    <Button onClick={(e) => e.stopPropagation()}>
      {/* chevron */}
    </Button>
  </CollapsibleTrigger>

// DEPOIS
<Collapsible open={workspaceOpen}>
  ...
  {/* CollapsibleTrigger removido — o Button controla diretamente */}
  <Button
    onClick={(e) => {
      e.stopPropagation();
      handleWorkspaceOpen(!workspaceOpen);
    }}
  >
    {/* chevron */}
  </Button>
```

Removendo o `onOpenChange` do `Collapsible`, o componente fica em modo "somente leitura" do ponto de vista do Radix — ele exibe o conteúdo baseado em `open`, mas nunca dispara mudanças automáticas. O único ponto que muda o estado é o clique explícito no botão chevron, que chama `handleWorkspaceOpen(!workspaceOpen)` diretamente — sem depender do mecanismo interno do Radix.

Isso elimina completamente o flash: o Radix nunca mais poderá alterar `workspaceOpen` por conta própria.

---

## Arquivos a Modificar

| Arquivo | Linha | Mudança |
|---|---|---|
| `src/components/AppSidebar.tsx` | 216 | `<Link to="/">` → `<button onClick={...navigate para home}>` com lógica de permissão |
| `src/components/AppSidebar.tsx` | 333 | Remover `onOpenChange={handleWorkspaceOpen}` do `<Collapsible>` do Workspace |
| `src/components/AppSidebar.tsx` | 354–365 | Converter `<CollapsibleTrigger asChild><Button>` em `<Button onClick={(e) => { e.stopPropagation(); handleWorkspaceOpen(!workspaceOpen); }}>` (sem o wrapper CollapsibleTrigger) |

## O que NÃO é alterado

- Lógica de logout (já redireciona para `/auth` corretamente)
- Estado dos outros submenus (npsOpen, chatOpen, reportsOpen)
- SidebarTrigger e colapso da sidebar (já corrigido)
- Qualquer outro arquivo, componente ou página
