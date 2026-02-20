
# Permissionamento Granular por Submódulo/Aba

## Diagnóstico do Estado Atual

### O que existe hoje
O sistema tem 5 módulos planos na tabela `user_permissions`:

| Módulo (coluna `module`) | Controla |
|---|---|
| `cs` | Acesso a todo o módulo Customer Success (Dashboard Kanban + Jornadas + Relatórios Health/Risco/Receita) |
| `nps` | Acesso a todo o NPS (Dashboard + Campanhas + Config NPS) |
| `chat` | Acesso a todo o Chat (Workspace + Histórico + Banners + Configurações + Relatório Gerencial) |
| `contacts` | Acesso a Cadastros (Empresas + Pessoas) |
| `settings` | Acesso às Configurações gerais (Equipe/Org/API) |

**Problema:** Um atendente de chat não tem como ter acesso ao Workspace mas não ao Histórico. Um usuário de NPS não pode ver as Campanhas sem também acessar a aba de Configurações NPS. Os 5 módulos são muito amplos.

### Novas implementações que precisam entrar no permissionamento
Desde que o sistema de permissões foi criado, foram adicionados:
- Módulo Reports/Relatórios com 4 sub-relatórios independentes (Health Score, Risco/Churn, Receita, Gerencial de Chat)
- Banners (atualmente exige `chat.manage`)
- Configurações do Chat com múltiplas abas (Geral, Widget, Macros, Horários, Regras, API, Atendentes, Times, Categorias)
- Portal de usuário
- Histórico de chat (atualmente atrás de `chat.view` sem distinção)

---

## Mapa Completo de Permissões Granulares Proposto

Cada linha abaixo vira um registro em `user_permissions.module`. São **permissões aditivas** — o módulo pai continua existindo para não quebrar código existente, mas agora os subpermissões refinam o que é visível.

### Estratégia: Hierarquia com herança

```
módulo-pai (ex: "cs")
  └── sub-módulo (ex: "cs.kanban", "cs.trails", "cs.reports.health")
```

Regra de herança no `hasPermission`:
- Se o usuário tem `cs.view = true` → acessa todos os subitens de `cs.*` salvo se um subitem específico estiver explicitamente configurado (substituição)
- Se um subitem existe com `can_view = false` → bloqueia aquela seção mesmo com o pai habilitado
- Admins: acesso total independente de qualquer configuração

Isso mantém **compatibilidade retroativa**: quem já tem `cs.view` continua com tudo, mas o admin pode restringir subseções individualmente.

---

## Árvore Completa de Permissões por Módulo

### Customer Success (`cs`)
| Chave | Descrição | Ações relevantes |
|---|---|---|
| `cs` | Módulo CS completo | view, edit, delete, manage |
| `cs.kanban` | Dashboard Kanban de clientes | view, edit |
| `cs.trails` | Jornadas / Trilhas de CS | view, edit, delete |
| `cs.reports.health` | Relatório Health Score | view |
| `cs.reports.churn` | Relatório Risco/Churn | view |
| `cs.reports.financial` | Relatório Receita/Financeiro | view |

### NPS (`nps`)
| Chave | Descrição | Ações relevantes |
|---|---|---|
| `nps` | Módulo NPS completo | view, edit, delete, manage |
| `nps.dashboard` | Dashboard de métricas NPS | view |
| `nps.campaigns` | Gestão de campanhas | view, edit, delete |
| `nps.settings` | Configurações NPS (marca, email, notif., widget) | view, manage |

### Chat (`chat`)
| Chave | Descrição | Ações relevantes |
|---|---|---|
| `chat` | Módulo Chat completo | view, edit, delete, manage |
| `chat.workspace` | Estação de trabalho / atendimento | view |
| `chat.history` | Histórico de conversas | view |
| `chat.banners` | Banners e comunicados | view, edit, delete, manage |
| `chat.reports` | Relatório Gerencial de Atendimento | view |
| `chat.settings.general` | Config: Geral + Horários + Regras | view, manage |
| `chat.settings.widget` | Config: Widget de chat | view, manage |
| `chat.settings.macros` | Config: Macros de resposta | view, edit, delete |
| `chat.settings.attendants` | Config: Atendentes | view, manage |
| `chat.settings.teams` | Config: Times de atendimento | view, manage |
| `chat.settings.categories` | Config: Categorias e distribuição | view, manage |
| `chat.settings.apikeys` | Config: Chaves de API do chat | view, manage |

