

# Exibir Link de Acesso do Admin no Painel Master

## Resumo

Apos criar uma plataforma com admin, o link de convite aparece apenas em um toast que desaparece rapidamente. A proposta e:

1. Exibir um dialog de confirmacao apos criar o tenant com o link copiavel
2. Adicionar uma coluna na tabela de tenants para mostrar o status do admin (pendente/aceito) com opcao de copiar o link ou reenviar

## Alteracoes

### 1. `src/components/backoffice/TenantManagement.tsx`

**A) Dialog de sucesso apos criacao com link copiavel**

Adicionar um novo estado e dialog que aparece apos a criacao bem-sucedida do tenant:

- Estado `inviteResult` com `{ inviteUrl, email, userAlreadyExists }`
- Dialog com:
  - Mensagem de sucesso
  - Link completo (`https://nps-connect-link.lovable.app/auth?invite=TOKEN`) exibido em um campo de texto readonly
  - Botao "Copiar link" que copia para a area de transferencia
  - Nota informando que o admin deve acessar esse link para configurar a plataforma

No `onSuccess` da `saveMutation`, em vez de mostrar apenas o toast, popular o estado e abrir o dialog.

**B) Coluna "Admin" na tabela de tenants**

- Adicionar uma query para buscar convites pendentes (`user_profiles` com `invite_status = 'pending'` por tenant)
- Na tabela, adicionar uma coluna "Admin" que mostra:
  - Se existe convite pendente: badge "Pendente" + botao para copiar o link
  - Se admin ja aceitou: badge "Ativo" com o email
  - Se nao tem admin: texto "Sem admin"

**C) Botao para copiar link de convites pendentes existentes**

Para tenants que ja foram criados mas o admin ainda nao aceitou o convite, exibir um icone de copia ao lado do badge "Pendente" que monta o link `{published_url}/auth?invite={invite_token}` e copia para a clipboard.

### 2. Detalhes tecnicos

**Busca de invites pendentes:**
```typescript
const { data: pendingInvites } = useQuery({
  queryKey: ["backoffice-pending-invites"],
  queryFn: async () => {
    const { data } = await supabase
      .from("user_profiles")
      .select("id, email, display_name, invite_token, invite_status, tenant_id")
      .eq("invite_status", "pending")
      .not("tenant_id", "is", null);
    return data || [];
  },
});
```

**Montagem do link completo:**
```typescript
const baseUrl = window.location.origin; // funciona tanto em preview quanto em producao
const fullInviteUrl = `${baseUrl}/auth?invite=${inviteToken}`;
```

**Copia para clipboard:**
```typescript
navigator.clipboard.writeText(fullInviteUrl);
toast({ title: "Link copiado!" });
```

**Dialog de sucesso pos-criacao:**
- Usa `Dialog` com campo readonly mostrando o link
- Botao com icone `Copy` do lucide-react
- Fecha ao clicar "Fechar" e limpa o estado

**Nova coluna na tabela:**
- Entre "Criado em" e as colunas de stats
- Mostra email do admin + status (Pendente com link / Ativo / Sem admin)

### Arquivos modificados

1. `src/components/backoffice/TenantManagement.tsx` -- dialog de sucesso, query de invites, coluna na tabela

