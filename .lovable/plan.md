
# Adicionar pagina "Meu Perfil"

## Objetivo

Criar uma pagina dedicada onde o usuario logado pode visualizar e editar seus dados de perfil, incluindo o nome exibido no atendimento ao cliente, telefone, departamento, especialidades e foto de avatar.

## Mudancas

### 1. Nova pagina `src/pages/MyProfile.tsx`

Pagina com formulario para editar os dados do proprio usuario a partir da tabela `user_profiles`:

**Campos editaveis:**
- **Nome de exibicao** (display_name) -- o nome que aparece no chat para o cliente
- **Email** (somente leitura, vem do auth)
- **Telefone** (phone)
- **Departamento** (department)
- **Especialidades** (specialty) -- checkboxes: implementacao, onboarding, acompanhamento, churn
- **Avatar** (avatar_url) -- upload de imagem para o bucket `logos` existente

**Layout:**
- Card com avatar grande no topo (clicavel para trocar foto)
- Formulario abaixo com os campos
- Botao "Salvar" que faz `update` na tabela `user_profiles` onde `user_id = auth.uid()`
- Toast de confirmacao ao salvar

A RLS ja permite que o usuario atualize seu proprio perfil (`Users can update own profile`).

### 2. Nova rota em `src/App.tsx`

Adicionar rota `/profile` apontando para `MyProfile`.

### 3. Link no sidebar footer `src/components/AppSidebar.tsx`

Adicionar um botao "Meu Perfil" no footer do sidebar (acima do seletor de idioma e botao de logout), com icone `User`. Visivel para todos os usuarios autenticados (nao depende de permissao).

### 4. Traducoes `src/locales/pt-BR.ts` e `src/locales/en.ts`

Novas chaves:
- `profile.title` -- "Meu Perfil" / "My Profile"
- `profile.subtitle` -- "Gerencie suas informacoes pessoais" / "Manage your personal information"
- `profile.displayName` -- "Nome de exibicao" / "Display name"
- `profile.displayNameHint` -- "Este nome aparece para clientes no chat" / "This name is shown to customers in chat"
- `profile.phone` -- "Telefone" / "Phone"
- `profile.department` -- "Departamento" / "Department"
- `profile.specialties` -- "Especialidades" / "Specialties"
- `profile.avatar` -- "Foto de perfil" / "Profile photo"
- `profile.changePhoto` -- "Alterar foto" / "Change photo"
- `profile.saved` -- "Perfil atualizado" / "Profile updated"

## Arquivos

| # | Arquivo | Tipo | Descricao |
|---|---------|------|-----------|
| 1 | `src/pages/MyProfile.tsx` | Novo | Pagina de edicao de perfil |
| 2 | `src/App.tsx` | Modificado | Adicionar rota `/profile` |
| 3 | `src/components/AppSidebar.tsx` | Modificado | Link "Meu Perfil" no footer |
| 4 | `src/locales/pt-BR.ts` | Modificado | Chaves de traducao |
| 5 | `src/locales/en.ts` | Modificado | Chaves de traducao |

## Sem mudancas no banco de dados

A tabela `user_profiles` ja possui todos os campos necessarios (display_name, phone, department, specialty, avatar_url) e a RLS ja permite que o usuario edite seu proprio registro. O bucket `logos` ja e publico e pode ser usado para avatares.
