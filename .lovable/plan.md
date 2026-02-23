

# Correcao: Isolamento de Dados por Tenant (Vazamento Cross-Tenant)

## Problema

O usuario `chuck@marqponto.com.br` ve dados de TODOS os tenants porque existem **11 politicas RLS com `USING (true)`** aplicadas ao role `public` (que inclui tanto `anon` quanto `authenticated`). Como politicas PERMISSIVE sao combinadas com OR, qualquer usuario autenticado consegue ler todos os registros, ignorando o filtro por tenant.

Tabelas afetadas:
- `contacts` - todos os contatos de todos os tenants
- `campaigns` - todas as campanhas
- `campaign_contacts` - todos os vinculos campanha-contato
- `company_contacts` - todos os contatos de empresas
- `brand_settings` - todas as configs de marca
- `chat_rooms` - todas as salas de chat (SELECT + UPDATE)
- `chat_messages` - todas as mensagens
- `chat_visitors` - todos os visitantes
- `chat_settings` - todas as configs de chat

## Causa Raiz

Essas politicas foram criadas para permitir acesso publico (sem login) em fluxos como:
- Formulario NPS (usuario responde via link sem estar logado)
- Widget de chat (visitante interage sem autenticacao)

Porem, ao usar o role `public`, elas se aplicam TAMBEM a usuarios autenticados, anulando o isolamento por tenant.

## Solucao

Restringir essas politicas ao role **`anon`** (usuarios nao autenticados), removendo o acesso para `authenticated`. Assim:
- Visitantes e formularios NPS continuam funcionando (usam `anon`)
- Usuarios logados so veem dados do seu tenant (politicas com `tenant_id = get_user_tenant_id(auth.uid())`)

## Alteracoes

### Migracao SQL unica

Para cada politica afetada:
1. Remover (DROP) a politica existente com role `public`
2. Recriar a mesma politica restrita ao role `anon`

Tabelas e politicas a corrigir:

| Tabela | Politica | Tipo |
|--------|----------|------|
| contacts | Public can view contacts for NPS responses | SELECT |
| campaigns | Public can view campaigns for NPS responses | SELECT |
| campaign_contacts | Public can view campaign contacts for NPS responses | SELECT |
| company_contacts | Public can view company contacts for NPS | SELECT |
| brand_settings | Public can view brand settings for NPS responses | SELECT |
| chat_rooms | Public can view rooms | SELECT |
| chat_rooms | Public can update rooms | UPDATE |
| chat_messages | Public can view non-internal messages | SELECT |
| chat_visitors | Public can view own visitor by token | SELECT |
| chat_settings | Public can read chat widget config | SELECT |
| chat_banner_assignments | Public can update assignment votes | UPDATE |

### SQL da migracao

```sql
-- contacts
DROP POLICY "Public can view contacts for NPS responses" ON contacts;
CREATE POLICY "Anon can view contacts for NPS responses"
  ON contacts FOR SELECT TO anon USING (true);

-- campaigns
DROP POLICY "Public can view campaigns for NPS responses" ON campaigns;
CREATE POLICY "Anon can view campaigns for NPS responses"
  ON campaigns FOR SELECT TO anon USING (true);

-- campaign_contacts
DROP POLICY "Public can view campaign contacts for NPS responses" ON campaign_contacts;
CREATE POLICY "Anon can view campaign contacts for NPS responses"
  ON campaign_contacts FOR SELECT TO anon USING (true);

-- company_contacts
DROP POLICY "Public can view company contacts for NPS" ON company_contacts;
CREATE POLICY "Anon can view company contacts for NPS"
  ON company_contacts FOR SELECT TO anon USING (true);

-- brand_settings
DROP POLICY "Public can view brand settings for NPS responses" ON brand_settings;
CREATE POLICY "Anon can view brand settings for NPS responses"
  ON brand_settings FOR SELECT TO anon USING (true);

-- chat_rooms (SELECT)
DROP POLICY "Public can view rooms" ON chat_rooms;
CREATE POLICY "Anon can view rooms"
  ON chat_rooms FOR SELECT TO anon USING (true);

-- chat_rooms (UPDATE)
DROP POLICY "Public can update rooms" ON chat_rooms;
CREATE POLICY "Anon can update rooms"
  ON chat_rooms FOR UPDATE TO anon USING (true);

-- chat_messages
DROP POLICY "Public can view non-internal messages" ON chat_messages;
CREATE POLICY "Anon can view non-internal messages"
  ON chat_messages FOR SELECT TO anon USING (true);

-- chat_visitors
DROP POLICY "Public can view own visitor by token" ON chat_visitors;
CREATE POLICY "Anon can view own visitor by token"
  ON chat_visitors FOR SELECT TO anon USING (true);

-- chat_settings
DROP POLICY "Public can read chat widget config" ON chat_settings;
CREATE POLICY "Anon can read chat widget config"
  ON chat_settings FOR SELECT TO anon USING (true);

-- chat_banner_assignments
DROP POLICY "Public can update assignment votes" ON chat_banner_assignments;
CREATE POLICY "Anon can update assignment votes"
  ON chat_banner_assignments FOR UPDATE TO anon USING (true) WITH CHECK (true);
```

### Nenhuma alteracao de codigo necessaria

Os fluxos publicos (NPS, chat widget) usam o client Supabase sem autenticacao (role `anon`), entao continuarao funcionando normalmente. Os fluxos autenticados ja possuem politicas de tenant que passarao a ser as unicas validas para usuarios logados.

## Resultado Esperado

- `chuck@marqponto.com.br` (tenant MARQ) vera APENAS dados do tenant MARQ
- Dashboards, graficos, historicos mostrarao somente informacoes da sua plataforma
- Formularios NPS e widget de chat continuarao funcionando para visitantes anonimos
- Nenhuma alteracao visual ou de comportamento para usuarios existentes de outros tenants
