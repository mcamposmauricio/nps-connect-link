

# Corrigir Upload de Foto de Perfil (RLS Storage)

## Problema

A politica RLS de upload no bucket `logos` exige que o primeiro segmento do caminho do arquivo seja o UUID do usuario autenticado:

```
WITH CHECK: bucket_id = 'logos' AND auth.uid()::text = storage.foldername(name)[1]
```

Porem, o codigo em `MyProfile.tsx` faz upload para o caminho `avatars/{user_id}.{ext}`, onde o primeiro segmento e "avatars" (nao o UUID do usuario). Isso causa o erro 403.

Alem disso, mesmo corrigindo o caminho, um administrador nao conseguiria alterar a foto de outro usuario, pois a politica so permite upload na "pasta" do proprio usuario.

## Solucao

### 1. Alterar o caminho de upload em `MyProfile.tsx`

Mudar de:
```
avatars/${user.id}.${ext}
```

Para:
```
${user.id}/avatar.${ext}
```

Isso faz o primeiro segmento do caminho ser o UUID do usuario, satisfazendo a politica existente.

### 2. Adicionar politica de admin para upload no storage

Criar uma nova politica que permite administradores fazerem upload em qualquer pasta do bucket `logos`:

```sql
CREATE POLICY "Admins can upload any logo"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'logos'
  AND public.has_role(auth.uid(), 'admin')
);
```

E para UPDATE (upsert precisa de ambas):

```sql
CREATE POLICY "Admins can update any logo"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'logos'
  AND public.has_role(auth.uid(), 'admin')
);
```

## Arquivos modificados

| # | Arquivo | Descricao |
|---|---------|-----------|
| 1 | Migracao SQL | Adicionar politicas de admin para upload/update no bucket logos |
| 2 | `src/pages/MyProfile.tsx` | Alterar caminho do upload de `avatars/{id}.ext` para `{id}/avatar.ext` |

## Resultado esperado

- Usuario logado consegue alterar sua propria foto de perfil
- Administrador consegue alterar a foto de qualquer usuario (se essa funcionalidade for implementada futuramente)
