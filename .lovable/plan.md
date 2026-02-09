

# Permissionamento Granular Completo: Todos os Modulos

## Resumo

Apos auditoria completa do codebase, foram identificadas **todas as paginas e componentes com acoes de escrita** (adicionar, editar, excluir) que nao verificam as permissoes granulares do usuario. O sistema ja possui a infraestrutura de permissoes pronta (`hasPermission` no `useAuth`, modulos definidos em `UserPermissionsDialog`), porem as paginas nao a utilizam.

## Modulos e Permissoes Existentes

Os 5 modulos do sistema, cada um com 4 niveis:

| Modulo | view | edit | delete | manage |
|--------|------|------|--------|--------|
| `cs` | Visualizar dashboards/kanban | Mover cards, editar status | Excluir CSMs, templates | Tudo |
| `nps` | Visualizar metricas/campanhas | Criar/editar campanhas, enviar e-mails | Excluir campanhas/contatos | Tudo |
| `contacts` | Visualizar empresas/pessoas | Adicionar/editar empresas e contatos | Excluir empresas e contatos | Tudo |
| `settings` | Visualizar configuracoes | Editar marca/email/notificacoes | - | API Keys |
| `chat` | Dashboard/Workspace/Historico | - | - | Atendentes/Gerencial/Config |

---

## Problema Atual vs. Solucao por Pagina

### 1. Cadastros (contacts)

**`Contacts.tsx`** -- 5 acoes desprotegidas:
- Botao "Adicionar Empresa" (linha 450): sem verificacao
- Botao "Adicionar Empresa" no estado vazio (linha 464): sem verificacao
- Botao "Editar Empresa" no Sheet (linha 514): sem verificacao
- Dialog de edicao de empresa (linha 614): sem verificacao
- Delete confirmation (linha 644): sem verificacao

**Solucao:** Importar `useAuth`, criar `canEdit` e `canDelete`, e condicionar cada botao.

**`CompanyCard.tsx`** -- 1 acao desprotegida:
- Botao de lixeira (linhas 57-67): sempre visivel

**Solucao:** Adicionar prop `canDelete?: boolean`, condicionar renderizacao.

**`CompanyContactsList.tsx`** -- 5 acoes desprotegidas:
- Botao "Adicionar contato" no header (linha 79)
- Botao "Adicionar primeiro" no estado vazio (linha 89)
- Botao estrela "Definir como principal" (linhas 136-145)
- Botao "Editar" cada contato (linhas 147-153)
- Botao "Excluir" cada contato (linhas 155-161)

**Solucao:** Adicionar props `canEdit?: boolean` e `canDelete?: boolean`, condicionar renderizacao.

**`People.tsx`** -- Sem mudanca necessaria (pagina somente leitura).

---

### 2. NPS (nps)

**`Campaigns.tsx`** -- 2 acoes desprotegidas:
- Botao "Criar Campanha" (linhas 193-212): sem verificacao
- Botao de lixeira por campanha (linhas 266-279): sem verificacao

**Solucao:** Importar `useAuth`, condicionar criacao a `hasPermission('nps', 'edit')` e exclusao a `hasPermission('nps', 'delete')`.

**`CampaignDetails.tsx`** -- 5 acoes desprotegidas:
- Botao "Cancelar Campanha" (linhas 811-819)
- Botao "Adicionar Contatos" (linhas 1014-1022)
- Botao "Enviar" individual (linhas 1171-1179)
- Botao "Enviar para N" em massa (linhas 1023-1032)
- Botao "Remover contato" (linhas 1180-1186)

**Solucao:** Importar `useAuth`, condicionar adicionar/enviar a `nps.edit`, remover a `nps.delete`, cancelar a `nps.manage`.

---

### 3. Customer Success (cs)

**`CSDashboard.tsx` + `CSKanbanBoard.tsx`** -- 1 acao desprotegida:
- Drag-and-drop para mover cards entre colunas do Kanban (altera `cs_status`)

**Solucao:** Passar prop `canEdit` do `CSDashboard` para `CSKanbanBoard`, desabilitar drag quando `canEdit === false`.

**`CSTrailsPage.tsx`** -- 2 acoes desprotegidas:
- Botao "Adicionar Template" (linhas 150-155)
- Botao "Excluir" por template (linhas 292-300)

**Solucao:** Importar `hasPermission`, condicionar criacao a `cs.edit`, exclusao a `cs.delete`.

**`CSMsPage.tsx`** -- 2 acoes desprotegidas:
- Botao "Adicionar CSM" (linhas 149-155)
- Botao "Excluir" por CSM (linhas 278-286)

