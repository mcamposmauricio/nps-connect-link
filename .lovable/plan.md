

# Correcao: Login Travado + Contraste do Botao em Dark Mode

## Problema 1: Login nao funciona

**Causa raiz**: O callback `onAuthStateChange` no `AuthContext.tsx` faz `await loadUserData(currentUser)` diretamente. A documentacao do Supabase alerta que chamadas async dentro desse callback podem causar deadlock — o listener bloqueia e impede a navegacao pos-login.

Os logs de rede confirmam que o login retorna 200 com sucesso, mas a aplicacao trava apos a resposta porque o callback esta bloqueado.

**Solucao**: Usar `setTimeout(fn, 0)` para deferir a chamada `loadUserData` fora do callback, evitando o deadlock. A inicializacao (`init`) continua com `await` normal porque nao esta dentro do listener.

## Problema 2: Botao com contraste quebrado no dark mode

**Causa raiz**: A tela de login usa `bg-dark-hero` (fundo escuro fixo) independente do tema. No dark mode, as variaveis `--primary` e `--accent` mudam para valores ligeiramente diferentes, mas o problema real e que o botao `variant="gradient"` nao tem contraste suficiente contra o card glass escuro.

**Solucao**: Forcar cores absolutas no botao de login da pagina Auth, independentes do tema, ja que a tela de login e sempre escura. Usar classes explicitas como `!bg-gradient-to-r !from-[#4338ca] !to-[#10b981] !text-white` no botao.

---

## Mudancas Tecnicas

### Arquivo 1: `src/contexts/AuthContext.tsx`

- Separar o `onAuthStateChange` da logica async
- No callback, apenas atualizar `user` sincronamente
- Deferir `loadUserData` com `setTimeout(() => loadUserData(currentUser), 0)` para evitar deadlock
- Manter o `init` com `await` normal (nao esta dentro do listener)

### Arquivo 2: `src/pages/Auth.tsx`

- Substituir `variant="gradient"` no botao de login por classes CSS fixas que garantem contraste em qualquer tema
- O botao usara: `bg-gradient-to-r from-indigo-600 to-emerald-500 text-white font-semibold hover:opacity-90 shadow-md`
- Isso garante que as cores do botao nao mudem com o tema, ja que a tela de login tem fundo escuro fixo

---

## Arquivos Modificados

| # | Arquivo | Mudanca |
|---|---------|--------|
| 1 | `src/contexts/AuthContext.tsx` | Deferir loadUserData no onAuthStateChange para evitar deadlock |
| 2 | `src/pages/Auth.tsx` | Botao com cores fixas (nao dependentes do tema) para manter contraste |

