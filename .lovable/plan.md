

# Corrigir RLS do Help Center para Acesso Publico

## Problema Encontrado

As politicas RLS das tabelas do Help Center (`help_articles`, `help_article_versions`, `help_collections`) estao configuradas como **RESTRICTIVE** em vez de **PERMISSIVE**. No PostgreSQL:

- Politicas **PERMISSIVE**: basta UMA passar (logica OR)
- Politicas **RESTRICTIVE**: TODAS devem passar (logica AND), e ainda requerem pelo menos uma permissiva

Como todas sao restritivas e nenhuma permissiva existe, usuarios anonimos nao conseguem visualizar artigos publicados, resultando em "Artigo nao encontrado" na pagina publica.

## Solucao

Recriar as politicas de acesso publico como **PERMISSIVE** nas tres tabelas afetadas. As politicas de gerenciamento por tenant tambem precisam ser permissivas.

## Mudancas (Migration SQL)

Uma migration que:

1. **`help_articles`**: Drop e recriar ambas as politicas como PERMISSIVE
2. **`help_article_versions`**: Drop e recriar ambas as politicas como PERMISSIVE  
3. **`help_collections`**: Drop e recriar ambas as politicas como PERMISSIVE
4. **`help_article_events`**: Drop e recriar ambas as politicas como PERMISSIVE

```text
Tabela               | Politica                          | Antes       | Depois
help_articles        | Public can view published          | RESTRICTIVE | PERMISSIVE
help_articles        | Tenant members can manage          | RESTRICTIVE | PERMISSIVE
help_article_versions| Public can view published versions | RESTRICTIVE | PERMISSIVE
help_article_versions| Tenant members can manage          | RESTRICTIVE | PERMISSIVE
help_collections     | Public can view active             | RESTRICTIVE | PERMISSIVE
help_collections     | Tenant members can manage          | RESTRICTIVE | PERMISSIVE
help_article_events  | Public can insert                  | RESTRICTIVE | PERMISSIVE
help_article_events  | Tenant members can view            | RESTRICTIVE | PERMISSIVE
```

## Impacto

- A pagina publica voltara a funcionar para artigos publicados
- Nenhuma mudanca de codigo necessaria - apenas SQL
- A seguranca multi-tenant permanece intacta (cada politica filtra por tenant_id ou status)
