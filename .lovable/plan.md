
# Backoffice Master: Painel de Administracao Global

## Contexto

O usuario `mcampos.mauricio@gmail.com` ja existe no `auth.users` (id: `c24cb1ed-...`) mas nao possui `user_profile` nem `user_role`. Sera criado como usuario **master** com acesso ao backoffice global, independente de tenant.

---

## 1. BANCO DE DADOS

### 1.1 Adicionar role "master" ao enum `app_role`
```sql
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'master';
```

### 1.2 Criar profile e role para mcampos.mauricio@gmail.com
```sql
INSERT INTO public.user_profiles (user_id, email, display_name, invite_status)
VALUES ('c24cb1ed-3b26-4599-b8d1-97f6f8536cae', 'mcampos.mauricio@gmail.com', 'Mauricio Campos', 'accepted');

INSERT INTO public.user_roles (user_id, role)
VALUES ('c24cb1ed-3b26-4599-b8d1-97f6f8536cae', 'master');
```

### 1.3 Criar funcao `is_master` (security definer)
```sql
CREATE OR REPLACE FUNCTION public.is_master(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'master'
  )
$$;
```

### 1.4 Politicas RLS para acesso master

Adicionar politicas em tabelas-chave para que o master possa ler/editar dados de **todos** os tenants:

- **tenants**: Master pode SELECT, INSERT, UPDATE, DELETE
- **user_profiles**: Master pode SELECT e UPDATE todos
- **user_roles**: Master pode gerenciar todos
- **contacts**: Master pode SELECT todos
- **campaigns**: Master pode SELECT todos
- **chat_rooms**: Master pode SELECT todos
- **chat_settings**: Master pode SELECT e UPDATE todos
- **brand_settings**: Master pode SELECT e UPDATE todos
- **user_email_settings**: Master pode SELECT todos
- **csms**: Master pode SELECT e UPDATE todos

Cada politica segue o padrao:
```sql
CREATE POLICY "Master full access on tenants"
ON public.tenants FOR ALL
USING (is_master(auth.uid()))
WITH CHECK (is_master(auth.uid()));
```

---

## 2. AUTENTICACAO (AuthContext)

### 2.1 Adicionar `isMaster` ao contexto
- Novo estado `isMaster` em `AuthContext.tsx`
- Na funcao `loadUserData`, verificar se alguma role e `'master'`
- Se `isMaster`, definir `isAdmin = true` tambem (heranca de permissoes)
- Expor `isMaster` na interface `AuthContextType`

---

## 3. ROTA E PAGINA BACKOFFICE

### 3.1 Rota protegida `/backoffice`
- Em `App.tsx`, adicionar rota dentro do `SidebarLayout`:
```
<Route path="/backoffice" element={<Backoffice />} />
```

### 3.2 Pagina `src/pages/Backoffice.tsx`
Pagina com abas (Tabs) contendo todas as funcionalidades que normalmente requerem acesso direto ao banco:

#### Aba 1: Tenants/Plataformas
- **Lista de tenants** com nome, slug, logo, status (ativo/inativo), data de criacao
- **Criar novo tenant**: Formulario com nome, slug, logo
- **Editar tenant**: Inline edit ou dialog
- **Ativar/Desativar tenant**
- **Estatisticas por tenant**: Quantidade de usuarios, empresas, campanhas, salas de chat

#### Aba 2: Usuarios Globais
- **Lista de TODOS os user_profiles** de todos os tenants, com filtro por tenant
- **Associar usuario a tenant**: Dropdown de tenants para mover usuario
- **Promover/Revogar admin**: Toggle de role admin por usuario
- **Resetar senha**: Botao que envia email de reset via `supabase.auth.admin`
- **Desativar usuario**: Toggle `is_active`
- **Ver permissoes**: Link para ver as permissoes granulares do usuario

#### Aba 3: Configuracoes Globais
- **Email settings por tenant**: Ver e editar configuracoes de email (provider, SMTP, Gmail)
- **Brand settings por tenant**: Ver e editar cores, logo, nome da marca
- **Chat settings por tenant**: Ver e editar configuracoes do widget (cores, mensagens, posicao)

