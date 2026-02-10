

# Redimensionamento Dinamico do Widget NPS

## Problema

O iframe do NPS widget (`nps-widget.js`) e criado com tamanho fixo de 400x450px imediatamente, mesmo durante o loading e quando nao ha pesquisa pendente. Isso bloqueia cliques na pagina hospedeira desnecessariamente.

## Solucao

Iniciar o iframe invisivel/minimo e so expandir quando o `NPSEmbed` confirmar que ha pesquisa pendente (`nps-ready`). Esconder quando o usuario dispensar (`nps-dismiss`) ou concluir (`nps-complete`), ou quando nao houver pesquisa (`nps-no-survey`).

### Mudancas

**1. `public/nps-widget.js`**

| Mudanca | Detalhe |
|---------|---------|
| Iframe inicia com tamanho 0x0 | `width:0;height:0;overflow:hidden` - invisivel e sem bloqueio |
| Escutar `nps-ready` | Expandir para 400x450px com transicao suave |
| Escutar `nps-no-survey` | Manter 0x0 (ou destruir o widget) |
| Escutar `nps-dismiss` e `nps-complete` | Ja existem e chamam `destroy()` - OK, nenhuma mudanca necessaria |

No `setupMessageListener`, adicionar tratamento para `nps-ready` e `nps-no-survey`:

```javascript
if (data.type === 'nps-ready') {
  // Expandir iframe para tamanho real
  this.iframe.style.width = '400px';
  this.iframe.style.height = '450px';
} else if (data.type === 'nps-no-survey') {
  // Sem pesquisa: destruir widget
  this.destroy();
}
```

**2. `src/pages/NPSEmbed.tsx`**

| Mudanca | Detalhe |
|---------|---------|
| Enviar `nps-no-survey` quando nao ha pendencia | Ja faz isso - OK |
| Enviar `nps-no-survey` em caso de erro | Ja faz isso - OK |
| Nenhuma mudanca necessaria | Os postMessages ja cobrem todos os cenarios |

O `NPSEmbed.tsx` nao precisa de alteracoes - ele ja envia os eventos corretos.

## Arquivos Modificados

| # | Arquivo | Descricao |
|---|---------|-----------|
| 1 | `public/nps-widget.js` | Iniciar iframe com 0x0, expandir ao receber `nps-ready`, destruir ao receber `nps-no-survey` |

