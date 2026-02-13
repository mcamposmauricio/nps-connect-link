

# Simplificar Landing Page - Tom "Em Breve" + Inscricao para Atualizacoes

## Objetivo

Transformar a landing page atual (6 secoes) em uma pagina minimalista com tom de "coming soon" / early access, focada em captar inscritos que querem ser os primeiros a receber novidades sobre Chat in-app e NPS.

## O que muda

### Secoes removidas
- **Features** (grid de 4 cards) - removida
- **Como Funciona** (3 passos) - removida
- **Social Proof** (metricas) - removida
- **CTA Final** (botao scroll) - removida

### Secoes que ficam (3 no total)
1. **Navbar** - simplificado (logo + botao Entrar, sem links de ancora)
2. **Hero** - reescrito com tom "em breve", badges de "Coming Soon" para Chat e NPS, formulario simplificado (apenas nome, email, empresa)
3. **Footer** - mantido como esta

### Mudanca de tom

| Antes | Depois |
|-------|--------|
| "Transforme a experiencia do seu cliente" | "Algo novo esta chegando" |
| "Solicitar Demonstracao" | "Quero ser o primeiro a saber" |
| Grid de features completas | Badges "Em breve" com icones de Chat e NPS |
| Formulario com 5 campos | Formulario com 3 campos (nome, email, empresa) |

### Formulario simplificado
- Remove campos **telefone** e **cargo** (opcionais que adicionam atrito)
- Mantém nome, email e empresa (obrigatorios)
- CTA: "Inscrever-se" / "Quero receber atualizacoes"
- Tracking UTM continua funcionando normalmente

## Mudancas tecnicas

### Arquivo 1: `src/pages/LandingPage.tsx`
- Remover secoes Features, How it Works, Social Proof, CTA
- Remover links de ancora do navbar (nao ha mais secoes para navegar)
- Reescrever Hero com tom "em breve"
- Adicionar badges visuais "Em breve" para Chat in-app e NPS
- Simplificar formulario para 3 campos
- Remover imports nao utilizados (Users, Clock, TrendingUp, Route, BarChart3)

### Arquivo 2: `src/locales/pt-BR.ts`
- Atualizar chaves de traducao:
  - `landing.hero.title`: "Algo novo esta chegando"
  - `landing.hero.subtitle`: "Uma plataforma completa de Customer Success com NPS inteligente e chat in-app. Inscreva-se para ser o primeiro a saber."
  - `landing.form.title`: "Seja o primeiro a saber"
  - `landing.form.submit`: "Quero receber atualizacoes"
  - `landing.form.success`: "Inscricao confirmada!"
  - `landing.form.successDesc`: "Voce sera o primeiro a receber novidades."
  - Novas chaves: `landing.comingSoon` ("Em breve"), `landing.hero.badge` ("Early Access")

### Arquivo 3: `src/locales/en.ts`
- Equivalentes em ingles para as chaves acima

### Nenhuma mudanca no banco
- A tabela `leads` continua igual (campos phone e role sao nullable, entao o formulario simplificado envia null para eles)
- RLS e tracking UTM inalterados

## Layout final da LP

```text
+-----------------------------------------------+
| [Zap] Journey CS              [Entrar]        |
+-----------------------------------------------+
|                                                |
|   [Early Access]                               |
|   Algo novo esta chegando                      |
|   Uma plataforma completa de CS...             |
|                                                |
|   [NPS - Em breve] [Chat - Em breve]           |
|                                                |
|   +-----------------------------------+        |
|   | Seja o primeiro a saber           |        |
|   | [Nome]                            |        |
|   | [Email]                           |        |
|   | [Empresa]                         |        |
|   | [Quero receber atualizacoes ->]   |        |
|   +-----------------------------------+        |
|                                                |
+-----------------------------------------------+
| [Zap] Journey CS    (c) 2026 Todos os direitos|
+-----------------------------------------------+
```

## Arquivos modificados

| # | Arquivo | Descricao |
|---|---------|-----------|
| 1 | `src/pages/LandingPage.tsx` | Simplificar para hero + form + footer |
| 2 | `src/locales/pt-BR.ts` | Atualizar textos para tom "em breve" |
| 3 | `src/locales/en.ts` | Equivalentes em ingles |

