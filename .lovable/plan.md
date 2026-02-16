

# Adicionar botao "Seja o primeiro a saber" na navbar

## Mudanca

Adicionar um botao "Seja o primeiro a saber" ao lado do botao "Entrar" na navbar que, ao ser clicado, faz scroll suave ate o formulario de lead.

## Detalhes tecnicos

### Arquivo: `src/pages/LandingPage.tsx`

1. Adicionar um `id="lead-form"` na `div` do formulario (linha 125) para servir de ancora
2. Na navbar (linhas 104-110), envolver os botoes em um `div` com `flex gap-2` e adicionar um novo `Button` com variant `gradient` que executa `document.getElementById('lead-form')?.scrollIntoView({ behavior: 'smooth' })` ao clicar
3. O botao "Entrar" continua como esta, ao lado

### Resultado visual

```text
[Logo Journey CS]          [Seja o primeiro a saber] [Entrar]
```

### Traducoes

Adicionar chave `landing.nav.earlyAccess` nos arquivos `pt-BR.ts` ("Seja o primeiro a saber") e `en.ts` ("Be the first to know").