**Solucao:** Importar `hasPermission`, condicionar criacao a `cs.edit`, exclusao a `cs.delete`.

**`CSHealthPage.tsx`, `CSChurnPage.tsx`, `CSFinancialPage.tsx`** -- Sem mudanca (somente leitura).

---

### 4. Settings (settings)

**`BrandSettingsTab.tsx`** -- Tem botao "Salvar" que altera dados.
**`EmailSettingsTab.tsx`** -- Tem botao "Salvar" e "Testar" que alteram dados.
**`NotificationSettingsTab.tsx`** -- Tem botao "Salvar" que altera dados.

**Solucao:** Nesses 3 componentes, condicionar o botao de salvar a `hasPermission('settings', 'edit')`. Quem tem `view` mas nao `edit` podera visualizar as configuracoes mas nao altera-las.

**`Settings.tsx`** -- A aba API Keys ja foi condicionada a `settings.manage` na mudanca anterior.

---

## Arquivos Modificados: Lista Completa

| # | Arquivo | Mudanca |
|---|---------|---------|
| 1 | `src/pages/Contacts.tsx` | Importar `useAuth`, criar `canEdit`/`canDelete`, condicionar 5 botoes, passar props para filhos |
| 2 | `src/components/CompanyCard.tsx` | Nova prop `canDelete`, condicionar botao lixeira |
| 3 | `src/components/CompanyContactsList.tsx` | Novas props `canEdit`/`canDelete`, condicionar 5 botoes |
| 4 | `src/pages/Campaigns.tsx` | Importar `useAuth`, condicionar criacao (`nps.edit`) e exclusao (`nps.delete`) |
| 5 | `src/pages/CampaignDetails.tsx` | Importar `useAuth`, condicionar adicionar/enviar (`nps.edit`), remover (`nps.delete`), cancelar (`nps.manage`) |
| 6 | `src/pages/CSDashboard.tsx` | Passar `canEdit` para `CSKanbanBoard` |
| 7 | `src/components/cs/CSKanbanBoard.tsx` | Nova prop `canEdit`, bloquear drag-and-drop quando false |
| 8 | `src/pages/CSTrailsPage.tsx` | Condicionar adicionar (`cs.edit`) e excluir (`cs.delete`) |
| 9 | `src/pages/CSMsPage.tsx` | Condicionar adicionar (`cs.edit`) e excluir (`cs.delete`) |
| 10 | `src/components/BrandSettingsTab.tsx` | Condicionar botao "Salvar" a `settings.edit` |
| 11 | `src/components/EmailSettingsTab.tsx` | Condicionar botoes "Salvar"/"Testar" a `settings.edit` |
| 12 | `src/components/NotificationSettingsTab.tsx` | Condicionar botao "Salvar" a `settings.edit` |

---

## Detalhes Tecnicos

### Padrao de implementacao (mesma logica em todos os arquivos):

```typescript
import { useAuth } from "@/hooks/useAuth";

// No componente:
const { hasPermission } = useAuth();
const canEdit = hasPermission('MODULE', 'edit');
const canDelete = hasPermission('MODULE', 'delete');

// No JSX -- condicionar botoes:
{canEdit && <Button>Adicionar</Button>}
{canDelete && <Button>Excluir</Button>}
```

### Contacts.tsx -- Exemplo detalhado

```typescript
const { hasPermission } = useAuth();
const canEdit = hasPermission('contacts', 'edit');
const canDelete = hasPermission('contacts', 'delete');

// Botao "Adicionar Empresa"
{canEdit && (
  <Button onClick={() => setAddCompanyDialogOpen(true)}>
    <Plus className="mr-2 h-4 w-4" />
    {t("companies.addCompany")}
  </Button>
)}

// CompanyCard recebe canDelete
<CompanyCard
  company={company}
  onClick={() => handleCompanyClick(company)}
  onDelete={() => setDeleteCompanyId(company.id)}
  canDelete={canDelete}
/>

// CompanyContactsList recebe canEdit e canDelete
<CompanyContactsList
  contacts={companyContacts}
  onAddContact={() => setAddContactDialogOpen(true)}
  onEditContact={(contact) => setEditContactData(contact)}
  onDeleteContact={handleDeleteContact}
  onSetPrimary={handleSetPrimary}
  canEdit={canEdit}
  canDelete={canDelete}
/>

// Botao "Editar Empresa" no Sheet
{canEdit && (
  <Button variant="outline" size="sm"
    onClick={() => setEditCompanyData(selectedCompany)}>
    <Pencil className="h-4 w-4 mr-2" />
    {t("companies.editCompany")}
  </Button>
)}
```

