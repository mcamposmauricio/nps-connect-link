

# Plano de Implementacao - Correcoes e Melhorias

## Escopo

Implementar as correcoes e melhorias identificadas na revisao critica, priorizando itens que nao quebrem fluxos existentes. Itens organizados em 4 blocos.

---

## Bloco 1: Seguranca (Critico)

### 1.1 Sanitizacao de busca (SQL Injection)
- **Arquivos**: `src/pages/Dashboard.tsx`, `src/pages/People.tsx`
- Criar funcao utilitaria `sanitizeFilterValue(term)` em `src/lib/utils.ts` que escapa caracteres especiais do filtro Supabase (`,`, `(`, `)`, `.`, `"`)
- Aplicar nos `.or()` das buscas de contatos

### 1.2 Prevencao de resposta NPS duplicada
- **Arquivo**: `src/pages/NPSResponse.tsx`
- Antes de inserir na tabela `responses`, verificar se ja existe uma resposta com o mesmo `campaign_id + contact_id`
- Se existir, mostrar mensagem "Voce ja respondeu esta pesquisa" e marcar como `submitted`

### 1.3 Corrigir rota legada em Campaigns.tsx
- **Arquivo**: `src/pages/Campaigns.tsx` (linha 243)
- Mudar `navigate(/campaigns/${campaign.id})` para `navigate(/nps/campaigns/${campaign.id})`
- Tambem corrigir em Dashboard.tsx (linha 738) o mesmo padrao

---

## Bloco 2: Performance

### 2.1 Debounce na busca de People
- **Arquivo**: `src/pages/People.tsx`
- Separar `search` (valor digitado) de `debouncedSearch` (valor usado na queryKey)
- Usar `useEffect` com `setTimeout` de 300ms para atualizar `debouncedSearch`
- Passar `debouncedSearch` na queryKey em vez de `search`

### 2.2 Otimizar N+1 queries em Dashboard (fetchCampaignStats)
- **Arquivo**: `src/pages/Dashboard.tsx`
- Em vez de fazer 1 query por campanha, buscar todas as respostas dos campaign_ids de uma vez
- Agrupar no client por `campaign_id`

---

## Bloco 3: UX e Funcionalidade

### 3.1 Busca/filtro na pagina de Empresas (Contacts)
- **Arquivo**: `src/pages/Contacts.tsx`
- Adicionar campo de busca por nome/CNPJ acima da grid
- Filtrar localmente (ja carrega tudo) pelo texto digitado

### 3.2 Remover limite de 5 em empresas em risco (Churn)
- **Arquivo**: `src/pages/CSChurnPage.tsx`
- Remover `.slice(0, 5)` e mostrar todas as empresas em risco
- Adicionar scroll se a lista for grande

### 3.3 Visual consistente na pagina Esqueci Senha
- **Arquivo**: `src/pages/ForgotPassword.tsx`
- Alinhar ao tema dark usado em Auth.tsx (`bg-dark-hero`) em vez do gradiente claro atual

---

## Bloco 4: Limpeza de Codigo

### 4.1 Remover Layout.tsx (codigo morto)
- **Arquivo**: `src/components/Layout.tsx`
- Deletar o arquivo -- nenhuma rota o utiliza

### 4.2 Corrigir hardcoded strings no NPSResponse
- **Arquivo**: `src/pages/NPSResponse.tsx`
- Mover "Link invalido", "Obrigado!", "Erro", etc. para as chaves de traducao nos arquivos `pt-BR.ts` e `en.ts`

---

## Detalhes Tecnicos

### Funcao de sanitizacao (utils.ts)

```typescript
export function sanitizeFilterValue(value: string): string {
  return value.replace(/[,()."\\]/g, '');
}
```

### Debounce em People.tsx

```typescript
const [search, setSearch] = useState("");
const [debouncedSearch, setDebouncedSearch] = useState("");

useEffect(() => {
  const timer = setTimeout(() => setDebouncedSearch(search), 300);
  return () => clearTimeout(timer);
}, [search]);

// queryKey usa debouncedSearch em vez de search
```

### Verificacao de duplicata em NPSResponse.tsx

```typescript
// Antes do insert
const { data: existing } = await supabase
  .from("responses")
  .select("id")
  .eq("campaign_id", campaignData.campaign_id)
  .eq("contact_id", campaignData.contact_id)
  .maybeSingle();

if (existing) {
  setSubmitted(true);
  return;
}
```

### Novas chaves de traducao

| Chave | pt-BR | en |
|-------|-------|----|
| `nps.response.invalidLink` | Link invalido | Invalid link |
| `nps.response.invalidLinkDesc` | Este link nao e valido ou expirou. | This link is not valid or has expired. |
| `nps.response.thanks` | Obrigado! | Thank you! |
| `nps.response.successDesc` | Sua resposta foi enviada com sucesso. | Your response was submitted successfully. |
| `nps.response.error` | Erro | Error |
| `nps.response.errorDesc` | Nao foi possivel carregar a pesquisa. | Could not load the survey. |
| `nps.response.errorSubmit` | Nao foi possivel enviar sua resposta. | Could not submit your response. |
| `nps.response.alreadyResponded` | Voce ja respondeu esta pesquisa. | You have already responded to this survey. |

---

## O que NAO sera alterado

- Nao sera criada RPC para aggregates NPS (mudanca grande demais, risco de quebra)
- Nao sera alterado o AuthContext (upsert no login funciona e e necessario)
- Nao sera alterado o fluxo de autenticacao/rotas protegidas (SidebarLayout ja protege)
- Nao sera mexido no AppSidebar (consolidacao de queries requer views no banco)
- Nao sera adicionado i18n no AdminDashboard (escopo muito grande, tratado separadamente)

