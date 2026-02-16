

# Reestruturar Landing Page - Simplificar Layout

## Objetivo

Reorganizar a landing page para ter apenas duas secoes principais:
1. **Os 3 cards de features** (Chat in-app, NPS, Dashboard CS) como primeiro bloco
2. **O hero com formulario** logo abaixo, centralizado (sem o mockup do lado direito)
3. **Remover** a secao de diferenciais, o DashboardMockup lateral e o footer

## Mudancas

### Arquivo: `src/pages/LandingPage.tsx`

- Mover `<LandingFeatures />` para cima, logo apos a navbar (antes do hero)
- Simplificar o hero: remover o grid de 2 colunas e o `<DashboardMockup />` do lado direito
- Centralizar o conteudo do hero (badge + titulo + subtitulo + formulario) em uma unica coluna
- Remover `<LandingDifferentials />`
- Remover o footer
- Remover import do `DashboardMockup` e `LandingDifferentials`

### Estrutura resultante

```text
+-------------------------------------------+
|  Navbar (logo + botao login)              |
+-------------------------------------------+
|  Features: 3 cards com mockups            |
|  [Chat in-app]  [NPS]  [Dashboard CS]    |
+-------------------------------------------+
|  Hero centralizado:                       |
|  Badge "Early Access"                     |
|  Titulo + Subtitulo                       |
|  Formulario de lead                       |
+-------------------------------------------+
```

### Detalhes tecnicos

- Remover imports de `DashboardMockup` e `LandingDifferentials`
- Manter `LandingBackgroundMockups` no fundo (mockups esmaecidos)
- Manter `LandingFeatures` sem alteracoes (ja esta como na foto)
- O hero perde o `grid lg:grid-cols-2` e vira uma coluna centralizada com `max-w-2xl mx-auto text-center`
- O formulario mantem o mesmo estilo glassmorphism mas fica centralizado
- Manter toda logica de formulario, validacao e tracking inalterada

