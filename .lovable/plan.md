

# Plano: Sistema Completo de Permissoes nas Configuracoes Gerais

## Situacao Atual

Hoje o sistema tem um modelo de permissoes muito basico:
- Tabela `user_roles` com enum `app_role` que aceita apenas `admin` e `attendant`
- A pagina `AdminUsers` (dentro do modulo Chat) lista roles mostrando apenas IDs truncados de usuarios, sem email nem controle granular
- O `useAuth` retorna apenas `isAdmin` (boolean) e `isChatEnabled`
- O sidebar esconde itens do Chat se nao for admin, mas **todas as outras areas ficam acessiveis a qualquer usuario logado** (CS, NPS, Cadastros, Configuracoes)

**Problemas:**
1. Nao existe controle de acesso por modulo (CS, NPS, Chat, Cadastros)
2. Nao existe diferenciacao entre "viewer" e "editor"
3. A pagina de usuarios so mostra UUID, impossivel saber quem e quem
4. A gestao de permissoes esta escondida dentro do modulo de Chat, quando deveria ser global

---

## O que sera feito

### 1. Nova tabela `user_permissions` para controle granular por modulo

Criar uma tabela que armazena permissoes por usuario e por modulo:

```sql
CREATE TABLE public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  module text NOT NULL,        -- 'cs', 'nps', 'chat', 'contacts', 'settings'
  can_view boolean DEFAULT false,
  can_edit boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  can_manage boolean DEFAULT false,  -- permissao total do modulo
  granted_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, module)
);
```

**Modulos disponiveis:**
- `cs` -- Customer Success (Dashboard, Jornadas, Equipe CS, Relatorios)
- `nps` -- NPS (Metricas, Pesquisas)
- `chat` -- Chat de Atendimento (Dashboard, Workspace, Atendentes, Historico, Gerencial, Configuracoes Chat)
- `contacts` -- Cadastros (Empresas, Pessoas)
- `settings` -- Configuracoes Gerais (Marca, Email, Notificacoes, API Keys)

**RLS:** Admins podem ver/editar todas as permissoes. Usuarios comuns podem ver apenas suas proprias.

### 2. Nova tabela `user_profiles` para identificar usuarios

```sql
CREATE TABLE public.user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email text NOT NULL,
  display_name text,
  avatar_url text,
  is_active boolean DEFAULT true,
  last_sign_in_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Trigger:** Criar automaticamente um perfil quando um usuario faz signup (via trigger em auth.users nao e possivel, mas faremos via codigo no `Auth.tsx` e no `useAuth`).

### 3. Aba "Usuarios e Permissoes" nas Configuracoes Gerais (`Settings.tsx`)

Adicionar uma 5a aba na pagina de Configuracoes (`/nps/settings`):

**Aba "Equipe" (visivel apenas para admins):**
- Lista de todos os usuarios do sistema com:
  - Avatar / Iniciais
  - Nome de exibicao
  - Email
  - Role principal (Admin / Atendente / Usuario)
  - Status (Ativo / Inativo)
  - Botao "Editar Permissoes"

- Ao clicar em "Editar Permissoes", abre um Dialog/Sheet com:
  - Info do usuario (nome, email)
  - Toggle para cada modulo:
    ```
    Customer Success    [Visualizar] [Editar] [Gerenciar]
    NPS                 [Visualizar] [Editar] [Gerenciar]
    Chat                [Visualizar] [Editar] [Gerenciar]
    Cadastros           [Visualizar] [Editar] [Gerenciar]
    Configuracoes       [Visualizar] [Editar] [Gerenciar]
    ```
  - Checkbox "Administrador" (toggle da role admin)
  - Quando admin, todos os modulos ficam automaticamente com acesso total

- Botao "Convidar Usuario" (apenas copia o link de signup com instrucoes)

### 4. Atualizar `useAuth` para carregar permissoes

O hook passara a retornar:
```typescript
interface UseAuthReturn {
  user: User | null;
  isAdmin: boolean;
  isChatEnabled: boolean;
  loading: boolean;
  permissions: UserPermissions;
  hasPermission: (module: string, action: 'view' | 'edit' | 'delete' | 'manage') => boolean;
}
```

Admins tem acesso total a tudo automaticamente. Para outros usuarios, o acesso e verificado na tabela `user_permissions`.

### 5. Atualizar `AppSidebar.tsx` para respeitar permissoes

Cada grupo de menu sera exibido condicionalmente:
- **Customer Success**: visivel se `hasPermission('cs', 'view')`
- **Cadastros**: visivel se `hasPermission('contacts', 'view')`
- **NPS**: visivel se `hasPermission('nps', 'view')`
- **Chat**: visivel se `hasPermission('chat', 'view')`
- Configuracoes: sempre visivel, mas aba "Equipe" so para admins

### 6. Remover pagina `AdminUsers` (substituida pela aba nas Configuracoes)

A gestao de usuarios/permissoes sai do modulo de Chat e vai para as Configuracoes Gerais, que e o local logico.

### 7. Criar perfil automaticamente no login/signup

No `Auth.tsx`, apos login bem-sucedido, fazer upsert em `user_profiles` com email e timestamp de login.

---

## Arquivos

### Novos:
| Arquivo | Descricao |
|---------|-----------|
| `src/components/TeamSettingsTab.tsx` | Aba de Equipe nas Configuracoes -- lista usuarios, dialog de permissoes |
| `src/components/UserPermissionsDialog.tsx` | Dialog para editar permissoes de um usuario especifico |

### Modificados:
| Arquivo | Alteracao |
|---------|-----------|
| Migration SQL | Criar tabelas `user_permissions` e `user_profiles` com RLS |
| `src/hooks/useAuth.ts` | Adicionar `permissions` e `hasPermission()`, fazer upsert de profile no login |
| `src/pages/Settings.tsx` | Adicionar 5a aba "Equipe" (condicional para admins) |
| `src/components/AppSidebar.tsx` | Condicionar cada grupo de menu a `hasPermission` |
| `src/pages/Auth.tsx` | Fazer upsert em `user_profiles` apos login/signup |
| `src/App.tsx` | Remover rota `/admin/users` (substituida pela aba nas Configuracoes) |
| `src/locales/pt-BR.ts` | ~30 novas chaves para a aba de Equipe e permissoes |
| `src/locales/en.ts` | ~30 novas chaves para a aba de Equipe e permissoes |

### Removidos:
| Arquivo | Motivo |
|---------|--------|
| `src/pages/AdminUsers.tsx` | Funcionalidade migrada para aba "Equipe" nas Configuracoes |

---

## Detalhes Tecnicos

### Migration SQL

```sql
-- 1. Tabela de perfis
CREATE TABLE public.user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email text NOT NULL,
  display_name text,
  avatar_url text,
  is_active boolean DEFAULT true,
  last_sign_in_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Admins veem todos, usuarios veem apenas o proprio
