

# Landing Page + Recuperacao de Senha + Captacao de Leads

## Visao Geral

Construir uma landing page publica profissional com captacao de leads (incluindo tracking UTM completo), e adicionar fluxo completo de recuperacao de senha na area de autenticacao.

---

## Rotas

| Rota | Pagina | Publica? |
|------|--------|----------|
| `/` | LandingPage | Sim |
| `/auth` | Auth (atualizado) | Sim |
| `/auth/forgot-password` | ForgotPassword | Sim |
| `/auth/reset-password` | ResetPassword | Sim |
| `/cs-dashboard` | CSDashboard (sem mudanca) | Nao |

A rota `/` deixa de redirecionar para `/cs-dashboard` e passa a renderizar a Landing Page publica. Usuarios logados verao um botao "Ir para o painel" no navbar da LP.

---

## 1. Landing Page (`src/pages/LandingPage.tsx`)

Pagina publica completa com as seguintes secoes:

### Navbar
- Logo Journey CS (Zap icon + texto)
- Links de ancora: Funcionalidades, Como Funciona, Contato
- Botao "Entrar" (navega para `/auth`)
- Se usuario logado (detectar sessao): botao "Ir para o Painel" em vez de "Entrar"

### Hero Section
- Titulo principal: "Transforme a experiencia do seu cliente"
- Subtitulo com proposta de valor
- Formulario de captacao de lead (lado direito ou abaixo no mobile)
- Campos: Nome, Email corporativo, Empresa, Telefone (opcional), Cargo (opcional)

### Features (grid 3 colunas)
- NPS Inteligente - Pesquisas automatizadas com segmentacao
- Customer Success - Trilhas de jornada e health score
- Chat ao Vivo - Atendimento em tempo real com widget integravel
- Trilhas de Jornada - Onboarding e acompanhamento estruturado

### Como Funciona (3 passos)
1. Configure sua conta e importe seus clientes
2. Crie campanhas NPS e trilhas de jornada
3. Acompanhe metricas e tome acoes proativas

### Social Proof / Metricas
- Numeros estaticos ilustrativos ("+500 empresas", "98% uptime", "+50k pesquisas enviadas")

### CTA Final
- Repetir formulario de captacao ou botao que faz scroll ate o hero

### Footer
- Logo, links uteis, copyright

---

## 2. Captacao de Leads Completa

### Tabela `leads` (migration SQL)

```sql
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  company text NOT NULL,
  phone text,
  role text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  referrer text,
  landing_page text,
  ip_hint text,
  user_agent text,
  status text DEFAULT 'new',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Publico pode inserir (formulario aberto)
CREATE POLICY "Public can insert leads"
  ON public.leads FOR INSERT
  WITH CHECK (true);

-- Admins podem ver, atualizar e deletar
CREATE POLICY "Admins can view leads"
  ON public.leads FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update leads"
  ON public.leads FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete leads"
  ON public.leads FOR DELETE
  USING (has_role(auth.uid(), 'admin'));
```

### Tracking automatico

Ao carregar a landing page, capturar da URL:
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`
- `document.referrer` como `referrer`
- `window.location.pathname` como `landing_page`
- `navigator.userAgent` como `user_agent`

Esses valores serao armazenados em estado e enviados junto com o formulario ao inserir na tabela `leads`.

### Validacao com Zod

```typescript
const leadSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(100),
  email: z.string().trim().email("Email invalido").max(255),
  company: z.string().trim().min(2, "Nome da empresa muito curto").max(100),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  role: z.string().trim().max(100).optional().or(z.literal("")),
});
```

### Feedback pos-envio
- Toast de sucesso: "Obrigado pelo interesse! Entraremos em contato em breve."
- Limpar formulario apos envio
- Prevenir dupla submissao (state loading)

---

## 3. Recuperacao de Senha

### 3.1. Link no Login (`Auth.tsx`)

Adicionar abaixo do botao "Entrar":
```
Esqueceu sua senha?  ->  navega para /auth/forgot-password
```
Tambem adicionar link "Conheca o Journey CS" que navega para `/` (a LP).

### 3.2. Forgot Password (`src/pages/ForgotPassword.tsx`)

- Mesmo layout visual do Auth (gradient + card centralizado + logo)
- Campo de email
- Botao "Enviar link de recuperacao"
- Ao submeter: `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/auth/reset-password' })`
- Apos envio com sucesso: exibir estado de confirmacao com icone de email e texto "Verifique sua caixa de entrada"
- Link "Voltar ao login"
- Validacao do email com zod antes de enviar

### 3.3. Reset Password (`src/pages/ResetPassword.tsx`)

- Mesmo layout visual
- Ao montar: escutar `onAuthStateChange` para detectar evento `PASSWORD_RECOVERY` (o Supabase seta a sessao via hash fragment automaticamente)
- Dois campos: "Nova senha" e "Confirmar senha"
- Validacao: minimo 6 caracteres, senhas devem coincidir
- Ao submeter: `supabase.auth.updateUser({ password: newPassword })`
- Apos sucesso: toast + redirecionar para `/auth`
- Se nao houver sessao valida (link expirado/invalido): exibir mensagem de erro com botao para solicitar novo link

---

## 4. Internacionalizacao

### Novas chaves pt-BR