### Cadastros (`contacts`)
| Chave | Descrição | Ações relevantes |
|---|---|---|
| `contacts` | Módulo Cadastros completo | view, edit, delete, manage |
| `contacts.companies` | Lista de empresas | view, edit, delete |
| `contacts.people` | Lista de pessoas/contatos | view, edit, delete |

### Configurações Gerais (`settings`)
| Chave | Descrição | Ações relevantes |
|---|---|---|
| `settings` | Configurações gerais (apenas admin geralmente) | view, manage |
| `settings.team` | Aba Equipe + Permissões | view, manage |
| `settings.organization` | Aba Organização | view, manage |
| `settings.apikeys` | Chaves de API externas | view, manage |

**Total: 26 permissões granulares** (vs 5 atuais).

---

## Implementação Técnica

### Sem migração SQL — reaproveitamento da tabela existente

A tabela `user_permissions` já tem a estrutura correta (`module text, can_view, can_edit, can_delete, can_manage`). Basta inserir registros com as novas chaves granulares. **Nenhuma migração de schema é necessária**.

### Mudança no `hasPermission` no `AuthContext`

A lógica atual é:
```typescript
const perm = permissions.find(p => p.module === module);
```

Nova lógica com herança por prefixo:
```typescript
const hasPermission = (module: string, action: ...): boolean => {
  if (isAdmin) return true;
  
  // 1. Checar permissão exata (ex: "cs.kanban")
  const exactPerm = permissions.find(p => p.module === module);
  if (exactPerm) {
    if (exactPerm.can_manage) return true;
    switch (action) {
      case 'view': return exactPerm.can_view;
      // ...
    }
  }
  
  // 2. Herança: checar módulo pai (ex: "cs" para "cs.kanban")
  const parts = module.split('.');
  for (let i = parts.length - 1; i > 0; i--) {
    const parentKey = parts.slice(0, i).join('.');
    const parentPerm = permissions.find(p => p.module === parentKey);
    if (parentPerm) {
      if (parentPerm.can_manage) return true;
      switch (action) {
        case 'view': return parentPerm.can_view;
        // ...
      }
    }
  }
  
  return false;
};
```

Isso garante: se o usuário tem `cs.view = true` mas não tem `cs.kanban` configurado → herda acesso do pai. Se tem `cs.view = true` mas `cs.kanban.can_view = false` → bloqueado naquela seção.

### Mudança no `UserPermissionsDialog`

O diálogo atual mostra 5 módulos numa tabela plana. A nova interface usa **grupos colapsáveis com accordion** por módulo pai, onde cada grupo expande para mostrar as subpermissões.

Layout proposto:

```
▼ Customer Success              [view] [edit] [delete] [manage]
  └ Dashboard Kanban            [view] [edit]
  └ Jornadas                   [view] [edit] [delete]
  └ Rel. Health Score           [view]
  └ Rel. Risco/Churn            [view]
  └ Rel. Receita                [view]

▼ NPS                          [view] [edit] [delete] [manage]
  └ Dashboard de Métricas       [view]
  └ Campanhas                  [view] [edit] [delete]
  └ Configurações NPS           [view] [manage]

▼ Chat                         [view] [edit] [delete] [manage]
  └ Estação de Trabalho         [view]
  └ Histórico                  [view]
  └ Banners                    [view] [edit] [delete] [manage]
  └ Relatório Gerencial         [view]
  └ Config: Geral               [view] [manage]
  └ Config: Widget              [view] [manage]
  └ Config: Macros              [view] [edit] [delete]
  └ Config: Atendentes          [view] [manage]
  └ Config: Times               [view] [manage]
  └ Config: Categorias          [view] [manage]
  └ Config: Chaves de API       [view] [manage]

▼ Cadastros                    [view] [edit] [delete]
  └ Empresas                   [view] [edit] [delete]
  └ Pessoas                    [view] [edit] [delete]

▼ Configurações                [view] [manage]
  └ Equipe e Permissões         [view] [manage]
  └ Organização                [view] [manage]
  └ Chaves de API               [view] [manage]
```

Cada grupo pai tem um switch "Habilitar tudo" que propaga para todos os filhos. Filhos podem ser ajustados individualmente.

### Mudanças no `AppSidebar`

Substituir as chamadas genéricas por granulares onde aplicável:

