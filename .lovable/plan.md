
# Plano: Lista de Pessoas (Contatos) + Link do Portal Publico

## O que sera feito

Hoje o sistema tem apenas a visao de **Empresas** no menu "Cadastros". Cada empresa tem seus contatos (people) dentro de um Sheet lateral. O pedido e:

1. Criar uma **nova pagina "Pessoas"** (`/nps/people`) que lista TODOS os `company_contacts` de forma independente, similar a pagina de Empresas
2. Ao clicar em uma pessoa, abrir um **Sheet de detalhes completo** consolidando: dados pessoais, empresa vinculada, historico de chats, CSAT medio, ultimo NPS da empresa, timeline e link do portal publico
3. Cada contato mostra o **link publico do portal** (`/portal/:token`) com botao de copiar -- visivel tanto na lista de pessoas quanto no Sheet de detalhes da empresa existente
4. Adicionar **"Pessoas"** como segundo item na secao "Cadastros" do menu lateral

---

## Estrutura de Dados (Sem alteracoes no banco)

Todas as colunas necessarias ja existem:

- `company_contacts.public_token` -- ja existe, gerado automaticamente
- `company_contacts.chat_total`, `chat_avg_csat`, `chat_last_at` -- ja existem
- `company_contacts.company_id` -- referencia para `contacts` (empresa)

Nenhuma migration SQL necessaria.

---

## Arquivos Novos

### 1. `src/pages/People.tsx`

Pagina principal com:
- Titulo "Pessoas" / "People" com contador total
- Campo de busca (filtro por nome/email)
- Tabela com colunas: Nome, Email, Empresa, Cargo, Telefone, Chats, CSAT, Portal
- Coluna "Portal" com icone de link que copia o URL `{origin}/portal/{public_token}` ao clicar
- Ao clicar na linha, abre Sheet de detalhes
- Fetch: busca todos `company_contacts` do usuario com join para `contacts` (empresa) via `company_id`

### 2. `src/components/PersonDetailsSheet.tsx`

Sheet lateral com abas (similar ao `CompanyCSDetailsSheet`):

**Aba "Visao Geral":**
- Dados pessoais: nome, email, telefone, cargo, departamento, ID externo
- Empresa vinculada: nome da empresa (clicavel, poderia navegar)
- Link publico do portal com botao de copiar
- Metricas de chat: total de chats, CSAT medio, ultimo chat

**Aba "Chats":**
- Lista de `chat_rooms` vinculadas a esse `company_contact_id`
- Status, data, CSAT de cada conversa
- Expandir para ver transcript (similar ao UserPortal)

**Aba "Timeline":**
- Eventos da timeline da empresa vinculada (filtrado pelo contact se possivel)

---

## Arquivos Modificados

### 3. `src/components/CompanyContactsList.tsx`

Adicionar botao de "Copiar Link do Portal" em cada contato na lista existente (icone de link ao lado dos botoes de editar/excluir). Ao clicar, copia `{origin}/portal/{contact.public_token}` e mostra toast "Link copiado!".

Requer que a interface `CompanyContact` inclua `public_token`.

### 4. `src/components/AppSidebar.tsx`

Adicionar item "Pessoas" na secao "Cadastros", abaixo de "Empresas":
```
Cadastros
  Empresas   -> /nps/contacts
  Pessoas    -> /nps/people
```

### 5. `src/App.tsx`

Adicionar rota: `<Route path="/nps/people" element={<People />} />`

### 6. `src/locales/pt-BR.ts` e `src/locales/en.ts`

Novas chaves:
- `nav.people`: "Pessoas" / "People"
- `people.title`: "Pessoas" / "People"
- `people.subtitle`: "Todos os contatos do sistema" / "All contacts in the system"
- `people.search`: "Buscar por nome ou email..." / "Search by name or email..."
- `people.company`: "Empresa" / "Company"
- `people.chats`: "Chats" / "Chats"
- `people.noResults`: "Nenhuma pessoa encontrada" / "No people found"
- `people.details`: "Detalhes do Contato" / "Contact Details"
- `people.chatHistory`: "Historico de Chats" / "Chat History"
- `people.portalLink`: "Link do Portal" / "Portal Link"
- `people.copyLink`: "Copiar Link" / "Copy Link"
- `people.linkCopied`: "Link copiado!" / "Link copied!"
- `people.overview`: "Visao Geral" / "Overview"

### 7. `src/pages/Contacts.tsx`

Alterar o fetch de `company_contacts` para incluir o campo `public_token` (ja vem por padrao no SELECT *, mas garantir na interface).

---

## Detalhes Tecnicos

- **Busca de pessoas**: `SELECT * FROM company_contacts WHERE user_id = auth.uid()` com join manual para buscar nome da empresa em `contacts`
- **Filtro**: `.ilike('name', '%search%')` ou `.or('name.ilike.%s%,email.ilike.%s%')` no Supabase
- **Copiar link**: `navigator.clipboard.writeText(url)` + toast de confirmacao
- **Sheet de detalhes**: Reutiliza padrao do `CompanyCSDetailsSheet` com Tabs
- **Performance**: Busca empresa junto no fetch inicial para evitar N+1 queries

---

## Ordem de Implementacao

1. Traducoes i18n (pt-BR e en)
2. Pagina `People.tsx` com tabela e busca
3. Componente `PersonDetailsSheet.tsx` com abas
4. Atualizar `CompanyContactsList.tsx` com botao de copiar link do portal
5. Atualizar `AppSidebar.tsx` com item "Pessoas"
6. Atualizar `App.tsx` com rota
7. Atualizar `Contacts.tsx` para incluir `public_token` na interface

