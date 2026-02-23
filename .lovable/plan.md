
# Plano: API de Update no Embed Script + Correcao de Visibilidade Cross-Tenant

## Parte 1: API `window.NPSChat.update()` no Embed Script

### Objetivo
Permitir que a plataforma que embeda o widget envie dados do usuario (nome, email, telefone) e campos customizados via JavaScript, eliminando a necessidade do formulario de identificacao quando os dados ja estao disponiveis.

### Como funciona

A plataforma chamara:
```javascript
window.NPSChat.update({
  name: "Joao Silva",
  email: "joao@empresa.com",
  phone: "11999999999",
  company_id: "ABC123",
  company_name: "Empresa X",
  plano_contratado: "Premium",
  client_start_at: "2024-01-15",
  // qualquer campo customizado...
});
```

### Alteracoes

#### A. `public/nps-chat-embed.js`

1. Expor objeto global `window.NPSChat` com metodo `update(props)`
2. O metodo `update`:
   - Armazena as propriedades recebidas em uma variavel interna `visitorProps`
   - Envia as propriedades ao iframe via `postMessage` com tipo `nps-chat-update`
   - Se `name`, `email` ou `phone` forem fornecidos, serao usados para preencher/pular o formulario

#### B. `src/pages/ChatWidget.tsx`

1. Escutar mensagens `nps-chat-update` vindas do parent frame
2. Ao receber:
   - Preencher `formData` com `name`, `email`, `phone` (se fornecidos)
   - Armazenar campos extras em um state `customProps` (tudo que nao for name/email/phone)
   - Se `name` estiver preenchido e nao houver chat ativo, pular automaticamente para criacao do chat (auto-start)
3. Na criacao do visitor (`handleStartChat`), salvar os `customProps` no campo `metadata` da tabela `chat_visitors`
4. Na criacao do room, salvar `customProps` no campo `metadata` da tabela `chat_rooms`

### Fluxo

```
Plataforma chama window.NPSChat.update({name, email, ...custom})
  --> postMessage para iframe
    --> ChatWidget recebe, preenche form, armazena custom props
      --> Se name presente, auto-cria visitor com metadata
        --> Cria room com metadata
          --> Atendente ve os dados customizados no painel
```

### Campos reservados vs customizados

- **Reservados** (usados para identificacao): `name`, `email`, `phone`
- **Customizados** (salvos em metadata): todos os demais campos passados

---

## Parte 2: Correcao de Visibilidade Cross-Tenant de Usuarios

### Problema

A politica RLS `"Admins or self can view profiles"` na tabela `user_profiles` permite que qualquer usuario com role `admin` (de qualquer tenant) veja TODOS os perfis do sistema. O usuario admin da MARQ consegue ver atendentes da Suporte e vice-versa.

### Causa

```sql
-- Politica atual (sem filtro de tenant):
USING (has_role(auth.uid(), 'admin') OR (auth.uid() = user_id))
```

### Correcao

Adicionar filtro de `tenant_id` para admins:

```sql
DROP POLICY "Admins or self can view profiles" ON user_profiles;

CREATE POLICY "Admins can view tenant profiles"
  ON user_profiles FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND tenant_id = get_user_tenant_id(auth.uid())
  );

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);
```

Tambem corrigir as politicas de INSERT e UPDATE de admin para incluir filtro de tenant:

```sql
DROP POLICY "Admins can insert any profile" ON user_profiles;
CREATE POLICY "Admins can insert tenant profiles"
  ON user_profiles FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    AND tenant_id = get_user_tenant_id(auth.uid())
  );

DROP POLICY "Admins can update any profile" ON user_profiles;
CREATE POLICY "Admins can update tenant profiles"
  ON user_profiles FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND tenant_id = get_user_tenant_id(auth.uid())
  );
```

A politica `"Master can view all profiles"` permanece inalterada (masters devem ver tudo).

### Resultado

- Admins verao apenas usuarios do seu proprio tenant
- Masters continuam vendo tudo (backoffice)
- Cada usuario pode ver seu proprio perfil independente de role
- O painel de equipe da MARQ mostrara apenas membros da MARQ
