
# Plano: Separar Banner do Chat -- Banner no Topo da Pagina do Cliente

## Problema Atual

Os banners estao renderizados **dentro** do widget de chat (dentro do Card). O usuario quer que o banner apareca no **topo da pagina do cliente**, como uma barra fixa de notificacao -- a primeira coisa visivel de cima para baixo -- completamente independente do chat widget.

## Solucao

O iframe embed atual mistura chat + banners em um unico elemento posicionado no canto inferior. A nova arquitetura separa em **dois elementos independentes**:

1. **Banner**: barra fixa no `top: 0` da pagina, largura total (`width: 100%`)
2. **Chat Widget**: FAB + painel flutuante no canto inferior (como ja esta)

Como o embed roda em iframe, o banner precisa de seu proprio iframe separado ou ser injetado diretamente na pagina do cliente via script. A abordagem mais eficaz e usar um **script de embed unico** que injeta:
- Um `div` fixo no topo da pagina para os banners (injetado diretamente no DOM da pagina)
- Um `iframe` no canto inferior para o chat widget

### Arquitetura do Embed (novo)

O script de integracao muda de um simples iframe para um script JS que:
1. Busca os banners via API (usando `visitor_token` do localStorage)
2. Injeta os banners como um `div` fixo no topo da pagina do cliente (sem iframe, acesso direto ao DOM)
3. Cria o iframe do chat widget no canto inferior (como ja funciona)

Isso resolve o problema: os banners ficam no topo da pagina real do cliente, nao dentro do chat.

## Mudancas

### 1. Criar script de embed publico (`public/nps-chat-embed.js`)

Script JS que o cliente coloca no site. Ele:
- Recebe `tenantId` como parametro
- Le `visitor_token` do localStorage (se existir)
- Faz fetch para uma edge function que retorna os banners ativos para o visitor
- Injeta um `div` fixo no `top:0` da pagina com os banners (cor, texto, link, votacao)
- Injeta o iframe do chat widget no canto inferior
- Gerencia dismiss, votacao e view tracking dos banners

### 2. Criar edge function `get-visitor-banners`

Edge function publica que:
- Recebe `visitor_token` como parametro
- Busca o `contact_id` do visitor
- Retorna os banners ativos atribuidos a esse contato
- Registra a visualizacao (incrementa `views_count`)

### 3. Criar edge function `vote-banner`

Edge function publica que:
- Recebe `assignment_id` e `vote` ("up" ou "down")
- Atualiza o voto na tabela `chat_banner_assignments`

### 4. Remover banners do ChatWidget.tsx

- Remover todo o codigo de banners do componente (estados, fetch, render)
- O widget volta a ser apenas chat, sem banners

### 5. Atualizar BannerPreview.tsx

- O preview deve simular o banner como uma barra no topo de uma pagina mockada (nao dentro do chat)
- Mostra uma pagina simulada com o banner no topo e conteudo abaixo

### 6. Atualizar ChatApiKeysTab.tsx

- Atualizar o codigo de integracao para usar o novo script embed ao inves de um iframe simples

### 7. Atualizar AdminSettings.tsx (tab Widget)

- O codigo de embed gerado deve usar o novo script

## Arquivos

| # | Arquivo | Mudanca |
|---|---------|---------|
| 1 | `public/nps-chat-embed.js` | **Novo** - Script de embed que injeta banners no topo + iframe do chat |
| 2 | `supabase/functions/get-visitor-banners/index.ts` | **Novo** - Edge function para buscar banners do visitor |
| 3 | `supabase/functions/vote-banner/index.ts` | **Novo** - Edge function para registrar voto |
| 4 | `src/pages/ChatWidget.tsx` | Remover toda logica de banners (estados, fetch, render) |
| 5 | `src/components/chat/BannerPreview.tsx` | Redesenhar preview como barra no topo de pagina mockada |
| 6 | `src/components/ChatApiKeysTab.tsx` | Atualizar codigo de integracao para novo script |
| 7 | `src/pages/AdminSettings.tsx` | Atualizar embed code na tab Widget |

## Secao Tecnica

### Script de Embed (`public/nps-chat-embed.js`)

```text
Uso pelo cliente:
<script src="https://app.url/nps-chat-embed.js" 
  data-tenant-id="xxx" 
  data-position="right" 
  data-primary-color="#7C3AED"
  data-company-name="Suporte">
</script>
```

O script:
1. Le os atributos `data-*` do proprio elemento `<script>`
2. Verifica `localStorage` por `chat_visitor_token`
3. Se existe token, chama a edge function `get-visitor-banners`
4. Para cada banner ativo, cria um `div` fixo no topo (`position:fixed; top:0; left:0; width:100%; z-index:99999`)
5. Os banners empilham verticalmente no topo
6. Cria o iframe do widget de chat no canto inferior (reutiliza a rota `/widget` existente)

### Edge Function `get-visitor-banners`

```text
GET /get-visitor-banners?visitor_token=xxx

Response:
{
  banners: [
    { assignment_id, content, bg_color, text_color, link_url, link_label, has_voting, vote }
  ]
}
```

### Edge Function `vote-banner`

```text
POST /vote-banner
Body: { assignment_id, vote: "up" | "down" }
```

### BannerPreview Redesenhado

O preview mostrara:
```text
+--------------------------------------------------+
| [Banner: texto + link + votacao] [X]              |  <-- topo, full-width
+--------------------------------------------------+
| Barra de navegacao mockada                        |
+--------------------------------------------------+
| Conteudo da pagina mockada                        |
|                                                   |
|   [blocos de conteudo cinza]                      |
|                                                   |
|                              [FAB chat widget]    |
+--------------------------------------------------+
```

Isso mostra claramente que o banner fica no topo da pagina do cliente, separado do chat.