CREATE POLICY "Admins can view all profiles"
  ON public.user_profiles FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update any profile"
  ON public.user_profiles FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- 2. Tabela de permissoes
CREATE TABLE public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  module text NOT NULL,
  can_view boolean DEFAULT false,
  can_edit boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  can_manage boolean DEFAULT false,
  granted_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, module)
);
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all permissions"
  ON public.user_permissions FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own permissions"
  ON public.user_permissions FOR SELECT
  USING (auth.uid() = user_id);
```

### Logica de permissao no `useAuth`

```typescript
const hasPermission = (module: string, action: 'view' | 'edit' | 'delete' | 'manage') => {
  if (isAdmin) return true; // Admin tem acesso total
  const perm = permissions.find(p => p.module === module);
  if (!perm) return false;
  if (perm.can_manage) return true; // Manage inclui tudo
  switch (action) {
    case 'view': return perm.can_view;
    case 'edit': return perm.can_edit || perm.can_manage;
    case 'delete': return perm.can_delete || perm.can_manage;
    case 'manage': return perm.can_manage;
  }
};
```

### Sidebar condicional

```typescript
// Exemplo: grupo CS so aparece se tiver permissao
{hasPermission('cs', 'view') && (
  <SidebarGroup>
    <SidebarGroupLabel>{t("cs.title")}</SidebarGroupLabel>
    ...
  </SidebarGroup>
)}
```

### Perfil automatico no login

No `Auth.tsx`, apos login bem-sucedido:
```typescript
await supabase.from('user_profiles').upsert({
  user_id: session.user.id,
  email: session.user.email,
  display_name: session.user.email.split('@')[0],
  last_sign_in_at: new Date().toISOString(),
}, { onConflict: 'user_id' });
```

---

## Ordem de Implementacao

1. Migration SQL (criar tabelas + RLS)
2. Atualizar `useAuth.ts` com `permissions` e `hasPermission`
3. Atualizar `Auth.tsx` com upsert de profile
4. Criar `TeamSettingsTab.tsx` e `UserPermissionsDialog.tsx`
5. Atualizar `Settings.tsx` com aba "Equipe"
6. Atualizar `AppSidebar.tsx` com condicionais de permissao
7. Atualizar i18n (pt-BR e en)
8. Remover `AdminUsers.tsx` e rota `/admin/users` do sidebar e `App.tsx`

