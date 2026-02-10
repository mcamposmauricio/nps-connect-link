

# Correcao: Alinhar prefixo de API Key do Chat com o NPS

## Problema

O NPS salva o prefixo com 12 caracteres (`substring(0, 12)`) e busca com 12. O Chat salva com 13 caracteres (`substring(0, 13)`) mas as edge functions buscam com 12. Isso causa o erro 401.

## Solucao

Alinhar o Chat para funcionar exatamente como o NPS: prefixo de 12 caracteres em todo lugar. Tambem corrigir o registro existente no banco.

## Mudancas

| # | Arquivo | O que muda |
|---|---------|------------|
| 1 | `src/components/ChatApiKeysTab.tsx` | Trocar `substring(0, 13)` por `substring(0, 12)` ao salvar o prefixo |
| 2 | Migracao SQL | Corrigir o registro existente: `UPDATE api_keys SET key_prefix = substring(key_prefix, 1, 12) WHERE key_prefix LIKE 'chat_%' AND length(key_prefix) > 12` |

As edge functions `resolve-chat-visitor` e `get-visitor-banners` ja usam `substring(0, 12)`, entao nao precisam de alteracao -- ficam iguais ao `check-nps-pending`.

## Resultado

Tanto NPS quanto Chat usarao a mesma logica: prefixo de 12 caracteres no banco e nas edge functions.