### CompanyCard.tsx -- Nova interface

```typescript
interface CompanyCardProps {
  company: Company;
  onClick: () => void;
  onDelete: () => void;
  canDelete?: boolean;
}

// Condicionar o botao:
{canDelete !== false && (
  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
    <Trash2 className="h-4 w-4 text-destructive" />
  </Button>
)}
```

### CompanyContactsList.tsx -- Novas props

```typescript
interface CompanyContactsListProps {
  contacts: CompanyContact[];
  onAddContact: () => void;
  onEditContact: (contact: CompanyContact) => void;
  onDeleteContact: (id: string) => void;
  onSetPrimary: (id: string) => void;
  loading?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

// Condicionar cada botao:
// Botao "Adicionar contato": canEdit !== false
// Botao "Adicionar primeiro" (vazio): canEdit !== false
// Botao "Estrela" (set primary): canEdit !== false
// Botao "Edit": canEdit !== false
// Botao "Trash2": canDelete !== false
```

### CSKanbanBoard.tsx -- Bloquear drag

```typescript
interface CSKanbanBoardProps {
  companies: KanbanCompany[];
  csms: CSM[];
  isLoading: boolean;
  onRefresh: () => void;
  canEdit?: boolean;
}

// No card: condicionar draggable
<CSKanbanCard
  key={company.id}
  company={company}
  csms={csms}
  onDragStart={canEdit !== false ? () => handleDragStart(company) : undefined}
  onClick={() => setSelectedCompany(company)}
  draggable={canEdit !== false}
/>

// No drop: verificar canEdit
const handleDrop = async (status: string) => {
  if (canEdit === false || !draggedCompany || ...) return;
};
```

### Settings tabs -- Condicionar salvar

Nos 3 componentes (BrandSettingsTab, EmailSettingsTab, NotificationSettingsTab), importar `useAuth` e desabilitar o botao "Salvar" quando `!hasPermission('settings', 'edit')`:

```typescript
const { hasPermission } = useAuth();
const canEditSettings = hasPermission('settings', 'edit');

// No botao salvar:
<Button onClick={handleSave} disabled={saving || !canEditSettings}>
  {saving ? <Loader2 .../> : null}
  {t("common.save")}
</Button>
```

### CampaignDetails.tsx -- Acoes NPS

```typescript
const { hasPermission } = useAuth();
const canEditNps = hasPermission('nps', 'edit');
const canDeleteNps = hasPermission('nps', 'delete');
const canManageNps = hasPermission('nps', 'manage');

// "Cancelar Campanha": canManageNps
// "Adicionar Contatos": canEditNps
// "Enviar" individual e massa: canEditNps
// "Remover contato" (Trash2): canDeleteNps
```

---

## Arquivos NAO Modificados

| Arquivo | Motivo |
|---------|--------|
| `People.tsx` | Somente leitura |
| `PersonDetailsSheet.tsx` | Somente leitura |
| `CompanyCSDetailsSheet.tsx` | Somente leitura |
| `CSHealthPage.tsx` | Somente leitura |
| `CSChurnPage.tsx` | Somente leitura |
| `CSFinancialPage.tsx` | Somente leitura |
| `Dashboard.tsx` (NPS) | Somente leitura |
| `Results.tsx` | Somente leitura |
| `AdminSettings.tsx` | Ja protegido por `chat.manage` na sidebar |
| `AdminAttendants.tsx` | Ja protegido por `chat.manage` na sidebar |
| `AdminChatHistory.tsx` | Somente leitura |
| `AppSidebar.tsx` | Ja corrigido na ultima mudanca |
| `Settings.tsx` | Ja corrigido na ultima mudanca |
| `useAuth.ts` | Ja implementa `hasPermission` |
| `UserPermissionsDialog.tsx` | Admin-only, sem mudanca |

---

## Ordem de Implementacao

1. Componentes base (CompanyCard, CompanyContactsList, CSKanbanBoard) -- adicionar props
2. Modulo Contacts (Contacts.tsx)
3. Modulo NPS (Campaigns.tsx, CampaignDetails.tsx)
4. Modulo CS (CSDashboard.tsx, CSTrailsPage.tsx, CSMsPage.tsx)
5. Modulo Settings (BrandSettingsTab, EmailSettingsTab, NotificationSettingsTab)

