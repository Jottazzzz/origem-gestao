# Origem Gestão

Sistema operacional para a Origem Compostagem: contratos, coletas, rotas, leiras, alertas e indicadores de impacto.

## Arquitetura atual

- **Frontend:** React 19 + Vinext/Next App Router + TypeScript + Tailwind + componentes Shadcn.
- **Backend:** rotas HTTP no App Router, executadas em Cloudflare Workers.
- **Persistência de contratos:** Cloudflare D1 com Drizzle ORM e migrações versionadas.
- **Validação:** Zod no servidor e React Hook Form + Zod no cliente.
- **Mapas:** Google Maps JavaScript API + Places API (New), carregados somente quando a chave estiver configurada.
- **Outros módulos:** leiras, coletas, rotas e auditoria geral permanecem em modo demonstrativo local neste estágio do MVP.

## Fluxo funcional de contratos

1. Cadastro do cliente e endereço estruturado.
2. Validação de CPF/CNPJ, CEP, telefone, e-mail e campos obrigatórios.
3. Definição do objeto, vigência, valor, pagamento, frequência e bombonas.
4. Revisão antes do envio.
5. Persistência no D1 via API.
6. Busca, filtros, detalhes, edição, status, arquivamento e exportação CSV.
7. Histórico imutável dos eventos contratuais.

O status de alerta é calculado automaticamente pela vigência: ativo, vencendo em até 30 dias ou vencido. Encerramento, reativação e arquivamento exigem justificativa.

## Google Maps

Defina `GOOGLE_MAPS_API_KEY` no ambiente de hospedagem. Habilite no Google Cloud:

- Maps JavaScript API;
- Places API (New).

Restrinja a chave por referenciador HTTP aos domínios usados pelo projeto e limite-a somente às APIs acima. A chave web aparece no navegador por definição; a segurança depende das restrições de domínio e API.

Quando configurado, o cadastro de contrato permite buscar um endereço, preencher os componentes estruturados, salvar `placeId`, latitude e longitude, exibir marcador e reabrir a localização no Google Maps. Sem a chave, o cadastro manual continua disponível e a dependência é mostrada claramente.

## Estrutura principal

```text
app/api/contracts/       API CRUD e mudanças de status
app/api/config/          configuração pública controlada do mapa
components/contracts/    fluxo, lista, detalhes e estados de contratos
components/google-location.tsx
db/schema.ts             contratos e eventos contratuais
hooks/use-contracts.ts   estado remoto e tratamento de erros
lib/contracts.ts         tipos, máscaras e validações compartilhadas
lib/contract-server.ts   transformação e acesso aos dados
drizzle/                 migrações D1
```

## Comandos

```bash
npm run build
npm run lint
npx tsc --noEmit
npm run db:generate
```

Nunca grave chaves no código ou no repositório. Use `.env.example` apenas como referência dos nomes de configuração.