```
auth.forgotPassword: "Esqueceu sua senha?"
auth.forgotPasswordTitle: "Recuperar Senha"
auth.forgotPasswordDesc: "Informe seu email e enviaremos um link para redefinir sua senha"
auth.sendResetLink: "Enviar Link de Recuperacao"
auth.resetLinkSent: "Link enviado!"
auth.resetLinkSentDesc: "Verifique sua caixa de entrada. O link expira em 1 hora."
auth.backToLogin: "Voltar ao login" (ja existe)
auth.newPassword: "Nova Senha"
auth.confirmPassword: "Confirmar Senha"
auth.resetPassword: "Redefinir Senha"
auth.resetSuccess: "Senha redefinida com sucesso!"
auth.resetSuccessDesc: "Voce ja pode fazer login com a nova senha."
auth.passwordMismatch: "As senhas nao coincidem"
auth.passwordTooShort: "A senha deve ter no minimo 6 caracteres"
auth.invalidResetLink: "Link invalido ou expirado"
auth.invalidResetLinkDesc: "Solicite um novo link de recuperacao de senha."
auth.requestNewLink: "Solicitar novo link"
auth.discoverJourney: "Conheca o Journey CS"

landing.nav.features: "Funcionalidades"
landing.nav.howItWorks: "Como Funciona"
landing.nav.contact: "Contato"
landing.nav.login: "Entrar"
landing.nav.goToDashboard: "Ir para o Painel"
landing.hero.title: "Transforme a experiencia do seu cliente"
landing.hero.subtitle: "Plataforma completa de Customer Success com NPS, trilhas de jornada e chat ao vivo"
landing.features.nps.title: "NPS Inteligente"
landing.features.nps.desc: "Pesquisas automatizadas com segmentacao e acompanhamento de detratores"
landing.features.cs.title: "Customer Success"
landing.features.cs.desc: "Health score, trilhas de jornada e visao kanban do ciclo de vida"
landing.features.chat.title: "Chat ao Vivo"
landing.features.chat.desc: "Widget integravel com atendimento em tempo real e CSAT automatico"
landing.features.trails.title: "Trilhas de Jornada"
landing.features.trails.desc: "Onboarding e acompanhamento estruturado com atividades e prazos"
landing.howItWorks.title: "Como Funciona"
landing.howItWorks.step1.title: "Configure"
landing.howItWorks.step1.desc: "Crie sua conta e importe seus clientes"
landing.howItWorks.step2.title: "Engaje"
landing.howItWorks.step2.desc: "Crie campanhas NPS e trilhas de jornada"
landing.howItWorks.step3.title: "Acompanhe"
landing.howItWorks.step3.desc: "Monitore metricas e tome acoes proativas"
landing.social.companies: "+500 Empresas"
landing.social.uptime: "99.9% Uptime"
landing.social.surveys: "+50k Pesquisas"
landing.cta.title: "Pronto para comecar?"
landing.cta.subtitle: "Solicite uma demonstracao e veja como o Journey CS pode transformar seu atendimento"
landing.form.title: "Solicitar Demonstracao"
landing.form.name: "Nome completo"
landing.form.email: "Email corporativo"
landing.form.company: "Empresa"
landing.form.phone: "Telefone (opcional)"
landing.form.role: "Cargo (opcional)"
landing.form.submit: "Solicitar Demonstracao"
landing.form.submitting: "Enviando..."
landing.form.success: "Obrigado pelo interesse!"
landing.form.successDesc: "Entraremos em contato em breve."
landing.footer.rights: "Todos os direitos reservados."
```

### Novas chaves en (equivalentes em ingles)

Mesma estrutura com traducoes em ingles.

---

## Detalhes Tecnicos

### Arquivos a serem criados

| # | Arquivo | Descricao |
|---|---------|-----------|
| 1 | `src/pages/LandingPage.tsx` | LP completa com hero, features, form, footer |
| 2 | `src/pages/ForgotPassword.tsx` | Formulario de recuperacao de senha |
| 3 | `src/pages/ResetPassword.tsx` | Formulario de nova senha |
| 4 | Migration SQL | Tabela `leads` com RLS |

### Arquivos a serem modificados

| # | Arquivo | Descricao |
|---|---------|-----------|
| 1 | `src/App.tsx` | Rota `/` para LandingPage, novas rotas de auth |
| 2 | `src/pages/Auth.tsx` | Link "Esqueceu sua senha?" + link para LP |
| 3 | `src/locales/pt-BR.ts` | ~50 novas chaves de traducao |
| 4 | `src/locales/en.ts` | ~50 novas chaves de traducao |

### Fluxo de recuperacao de senha

```text
Auth.tsx                    ForgotPassword.tsx              Email                    ResetPassword.tsx
  |                              |                            |                          |
  |-- "Esqueceu sua senha?" -->  |                            |                          |
  |                              |-- resetPasswordForEmail --> |                          |
  |                              |                            |-- link com token -------> |
  |                              |                            |                          |-- updateUser({password})
  |                              |                            |                          |-- redirect /auth
```

### Design da LP

- Usa cores do design system (primary, accent)
- Componentes existentes (Button, Input, Card)
- Responsiva mobile-first
- Sem dependencias novas
- Animacoes CSS sutis (opacity + translateY via Tailwind)
- Fundo gradient no hero similar ao Auth
- Secoes alternando fundo branco e cinza claro

### Seguranca do formulario de leads

- Validacao client-side com zod
- RLS impede leitura publica (apenas admins)
- Campos com limites de tamanho
- Prevencao de dupla submissao via state
- Sem dados sensíveis expostos no console

