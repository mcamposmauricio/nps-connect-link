

# API `$jornadaCliente.update()` com Campos Customizados e Upsert de Empresa (Multi-Tenant)

## Visao Geral

Implementar um sistema completo que permita:
1. A plataforma hospedeira enviar dados via JavaScript (similar ao Intercom)
2. Cada tenant configurar seus proprios campos customizados (key, type, label) de forma independente
3. Campos de empresa (MRR, company_name, etc.) serem automaticamente upsertados no cadastro da empresa (`contacts`)
4. Os atendentes visualizarem dados customizados no painel lateral
5. O formulario de identificacao ser pulado quando nome/email ja forem fornecidos

---

## Isolamento Multi-Tenant

Todas as definicoes de campos customizados sao isoladas por `tenant_id`. Cada tenant:
- Cadastra suas proprias definicoes (ex: Tenant A tem "mrr" e "plano", Tenant B tem "setor" e "regiao")
- Ve apenas suas definicoes no painel administrativo
- Tem seus campos renderizados de forma independente no VisitorInfoPanel
- Novos tenants comecam sem nenhum campo customizado pre-definido -- tudo e configurado pelo admin do tenant
- RLS garante isolamento total via `get_user_tenant_id(auth.uid())`

---

## Parte 1: Tabela de Definicoes de Campos Customizados

### Nova tabela: `chat_custom_field_definitions`

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | PK |
| tenant_id | uuid | Isolamento por tenant (RLS) |
| user_id | uuid | Quem criou |
| key | text | Identificador no payload ("mrr", "link_master") |
| label | text | Nome visivel para atendentes ("Valor do MRR") |
| field_type | text | text, decimal, integer, date, url, boolean |
| target | text | "company" ou "contact" -- indica onde o dado sera persistido |
| maps_to | text | Coluna real na tabela contacts (ex: "mrr") ou NULL para custom_fields |
| display_order | integer | Ordem de exibicao |
| is_active | boolean | Permite desativar sem excluir |

Constraint UNIQUE em `(tenant_id, key)` para evitar duplicatas por tenant.

### Categorias de campos

**A. Campos reservados de contato (pessoa)** -- preenchem o visitor:
- `name`, `email`, `phone` -- nao precisam ser cadastrados

**B. Campos reservados de empresa** -- upsertam na tabela `contacts`:
- `company_id` -- usado como external_id para localizar/criar empresa via `company_contacts`
- `company_name` -- upsert em `contacts.trade_name`
- `mrr` -- upsert em `contacts.mrr`
- `contract_value` -- upsert em `contacts.contract_value`
- `company_sector` -- upsert em `contacts.company_sector`
- `company_document` -- upsert em `contacts.company_document`

**C. Campos customizados do tenant** -- salvos em `contacts.custom_fields` (JSONB):
- Qualquer campo cadastrado pelo admin com `target = "company"` que nao mapeia coluna real
- Exemplo: `plano_contratado`, `link_master`

---

## Parte 2: Logica de Upsert da Empresa no ChatWidget

### Fluxo no `handleStartChat` (ChatWidget.tsx)

Apos resolver o `ownerUserId` e antes de criar o visitor:

```text
1. Separar props recebidas em: dados_contato, dados_empresa, dados_customizados
2. Se company_id ou company_name presentes:
   a. Buscar company_contact pelo external_id (company_id) + owner
   b. Se encontrou: obter contact_id (empresa)
   c. Se nao encontrou e company_name presente: criar empresa + company_contact
3. Atualizar campos da empresa (contacts):
   - Campos mapeados (mrr, contract_value, etc.) via UPDATE direto
   - Campos customizados via merge no custom_fields JSONB
4. Vincular visitor ao company_contact_id e contact_id
5. Criar room com company_contact_id e contact_id
```

### Mapeamento de campos reservados de empresa

```typescript
const COMPANY_DIRECT_FIELDS: Record<string, string> = {
  mrr: "mrr",
  contract_value: "contract_value",
  company_sector: "company_sector",
  company_document: "company_document",
  company_name: "trade_name",
};
```

Campos que nao estao nesse mapa mas o admin cadastrou com `target = "company"` vao para `contacts.custom_fields` JSONB.

---