```typescript
// Antes:
{hasPermission("cs", "view") && <CSSection />}

// Depois — por subitem:
{hasPermission("cs.kanban", "view") && <Link to="/cs-dashboard">Visão Geral</Link>}
{hasPermission("cs.trails", "view") && <Link to="/cs-trails">Jornadas</Link>}
{hasPermission("cs.reports.health", "view") && <Link to="/cs-health">Health Score</Link>}
// etc.
```

O menu pai (ex: "Customer Success") aparece se **qualquer filho** tiver permissão de view:
```typescript
const showCS = hasPermission("cs", "view") || 
               hasPermission("cs.kanban", "view") || 
               hasPermission("cs.trails", "view");
```

### Mudanças nas Páginas com Guard de Permissão

Páginas individuais que hoje fazem `hasPermission('cs', 'view')` serão atualizadas para o subchave correspondente:

| Página | Antes | Depois |
|---|---|---|
| `/cs-dashboard` | `cs.view` | `cs.kanban.view` |
| `/cs-trails` | `cs.view` | `cs.trails.view` |
| `/cs-health` | `cs.view` | `cs.reports.health.view` |
| `/cs-churn` | `cs.view` | `cs.reports.churn.view` |
| `/cs-financial` | `cs.view` | `cs.reports.financial.view` |
| `/nps/dashboard` | `nps.view` | `nps.dashboard.view` |
| `/nps/campaigns` | `nps.view` | `nps.campaigns.view` |
| `/nps/nps-settings` | `settings.manage` | `nps.settings.view` |
| `/admin/workspace` | `chat.view` | `chat.workspace.view` |
| `/admin/history` | `chat.view` | `chat.history.view` |
| `/admin/banners` | `chat.manage` | `chat.banners.view` |
| `/admin/gerencial` | `chat.view` | `chat.reports.view` |
| Aba Atendentes (AdminSettings) | `chat.manage` | `chat.settings.attendants.view` |
| Aba Times (AdminSettings) | `chat.manage` | `chat.settings.teams.view` |
| Aba Categorias (AdminSettings) | `chat.manage` | `chat.settings.categories.view` |

---

## Compatibilidade Retroativa

Todos os usuários existentes que têm permissões nos 5 módulos antigos continuam funcionando sem alteração — a herança de prefixo garante que `cs.view = true` ainda dá acesso a todos os subitens `cs.*` que não estejam explicitamente configurados.

Apenas quando um admin **explicitamente configura** um subitem (ex: `cs.trails.can_view = false`) é que a restrição entra em vigor — sobrescrevendo a herança do pai.

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | O que muda |
|---|---|---|
| `src/contexts/AuthContext.tsx` | MODIFICAR | Lógica `hasPermission` com herança por prefixo de ponto |
| `src/components/UserPermissionsDialog.tsx` | MODIFICAR | Substituir tabela plana por accordion agrupado com 26 permissões granulares; adicionar lógica de propagação pai→filhos |
| `src/components/AppSidebar.tsx` | MODIFICAR | Usar permissões granulares por item; visibilidade dos menus pais condicional a qualquer filho ativo |
| `src/pages/CSDashboard.tsx` | MODIFICAR | Guard: `cs.kanban.view` |
| `src/pages/CSTrailsPage.tsx` | MODIFICAR | Guard: `cs.trails.view` |
| `src/pages/CSHealthPage.tsx` | MODIFICAR | Guard: `cs.reports.health.view` |
| `src/pages/CSChurnPage.tsx` | MODIFICAR | Guard: `cs.reports.churn.view` |
| `src/pages/CSFinancialPage.tsx` | MODIFICAR | Guard: `cs.reports.financial.view` |
| `src/pages/Dashboard.tsx` (NPS) | MODIFICAR | Guard: `nps.dashboard.view` |
| `src/pages/Campaigns.tsx` | MODIFICAR | Guard: `nps.campaigns.view` |
| `src/pages/NPSSettings.tsx` | MODIFICAR | Guard: `nps.settings.view` |
| `src/pages/AdminSettings.tsx` | MODIFICAR | Cada aba verificada por sua permissão granular específica |
| `src/locales/pt-BR.ts` e `en.ts` | MODIFICAR | Adicionar labels para todos os 26 subpermissões |

---

## Sem migração de banco necessária

A tabela `user_permissions` já suporta strings arbitrárias na coluna `module`. Não há necessidade de migration SQL — apenas novos registros serão inseridos quando o admin salvar permissões granulares para um usuário. O sistema de upsert por `user_id,module` já garante idempotência.