#### Aba 4: Dados e Metricas
- **Contagem global**: Total de empresas, contatos, campanhas, respostas NPS, salas de chat por tenant
- **Ultimas respostas NPS**: Feed das ultimas respostas recebidas globalmente
- **Salas de chat ativas**: Visao geral de todas as salas abertas em todos os tenants

#### Aba 5: Operacoes
- **Executar edge functions manualmente**: Botoes para invocar `process-chat-auto-rules`, `process-automatic-campaigns`, etc.
- **Logs recentes**: Exibir resultado da ultima execucao
- **Criar convite de admin**: Gerar link de convite para um novo admin em qualquer tenant

---

## 4. SIDEBAR

### 4.1 Item de menu "Backoffice"
- No `AppSidebar.tsx`, adicionar um grupo **"Backoffice"** visivel APENAS quando `isMaster === true`
- Icone: `Shield` ou `Crown`
- Aparece acima de todos os outros grupos

---

## 5. EDGE FUNCTION (opcional, para operacoes admin)

### 5.1 `backoffice-admin` edge function
Para operacoes que requerem `service_role_key` (ex: resetar senha, listar auth.users):
- Verificar que o caller tem role `master` antes de executar
- Endpoints:
  - `reset-password`: Envia email de reset para um usuario
  - `list-auth-users`: Lista usuarios do auth.users com paginacao
  - `delete-auth-user`: Remove usuario do auth (se necessario)

---

## 6. COMPONENTES AUXILIARES

### 6.1 `src/components/backoffice/TenantManagement.tsx`
- CRUD completo de tenants
- Dialog de criacao com campos: nome, slug, logo (upload para bucket)
- Tabela com acoes inline

### 6.2 `src/components/backoffice/UserManagement.tsx`
- Tabela de usuarios com filtros por tenant, role, status
- Acoes: editar tenant, toggle admin, desativar, ver permissoes

### 6.3 `src/components/backoffice/GlobalSettings.tsx`
- Cards por tenant mostrando email/brand/chat settings
- Formularios de edicao inline

### 6.4 `src/components/backoffice/GlobalMetrics.tsx`
- Cards com metricas agregadas
- Tabelas de dados recentes

### 6.5 `src/components/backoffice/Operations.tsx`
- Botoes de execucao de edge functions
- Log de resultados

---

## Secao Tecnica - Resumo de Arquivos

| Arquivo | Acao |
|---|---|
| Migration SQL | Adicionar 'master' ao enum, criar profile/role, criar `is_master()`, adicionar RLS policies |
| `src/contexts/AuthContext.tsx` | Adicionar `isMaster` ao contexto |
| `src/hooks/useAuth.ts` | Exportar `isMaster` |
| `src/App.tsx` | Adicionar rota `/backoffice` |
| `src/pages/Backoffice.tsx` | **Novo** - Pagina principal com 5 abas |
| `src/components/backoffice/TenantManagement.tsx` | **Novo** - CRUD de tenants |
| `src/components/backoffice/UserManagement.tsx` | **Novo** - Gestao de usuarios globais |
| `src/components/backoffice/GlobalSettings.tsx` | **Novo** - Configs por tenant |
| `src/components/backoffice/GlobalMetrics.tsx` | **Novo** - Metricas globais |
| `src/components/backoffice/Operations.tsx` | **Novo** - Execucao de funcoes |
| `src/components/AppSidebar.tsx` | Adicionar item Backoffice para master |
| `supabase/functions/backoffice-admin/index.ts` | **Novo** - Edge function para operacoes admin |

## Prioridade de Implementacao

1. Migration (enum + dados + funcao + RLS)
2. AuthContext com `isMaster`
3. Rota + Pagina Backoffice com Aba de Tenants
4. Aba de Usuarios Globais
5. Aba de Configuracoes Globais
6. Aba de Metricas
7. Aba de Operacoes
8. Edge function backoffice-admin
9. Sidebar item