## Parte 3: Painel Administrativo - Configuracao de Campos por Tenant

### Nova secao na aba "Widget e Instalacao" do AdminSettings

- Titulo: "Campos Customizados do Chat"
- Tabela listando campos definidos: Key, Label, Tipo, Destino (Empresa/Contato), Mapeia para
- Botao "Adicionar campo" com formulario:
  - Key (identificador no payload, ex: "mrr")
  - Label (nome para atendentes, ex: "Valor do MRR")
  - Tipo: select com opcoes text, decimal, integer, date, url, boolean
  - Destino: Empresa ou Contato
  - Mapeia para (opcional): dropdown com colunas disponiveis da tabela contacts (mrr, contract_value, etc.)
- Editar/excluir por campo
- Limite de 20 campos por tenant
- Todos os dados filtrados pelo `tenant_id` do usuario logado (RLS)
- Cada tenant ve e gerencia APENAS seus proprios campos

---

## Parte 4: Auto-Start do Chat

### `src/pages/ChatWidget.tsx`

Quando `window.NPSChat.update()` enviar `name` e `email`:
1. Preencher automaticamente os campos do formulario
2. Disparar `handleStartChat` automaticamente (pular formulario)

```typescript
useEffect(() => {
  if (autoStartTriggered.current && formData.name && phase === "form" && !visitorId && !loading) {
    handleStartChat();
  }
}, [formData.name, phase, visitorId]);
```

---

## Parte 5: Exibicao no VisitorInfoPanel (por Tenant)

### `src/components/chat/VisitorInfoPanel.tsx`

1. Buscar definicoes de campos do tenant atual (`chat_custom_field_definitions WHERE tenant_id = X`)
2. Cruzar com `metadata` do visitor/room
3. Renderizar com label e formatacao por tipo:
   - `decimal` -- formato moeda (R$ 5.000,50)
   - `url` -- link clicavel
   - `date` -- data formatada
   - `boolean` -- badge Sim/Nao
   - `text` -- texto simples
4. Campos de empresa mapeados (MRR, contract_value) aparecem na aba "Empresa" normalmente
5. Nova secao "Dados Customizados" para campos em metadata/custom_fields

---

## Parte 6: Detalhes Tecnicos

### Migracao SQL

```sql
CREATE TABLE public.chat_custom_field_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  key text NOT NULL,
  label text NOT NULL,
  field_type text NOT NULL DEFAULT 'text',
  target text NOT NULL DEFAULT 'company',
  maps_to text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, key)
);

ALTER TABLE chat_custom_field_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members manage custom field defs"
  ON chat_custom_field_definitions FOR ALL
  USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
```

### Arquivos alterados

1. **Migracao SQL** -- Criar tabela `chat_custom_field_definitions` com constraint UNIQUE por tenant
2. **`src/pages/ChatWidget.tsx`** -- Separar props, upsert empresa, auto-start, vincular visitor/room
3. **`src/pages/AdminSettings.tsx`** -- Secao de gerenciamento de campos customizados (filtrado por tenant)
4. **`src/components/chat/VisitorInfoPanel.tsx`** -- Exibicao de campos customizados com labels/tipos do tenant

### Fluxo completo

```text
Tenant A configura: key="mrr" label="Valor MRR" type="decimal" target="company" maps_to="mrr"
Tenant A configura: key="plano" label="Plano" type="text" target="company" maps_to=null
Tenant B configura: key="regiao" label="Regiao" type="text" target="company" maps_to=null

-- Visitante no site do Tenant A:
window.NPSChat.update({ name: "Joao", email: "j@emp.com", company_id: "ABC", mrr: 5000, plano: "Premium" })

  1. ChatWidget recebe via postMessage
  2. Preenche nome/email -> auto-start (pula formulario)
  3. Busca company_contact por external_id "ABC" no tenant A
  4. Encontra empresa -> UPDATE contacts SET mrr=5000, custom_fields=merge({plano:"Premium"})
  5. Visitor criado vinculado ao company_contact e contact
  6. Atendente do Tenant A ve: MRR R$5.000 na aba Empresa + "Plano: Premium" nos customizados
  7. Tenant B nao ve nada disso -- tem suas proprias definicoes isoladas
```

