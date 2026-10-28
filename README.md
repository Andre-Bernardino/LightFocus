# LightFocus

> Uma coisa de cada vez.

Gerenciador de tarefas pensado para pessoas com TDAH. O LightFocus quebra tarefas grandes em passos pequenos e usa IA para sugerir **a próxima tarefa certa** conforme a energia, o humor e o tempo disponível de cada dia. Sem cobrança: cada tarefa concluída vale pontos, só como reconhecimento.

Projeto desenvolvido como Projeto Integrador do SENAC.

## Funcionalidades

- Dashboard com tarefas, estatísticas, alertas e progresso
- Cadastro de tarefas com prioridade, energia exigida, tempo estimado, prazo e recorrência (semanal ou mensal)
- Divisão de uma tarefa em passos pequenos, com ajuda da IA
- Check-in diário de energia, humor e tempo disponível
- Sugestão do que fazer agora, com base no check-in
- Modo foco, painel de recompensa (pontos) e lembretes
- Assistente de IA em chat, com sessão limpa por tarefa e sugestões de continuidade
- Login e cadastro com e-mail e senha
- Tema claro e escuro

## Tecnologias

| Camada | Tecnologia |
| --- | --- |
| Framework | [TanStack Start](https://tanstack.com/start) (React 19 + SSR), TanStack Router e React Query |
| Build | Vite 8 e Nitro |
| Linguagem | TypeScript |
| Estilo | Tailwind CSS 4, componentes Radix UI (estilo shadcn/ui), Lucide Icons |
| Banco e login | [Supabase](https://supabase.com) (PostgreSQL, Auth e RLS) |
| IA | Vercel AI SDK (`ai`, `@ai-sdk/react`, `@ai-sdk/openai`) via Lovable AI Gateway |
| Testes | Vitest |

## Arquitetura

O projeto é **full-stack em um único repositório**. Não existe um backend separado:

```
src/
├── routes/              Páginas (/, /auth, /chat) e a rota de API /api/chat
├── components/          Componentes de interface
├── lib/
│   ├── task-store.tsx           Estado das tarefas e sincronização com o Supabase
│   ├── checkin-store.tsx        Check-ins de energia e humor
│   ├── auth.tsx                 Login, cadastro e sessão
│   ├── ai-logic.ts              Regras de recomendação (com alternativa sem IA)
│   ├── ai.functions.ts          Funções de servidor: recomendar tarefa e dividir em passos
│   ├── ai-gateway.server.ts     Chamada ao gateway de IA (somente servidor)
│   ├── supabase-config.functions.ts  Entrega a configuração pública do Supabase
│   └── supabase-project.ts      URL e chave anon do projeto Supabase usado
└── server.ts            Entrada do servidor
supabase/
├── schema.sql           Tabelas, permissões e RLS
└── auth-upgrade.sql     Ajustes de autenticação
```

- As **tarefas e check-ins** são lidos e gravados direto no Supabase pelo navegador, protegidos por RLS (cada usuário só acessa os próprios dados).
- Só a **parte de IA** passa por funções de servidor.

## Pré-requisitos

- [Node.js](https://nodejs.org) 20.19 ou superior (recomendado 22)
- Gerenciador de pacotes: [Bun](https://bun.sh) (usado no projeto, há um `bun.lock`) ou npm
- Uma conta gratuita no [Supabase](https://supabase.com)

## Instalação

```bash
# 1. Clonar o repositório
git clone <URL-DO-REPOSITORIO>
cd <nome-da-pasta>

# 2. Instalar as dependências
bun install
# ou, com npm:
npm install
```

### Dependências principais

Todas são instaladas pelo comando acima, a partir do `package.json`.

- **Runtime:** `react`, `react-dom`, `@tanstack/react-start`, `@tanstack/react-router`, `@tanstack/react-query`, `@supabase/supabase-js`, `ai`, `@ai-sdk/react`, `@ai-sdk/openai`, `zod`
- **Interface:** `tailwindcss`, `@radix-ui/*`, `lucide-react`, `recharts`, `sonner`, `motion`, `react-hook-form`, `date-fns`, `streamdown`
- **Desenvolvimento:** `vite`, `typescript`, `vitest`, `eslint`, `prettier`, `nitro`, `@lovable.dev/vite-tanstack-config`

## Configuração do banco de dados (Supabase)

1. Crie um projeto em https://supabase.com/dashboard.
2. Abra **SQL Editor** e rode, nesta ordem:
   1. `supabase/schema.sql` (cria `tasks`, `task_steps`, `check_ins`, as permissões e o RLS)
   2. `supabase/auth-upgrade.sql`
3. Em **Project Settings → API**, copie a **Project URL** e a chave **anon** (pública).
4. Informe esses dois valores ao app, de um destes jeitos:
   - **Variáveis de ambiente (recomendado para outro projeto):** copie `.env.example` para `.env` e preencha:

     ```env
     VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
     VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica
     ```

   - **Valores fixos no código:** edite `src/lib/supabase-project.ts`. Os valores desse arquivo têm **prioridade** sobre as variáveis de ambiente. Se o app estiver conectando num projeto Supabase diferente do esperado, confira esse arquivo primeiro.

> A chave **anon** é pública por natureza. A segurança dos dados vem do RLS. Nunca coloque a chave `service_role` no código nem no `.env` do frontend.

### Login sem confirmação de e-mail (ambiente de testes)

Por padrão o Supabase exige confirmação por e-mail e limita o envio de e-mails por hora. Para testar com contas fictícias:

1. Abra **Authentication → Sign In / Providers**.
2. Desligue **Confirm email** e clique em **Save changes**.

A mudança vale só para contas novas. Contas criadas antes continuam sem confirmar. Para confirmá-las, rode no SQL Editor:

```sql
update auth.users set email_confirmed_at = now() where email_confirmed_at is null;
```

## Execução

```bash
# Servidor de desenvolvimento (http://localhost:3000 ou a porta mostrada no terminal)
bun run dev        # ou: npm run dev

# Testes
bun run test       # ou: npm test

# Verificação de código
bun run lint       # ou: npm run lint

# Build de produção
bun run build      # ou: npm run build
```

Depois de criar uma conta (ou entrar com uma conta de teste), crie uma tarefa e recarregue a página. Ela deve continuar na lista.

## Assistente de IA

O chat e a divisão de tarefas em passos usam o **Lovable AI Gateway**, que exige a chave `LOVABLE_API_KEY`. Essa chave é um *secret* gerenciado pelo Lovable e **só existe dentro do Lovable**.

- **Rodando no Lovable:** a IA funciona sem configuração extra.
- **Rodando fora do Lovable** (local, Render etc.): sem a chave, o chat responde "A conversa não está configurada" e as sugestões usam apenas as regras simples de `src/lib/ai-logic.ts`. Para ter IA fora do Lovable é preciso trocar o gateway por uma chave própria (por exemplo, OpenAI) em `src/lib/ai-gateway.server.ts` e `src/routes/api/chat.ts`.

## Publicação

- **Lovable (mais simples):** clique em **Publish → Update**. A IA funciona e não é preciso configurar nada.
- **Outras plataformas (ex.: Render):** o build usa o Nitro, que por padrão gera para Cloudflare. Para rodar em Node, gere o build com a variável `NITRO_PRESET=node-server` e inicie com `node .output/server/index.mjs`. Esse caminho não foi testado neste projeto. Veja a seção do assistente de IA acima.

## Solução de problemas

| Mensagem ou sintoma | Causa provável e o que fazer |
| --- | --- |
| "E-mail ou senha incorretos" com um usuário que existe | O app pode estar apontando para outro projeto Supabase. Confira `src/lib/supabase-project.ts` e as variáveis `VITE_SUPABASE_*`. |
| "A confirmação de e-mail ainda está ligada no Supabase" | Desligue **Confirm email** (veja a seção de login) ou confirme a conta pelo SQL acima. |
| Erro 429 ao criar conta | Limite de e-mails do Supabase. Desligue **Confirm email**. |
| "Não carregou do banco: JWT issued at future" | Diferença de relógio de menos de 1 segundo entre servidores do Supabase. O app já tenta de novo sozinho. Se persistir, recarregue a página. |
| Tela branca | Abra o console do navegador (F12) e veja o erro. Se for no site publicado, publique de novo. |
| Tarefas não aparecem depois de recarregar | Confirme que `supabase/schema.sql` foi aplicado e que o RLS está ativo nas três tabelas. |
| Projeto Supabase "Inactive" | Projetos gratuitos pausam por inatividade. Reative em **Restore project** no painel. |

## Licença

Projeto acadêmico (Projeto Integrador SENAC). Consulte os autores antes de reutilizar.
