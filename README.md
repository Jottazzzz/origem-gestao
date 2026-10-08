# Origem Gestão

Sistema web desenvolvido para apoiar a operação da **Origem Compostagem**, em Cuiabá/MT. Reúne contratos e clientes, programação de coletas, rotas, acompanhamento de leiras, alertas e auditoria.

**Demonstração publicada:** https://origem-gestao.joao-cgb.chatgpt.site

## O que o sistema faz

| Módulo | Recursos | Armazenamento atual |
| --- | --- | --- |
| Contratos e clientes | Cadastro, endereço com busca por CEP, vigência, filtros, arquivamento e histórico de alterações | Cloudflare D1 |
| Rotas e coletas | Agenda, tabela, recorrência, status e seleção do endereço de um cliente cadastrado, com edição manual | Armazenamento local do navegador |
| Pátio e leiras | Medições, limites de temperatura e alertas | Armazenamento local do navegador |
| Auditoria | Consulta das ações registradas pelo sistema | Eventos contratuais no D1; ações operacionais locais no navegador |
| Acesso | Login e perfis Administrativo e Gestor | Cloudflare D1 |

O perfil **Administrativo** tem as permissões mais amplas, incluindo a auditoria e ações restritas em contratos. O projeto é um MVP: os módulos operacionais indicados como locais ainda não compartilham dados entre computadores ou navegadores.

## Tecnologias

- React 19, TypeScript, Vinext/Next App Router, Tailwind CSS e componentes Shadcn;
- APIs do App Router em Cloudflare Workers;
- Cloudflare D1 (SQLite), Drizzle ORM e Zod para os dados persistidos de contratos e acesso;
- API ViaCEP, por meio de uma rota do próprio aplicativo, para auxiliar o cadastro de endereços.

A integração com Google Maps foi descartada e não é necessária para executar o projeto. Os arquivos em `supabase/` e `drizzle-postgres/` representam estudos de uma futura migração para PostgreSQL; **o site publicado não usa Supabase**. Consulte `docs/postgres-migration.md` antes de tentar uma migração.

## Estrutura do repositório

```text
app/page.tsx             Interface dos módulos operacionais
app/api/                 Login, contratos e consulta de CEP
components/contracts/    Cadastro, listagem e detalhes contratuais
db/                     Esquema e acesso ao Cloudflare D1
drizzle/                Migrações do banco D1
lib/                    Regras de negócio e autenticação
tests/                  Verificações automatizadas do projeto
docs/                   Anotações sobre a futura migração PostgreSQL
supabase/               Modelo SQL experimental, não conectado ao site
```

## Executar para desenvolvimento

Requer Node.js 22.13 ou superior. Na pasta do projeto:

```bash
npm ci
npm run dev
```

A interface abre no endereço exibido pelo terminal. As rotas de login e contratos dependem do binding `DB` e das migrações D1 da plataforma Sites/Cloudflare; abrir o frontend localmente sem preparar um D1 local não reproduz os dados do site publicado. Para avaliar o fluxo completo, use a demonstração acima.

Para conferir o código:

```bash
npm run build
node --test tests/*.test.mjs
```

## Limites e cuidados

- Os dados de coletas, rotas, leiras e parte da auditoria são demonstração local; limpar os dados do navegador pode removê-los.
- Para iniciar um banco D1 vazio, configure `ADMIN_BOOTSTRAP_PASSWORD` como segredo do ambiente com uma senha forte de pelo menos 16 caracteres. O primeiro acesso do usuário `admin` cria seu registro; não coloque o valor desse segredo no repositório. Os demais usuários devem ser provisionados pelo responsável pela implantação.
- Não envie credenciais, dados reais de clientes ou arquivos `.env` ao repositório.
- O modelo SQL de Supabase é experimental e não foi conectado nem validado como implantação do site atual.

Projeto extensionista desenvolvido para a Origem Compostagem.
