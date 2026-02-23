

# Modo Fantasma: Impersonacao de Plataforma pelo Master

## Visao Geral

Quando o usuario master selecionar uma plataforma, o sistema carrega completamente como se fosse um admin dessa plataforma -- sidebar, chats, dados, configuracoes -- porem sem contabilizar como atendente ou usuario da organizacao.

---

## 1. AuthContext -- Estado de Impersonacao

Adicionar ao `AuthContext.tsx`:

- `impersonatedTenantId: string | null` -- o tenant selecionado para impersonacao
- `impersonatedTenantName: string | null` -- nome para exibir no banner
- `isImpersonating: boolean` -- flag de conveniencia
- `setImpersonation(tenantId: string, tenantName: string)` -- ativa impersonacao
- `clearImpersonation()` -- sai do modo fantasma

O `tenantId` exposto pelo contexto retorna `impersonatedTenantId` quando ativo, permitindo que TODO o sistema existente funcione sem alteracoes nos componentes filhos.

Quando impersonando:
- `isAdmin` permanece `true` (master herda admin)
- `isChatEnabled` se torna `true` (para ver menus de chat)
- `hasPermission` retorna `true` para tudo (admin)

---

## 2. SidebarLayout -- Banner de Impersonacao

No `SidebarLayout.tsx`, adicionar na `header` (barra superior com o SidebarTrigger):

- Quando `isImpersonating === true`, exibir um banner colorido (ex: fundo amber/warning) mostrando:
  - Icone `Eye` + "Visualizando: [Nome da Plataforma]"
  - Botao "Sair" que chama `clearImpersonation()` e navega para `/backoffice`
- Quando impersonando, o redirect de `!tenantId && !isAdmin` nao dispara (master ja e admin)

---

## 3. SidebarDataContext -- Filtro por Tenant Impersonado

O `SidebarDataContext` atualmente busca TODOS os attendants (porque master e admin). Quando impersonando:

- Filtrar `attendant_profiles` pelo `tenant_id` do tenant impersonado (via join com `user_profiles`)
- Filtrar `chat_rooms` pelo `tenant_id` impersonado
- O master NAO aparece na lista de atendentes (nao tem `attendant_profile`)
- Re-inicializar dados quando o tenant impersonado mudar

---

## 4. Backoffice -- Seletor de Plataforma

No `TenantManagement.tsx`, adicionar um botao **"Visualizar"** (icone `Eye`) em cada linha da tabela de tenants:

- Ao clicar, chama `setImpersonation(tenant.id, tenant.name)`
- Navega automaticamente para `/admin/dashboard` (ou outra pagina inicial)
- O sistema carrega completamente com a visao daquele tenant

---

## 5. AppSidebar -- Adaptacao para Modo Fantasma

Quando `isImpersonating`:
- O grupo "Backoffice" continua visivel (para o master poder voltar)
- Todos os outros grupos (CS, NPS, Chat, Cadastros, Reports) ficam visiveis como admin
- O nome do tenant impersonado aparece no header da sidebar (abaixo do logo)
- O master NAO aparece na lista de atendentes do workspace (nao tem attendant_profile naquele tenant)

---

## 6. Protecao "Fantasma"

O master nao deve ser contabilizado como usuario da plataforma:
- Nao tem `attendant_profile` -- logo nao aparece em listas de atendentes
- Nao tem `csm` no tenant -- logo nao conta como CSM
- Nao altera `active_conversations` de ninguem
- Ao enviar mensagens no workspace (se permitido), usa `sender_name: "Master"` com `is_internal: true`
- Nao aparece em metricas de atendimento

---

## Secao Tecnica -- Arquivos Afetados

| Arquivo | Alteracao |
|---|---|
| `src/contexts/AuthContext.tsx` | Adicionar estado de impersonacao, override de `tenantId`, funcoes `setImpersonation`/`clearImpersonation` |
| `src/components/SidebarLayout.tsx` | Banner de impersonacao no header com botao "Sair" |
| `src/contexts/SidebarDataContext.tsx` | Filtrar attendants e rooms pelo tenant impersonado |
| `src/components/backoffice/TenantManagement.tsx` | Botao "Visualizar" por tenant |
| `src/components/AppSidebar.tsx` | Exibir nome do tenant impersonado, manter Backoffice visivel |

## Fluxo do Usuario

```
1. Master faz login -> ve sidebar com apenas "Backoffice" e "Perfil"
2. Navega para /backoffice -> ve lista de plataformas
3. Clica em "Visualizar" no tenant "Empresa X"
4. Sistema carrega: sidebar mostra todos os menus de CS, NPS, Chat
5. Banner no topo: "Visualizando: Empresa X [Sair]"
6. Master navega livremente, ve dados, configs, chats da Empresa X
7. Clica "Sair" -> volta ao /backoffice, sidebar limpa
```

