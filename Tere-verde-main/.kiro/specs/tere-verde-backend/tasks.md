# Implementation Plan: Tere Verde Backend

## Overview

Implementação completa do back-end do projeto Circuito Terê Verde a partir do zero. A API REST em Node.js + Express + PostgreSQL + Prisma substitui os dados hardcoded do front-end existente por uma fonte centralizada, com autenticação JWT para administradores e endpoints públicos para visitantes.

A implementação segue a ordem: setup do projeto → banco de dados (schema + seed) → middlewares → serviços → controllers/rotas → testes property-based → README.

## Tasks

- [x] 1. Setup do projeto e estrutura de pastas
  - Criar o diretório `tere-verde-backend/` com a estrutura de pastas definida no design: `src/controllers/`, `src/routes/`, `src/middlewares/`, `src/services/`, `src/prisma/`, `prisma/migrations/`, `data/`, `test/unit/`, `test/property/`, `test/integration/`
  - Criar `package.json` com dependências de produção (`express`, `@prisma/client`, `jsonwebtoken`, `bcrypt`, `dotenv`) e de desenvolvimento (`prisma`, `jest`, `fast-check`, `supertest`, `@types/jest`)
  - Configurar scripts no `package.json`: `start`, `dev`, `test`, `test:unit`, `test:property`, `test:integration`
  - Criar `.env.example` com as variáveis `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `ADMIN_SEED_EMAIL`, `ADMIN_SEED_PASSWORD`, `PORT`, `NODE_ENV`
  - Criar `.gitignore` incluindo `node_modules/`, `.env`, arquivos de build
  - Criar `jest.config.js` configurando ambientes separados para `test/unit`, `test/property` e `test/integration`
  - _Requirements: 24.1_

- [ ] 2. Schema Prisma e banco de dados
  - [-] 2.1 Criar o schema Prisma com todos os modelos e enums
    - Criar `prisma/schema.prisma` conforme o design: enums `LocalEvento`, `Dificuldade`, `TipoAtividade`, `DisponibilidadeAtividade`; modelos `Admin`, `Parque`, `Evento`, `Atividade` com todos os campos, tipos, relações, índices e mapeamentos (`@@map`) definidos no design
    - Garantir que `Evento.local` usa o enum `LocalEvento` no nível do banco
    - Garantir que `Atividade.disponibilidade` usa o enum `DisponibilidadeAtividade` com `@default(Aberto)`
    - Garantir que `Evento.disponibilidade` é `Boolean @default(true)`
    - _Requirements: 21.1, 21.2, 3.4, 8.2, 8.3, 8.7_
  - [~] 2.2 Criar instância singleton do Prisma Client
    - Criar `src/prisma/prismaClient.js` que exporta uma única instância do `PrismaClient`, reutilizando a instância global em desenvolvimento para evitar múltiplas conexões em hot-reload
    - _Requirements: 21.1_

- [ ] 3. Seed de dados iniciais
  - [~] 3.1 Criar dados dos parques para seed
    - Criar `data/parquesSeed.js` com os dados dos três parques (`Serra dos Órgãos`, `Três Picos`, `Montanhas de Teresópolis`) extraídos dos objetos `modalData`, `modalDataMontanhas`, `modalDataTresPicos` do `index.js` do front-end
    - Cada parque deve incluir `identificador` (enum), `nome` (nome completo), `horarios` (JSON), `regras` (JSON) e `areasConvivencia` (JSON) conforme o schema
    - _Requirements: 16.1_
  - [~] 3.2 Criar dados de eventos para seed
    - Criar `data/eventosSeed.js` com os eventos extraídos do `event.js` do front-end, preservando `nome`, `data`, `dataTer`, `horario`, `horarioTer`, `local` e `descricao`
    - Associar cada evento ao parque correto via `parqueId` usando o `identificador` do parque como referência
    - _Requirements: 16.2, 16.5_
  - [~] 3.3 Criar dados de atividades para seed
    - Criar `data/atividadesSeed.js` com as atividades extraídas do `atividades.js` do front-end, preservando `parque`, `nome`, `distancia`, `tempo`, `descricao`, `disponibilidade`, `imagens`, `dificuldade` e `tipo`
    - Associar cada atividade ao parque correto via `parqueId` usando o nome completo do parque como referência
    - _Requirements: 16.3, 16.5_
  - [~] 3.4 Criar script principal de seed
    - Criar `data/seed.js` que usa `upsert` para criar/atualizar o administrador padrão (email/senha de `.env`), os três parques, os eventos e as atividades, sem duplicar registros em execuções repetidas
    - Armazenar a senha do administrador com `bcrypt.hash` antes de persistir; nunca persistir em texto puro
    - Garantir que eventos do seed têm `disponibilidade = true` e atividades têm `disponibilidade = "Aberto"`
    - Adicionar script `"seed": "node data/seed.js"` no `package.json`
    - _Requirements: 15.1, 15.2, 15.3, 16.1, 16.2, 16.3, 16.4, 16.5, 18.1_

- [~] 4. Checkpoint — Testar seed manualmente
  - Instalar dependências (`npm install`), gerar Prisma Client (`npx prisma generate`), criar banco (`npx prisma migrate dev`), executar seed (`npm run seed`) e verificar se admin, 3 parques, eventos e atividades foram criados sem erros. Perguntar ao usuário se há dúvidas antes de continuar.

- [ ] 5. Middlewares
  - [-] 5.1 Criar middleware de parsing JSON com tratamento de malformado
    - Criar `src/middlewares/jsonParser.js` que envolve `express.json()` e captura erros de sintaxe JSON (tipo `SyntaxError`) retornando 400 com `{ erro: "JSON malformado no corpo da requisição" }` antes de chegar aos controllers
    - _Requirements: 20.3_
  - [-] 5.2 Criar classes de erro customizadas e middleware de tratamento centralizado
    - Criar `src/middlewares/errorHandler.js` com as classes `ValidationError` (→ 400), `AuthError` (→ 401), `ForbiddenError` (→ 403), `NotFoundError` (→ 404), `InternalError` (→ 500)
    - Implementar a função `errorHandler(err, req, res, next)` que intercepta erros do Prisma (`P2025` → 404, `P2002` → 400, outros → 500) e converte qualquer erro não tratado em 500 com `{ erro: "Erro interno do servidor" }`
    - Incluir stack trace na resposta apenas em `NODE_ENV=development`
    - _Requirements: 20.4_
  - [~] 5.3 Criar middleware de autenticação JWT
    - Criar `src/middlewares/auth.js` com a função `authMiddleware` que extrai o token do header `Authorization: Bearer <token>`, verifica assinatura/expiração via `jwtService.verifyToken`, verifica blacklist via `jwtService.isBlacklisted`, e anexa `req.admin = { id, email, role }` em caso de sucesso
    - Implementar a função `adminGuard` que verifica `req.admin.role === "admin"` e retorna 403 se não for
    - Retornar 401 com mensagem específica para: token ausente, token inválido/expirado, token na blacklist
    - _Requirements: 19.1, 19.2, 2.2, 2.3, 6.4, 7.4_

- [ ] 6. Serviços
  - [-] 6.1 Criar serviço JWT com blacklist em memória
    - Criar `src/services/jwtService.js` com as funções: `signToken(admin)` que gera JWT com payload `{ sub, email, role, jti, iat, exp }` e segredo/expiração de `.env`; `verifyToken(token)` que verifica assinatura e expiração; `blacklistToken(jti, exp)` que adiciona o JTI à blacklist com timestamp; `isBlacklisted(jti)` que verifica se o JTI está na blacklist; `cleanupBlacklist()` que remove entradas expiradas
    - Configurar `cleanupBlacklist` para ser chamada periodicamente (ex: `setInterval` a cada 5 minutos) no ponto de entrada
    - _Requirements: 1.4, 2.1, 2.2, 23.1_
  - [-] 6.2 Criar serviço de validação com funções puras
    - Criar `src/services/validationService.js` com todas as funções de validação puras definidas no design: `isValidDate`, `isValidTime`, `isValidEmail`, `isValidLocal`, `isValidDificuldade`, `isValidTipo`, `isValidDisponibilidadeAtividade`, `validateEventoDatas`, `validateEventoHorarios`, `isPositiveNumericValue`, `validateRequiredFields`, `validateEventoCreate`, `validateEventoUpdate`, `validateAtividadeCreate`, `validateAtividadeUpdate`, `validateParqueUpdate`
    - Garantir que `isValidDate` rejeita datas inválidas como 2024-02-30 e aceita anos bissextos (2024-02-29)
    - Garantir que `isPositiveNumericValue` rejeita strings com prefixo numérico negativo (ex: "-1,3 km") e aceita strings com valores positivos (ex: "1,3 km") e strings não numéricas não vazias
    - Garantir que `validateEventoHorarios` só valida ordenação de horários quando `data === dataTer`
    - _Requirements: 1.3, 1.6, 3.2, 3.3, 3.4, 3.6, 5.3, 8.2, 8.3, 8.4, 8.8, 10.3, 10.4, 12.6, 14.3, 20.1, 20.2_
  - [~] 6.3 Criar transformadores de modelo para JSON de resposta
    - Criar `src/services/transformers.js` com as funções: `toEventoPublicJSON(evento)` que retorna exatamente `{ id, nome, data, dataTer, horario, horarioTer, local, descricao }` sem o campo `disponibilidade`; `toEventoAdminJSON(evento)` que inclui `disponibilidade`; `toAtividadePublicJSON(atividade, parqueNome)` que retorna exatamente `{ parque, nome, distancia, tempo, descricao, disponibilidade, imagens, dificuldade, tipo }` sem o campo `id`; `toParqueJSON(parque)` que retorna `{ id, nome, horarios, regras, areasConvivencia }`
    - Garantir que `toAtividadePublicJSON` recebe o nome completo do parque como segundo argumento ou o extrai do objeto `atividade.parque`
    - _Requirements: 4.5, 9.7, 13.2, 13.5, 22.1, 22.2, 22.3_

- [ ] 7. Testes property-based para validationService e transformers
  - [~] 7.1 Escrever testes property-based para funções de validação (Propriedades 1–12)
    - Criar `test/property/validationProperties.test.js` usando `fast-check`
    - Cada teste deve ter o comentário `// Feature: tere-verde-backend, Property {N}: {descrição}` e mínimo 100 iterações
    - _Requirements: 1.3, 1.6, 3.2, 3.3, 3.4, 3.6, 8.2, 8.3, 8.4, 8.7, 8.8, 12.6, 20.2_
  - [ ]* 7.2 Escrever testes property-based para funções de filtragem (Propriedades 13–15, 17–18)
    - Criar `test/property/filterProperties.test.js` usando `fast-check`
    - **Property 13:** Event availability filtering — gera listas de eventos com `disponibilidade` aleatória, verifica que apenas `disponibilidade=true` aparecem e que o máximo é 100
    - **Property 14:** Event park filtering — gera eventos com `local` aleatório, verifica que o filtro por parque retorna apenas os correspondentes
    - **Property 15:** Event sorting invariant — gera listas de eventos com datas aleatórias, verifica que a ordenação por `data` crescente é mantida
    - **Property 17:** Activity availability filtering — gera listas de atividades com `disponibilidade` aleatória, verifica que apenas `"Aberto"` aparece e que o máximo é 50
    - **Property 18:** Activity combined filtering — gera atividades e combinações aleatórias de filtros, verifica que todos os filtros são aplicados simultaneamente
    - **Validates: Requirements 4.1, 4.2, 4.3, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.9**
  - [ ]* 7.3 Escrever testes property-based para transformadores e serialização (Propriedades 16, 19–24)
    - Criar `test/property/serializationProperties.test.js` usando `fast-check`
    - **Property 16:** Event serialization format — gera modelos `Evento` aleatórios, verifica que `toEventoPublicJSON` retorna exatamente os campos `id, nome, data, dataTer, horario, horarioTer, local, descricao` sem `disponibilidade`
    - **Property 19:** Activity serialization format — gera modelos `Atividade` com `Parque` associado, verifica que `toAtividadePublicJSON` retorna exatamente os campos `parque, nome, distancia, tempo, descricao, disponibilidade, imagens, dificuldade, tipo` sem `id`
    - **Property 20:** Park serialization format — gera modelos `Parque` aleatórios, verifica que `toParqueJSON` retorna exatamente `id, nome, horarios, regras, areasConvivencia`
    - **Property 21:** Park field validation with length — gera bodies de parque com campos de tamanho variável, verifica que campos > 5000 chars são rejeitados com motivo específico
    - **Property 22:** Password never exposed — gera respostas de API aleatórias, verifica ausência de chaves `senha`, `senhaHash`, `password`, `hash`
    - **Property 23:** Event JSON round-trip — gera eventos, serializa com `toEventoPublicJSON`, parseia o JSON resultante, verifica equivalência de todos os campos
    - **Property 24:** Activity JSON round-trip — gera atividades, serializa com `toAtividadePublicJSON`, parseia, verifica equivalência de todos os campos
    - **Validates: Requirements 4.5, 9.7, 13.2, 13.5, 14.3, 18.2, 22.1, 22.2, 22.3, 22.4**

- [ ] 8. Configuração do Express e ponto de entrada
  - [~] 8.1 Criar app.js e server.js
    - Criar `src/app.js` que configura o Express: registra `jsonParser`, todas as rotas via `src/routes/index.js`, e o `errorHandler` como último middleware; exporta `app` para testes de integração
    - Criar `src/server.js` que importa `app`, inicia o servidor na porta configurada e agenda `cleanupBlacklist` via `setInterval`
    - _Requirements: 20.3, 20.4_

- [ ] 9. Controller e rotas de autenticação
  - [~] 9.1 Implementar AuthController e authRoutes
    - Criar `src/controllers/AuthController.js` com os métodos `login` e `logout`
    - `login`: valida presença e formato de `email` e `senha` via `validationService`, busca admin no banco, compara senha com `bcrypt.compare`, gera token com `jwtService.signToken`, retorna 200 com `{ token }` ou erros 400/401 conforme o design
    - `logout`: extrai JTI do token já verificado pelo `authMiddleware`, chama `jwtService.blacklistToken`, retorna 200 com `{ mensagem: "Logout realizado com sucesso" }`
    - Criar `src/routes/authRoutes.js` mapeando `POST /auth/login` (público) e `POST /auth/logout` (protegido com `authMiddleware`)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.4, 2.5_
  - [~] 9.2 Criar roteador principal e montar authRoutes
    - Criar `src/routes/index.js` que importa e monta `authRoutes` em `/auth`
    - _Requirements: 24.1_

- [ ] 10. Controller e rotas de parques
  - [~] 10.1 Implementar ParqueController e parqueRoutes
    - Criar `src/controllers/ParqueController.js` com os métodos `list`, `getById` e `update`
    - `list`: busca todos os parques com `prisma.parque.findMany`, serializa com `toParqueJSON`, retorna 200
    - `getById`: valida formato do `id` (UUID), busca com `prisma.parque.findUnique`, retorna 200 ou 400/404 conforme o design
    - `update`: protegido por `authMiddleware` + `adminGuard`; valida todos os campos obrigatórios e limite de 5000 caracteres via `validateParqueUpdate`; atualiza com `prisma.parque.update`, retorna 200 ou 400/404
    - Criar `src/routes/parqueRoutes.js` mapeando `GET /parques`, `GET /parques/:id` (públicos) e `PUT /parques/:id` (protegido)
    - Adicionar `parqueRoutes` ao roteador principal em `src/routes/index.js`
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 14.1, 14.2, 14.3, 14.4_

- [ ] 11. Controller e rotas de eventos
  - [~] 11.1 Implementar EventoController e eventoRoutes
    - Criar `src/controllers/EventoController.js` com os métodos `list`, `create`, `update`, `remove` e `toggleDisponibilidade`
    - `list`: aceita query param `?parque=`; filtra por `disponibilidade=true` e por parque se informado; ordena por `data` crescente; limita a 100; serializa com `toEventoPublicJSON`; retorna 200
    - `create`: protegido; valida com `validateEventoCreate`; resolve `parqueId` a partir do valor de `local`; cria com `prisma.evento.create`; serializa com `toEventoAdminJSON`; retorna 201
    - `update`: protegido; valida com `validateEventoUpdate`; atualiza apenas os campos fornecidos com `prisma.evento.update`; retorna 200 ou 400/404
    - `remove`: protegido; deleta com `prisma.evento.delete`; retorna 204 ou 404
    - `toggleDisponibilidade`: protegido; valida que `disponibilidade` é boolean; atualiza com `prisma.evento.update`; retorna 200 com `{ id, disponibilidade }` ou 400/404
    - Criar `src/routes/eventoRoutes.js` mapeando todos os 5 endpoints conforme a tabela do design
    - Adicionar `eventoRoutes` ao roteador principal
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 12. Controller e rotas de atividades
  - [~] 12.1 Implementar AtividadeController e atividadeRoutes
    - Criar `src/controllers/AtividadeController.js` com os métodos `list`, `create`, `update`, `remove` e `setDisponibilidade`
    - `list`: aceita query params `?parque=`, `?dificuldade=`, `?tipo=`; filtra por `disponibilidade="Aberto"` e pelos filtros opcionais combinados; limita a 50; serializa com `toAtividadePublicJSON` passando o nome do parque; retorna 200
    - `create`: protegido; valida com `validateAtividadeCreate`; resolve `parqueId` a partir do `parque` (nome completo); aplica default `"Aberto"` se `disponibilidade` não for informado; cria com `prisma.atividade.create` incluindo `select: { ..., parque: true }`; retorna 201 com atividade criada (formato admin, inclui `id`)
    - `update`: protegido; valida com `validateAtividadeUpdate`; atualiza com `prisma.atividade.update`; retorna 200 ou 400/404
    - `remove`: protegido; deleta com `prisma.atividade.delete`; retorna 204 ou 404
    - `setDisponibilidade`: protegido; valida que `disponibilidade` é `"Aberto"` ou `"Fechado"` via `isValidDisponibilidadeAtividade`; atualiza; retorna 200 com `{ id, disponibilidade }` ou 400/404
    - Criar `src/routes/atividadeRoutes.js` mapeando todos os 5 endpoints conforme a tabela do design
    - Adicionar `atividadeRoutes` ao roteador principal
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 10.1, 10.2, 10.3, 10.4, 10.5, 11.1, 11.2, 11.3, 11.4, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

- [~] 13. Checkpoint — Testar todos os endpoints manualmente
  - Executar `npm run dev`, usar um cliente HTTP (curl, Postman, Insomnia) para testar todos os endpoints: login → logout → listar parques → listar eventos → listar atividades → criar evento → editar evento → deletar evento → criar atividade → setar disponibilidade. Garantir que os filtros públicos e a proteção JWT funcionam. Perguntar ao usuário se há ajustes antes de prosseguir.

- [ ] 14. Testes de integração
  - [ ]* 14.1 Escrever testes de integração para autenticação
    - Criar `test/integration/auth.test.js` usando `jest` + `supertest`
    - Cobrir os cenários do design: login com credenciais válidas (200), e-mail inexistente (401), senha incorreta (401), campos ausentes (400), e-mail malformado (400), logout com token válido (200), logout sem token (401), logout com token já invalidado (401), uso de token invalidado em endpoint protegido (401)
    - _Requirements: 1.1, 1.2, 1.3, 1.6, 2.1, 2.4, 2.5_
  - [ ]* 14.2 Escrever testes de integração para eventos
    - Criar `test/integration/eventos.test.js` usando `jest` + `supertest`
    - Cobrir: criação válida (201), data início > data término (400), horário início > horário término mesmo dia (400), local inválido (400), campos ausentes (400), sem token (401), listagem pública (200, apenas disponíveis, ordenados por data), filtro por parque (200), edição parcial (200, campos preservados), edição inexistente (404), data inválida na edição (400), exclusão (204), exclusão inexistente (404), toggle disponibilidade (200), toggle inexistente (404)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6, 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 6.1, 6.2, 7.1, 7.2, 7.3_
  - [ ]* 14.3 Escrever testes de integração para atividades
    - Criar `test/integration/atividades.test.js` usando `jest` + `supertest`
    - Cobrir: criação válida (201), dificuldade inválida (400), tipo inválido (400), campos ausentes (400), sem disponibilidade → default "Aberto" (201), distância negativa (400), listagem pública (200, apenas "Aberto", máx. 50), filtros individuais e combinados, sem resultado → lista vazia (200), edição (200), edição inexistente (404), exclusão (204), set disponibilidade "Aberto"/"Fechado" (200), valor inválido (400)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.7, 8.8, 9.1, 9.5, 9.6, 9.9, 10.1, 10.2, 11.1, 11.2, 12.1, 12.2, 12.6_
  - [ ]* 14.4 Escrever testes de integração para parques e seed
    - Criar `test/integration/parques.test.js` cobrindo: listar parques (200), obter por ID (200), inexistente (404), ID inválido (400), editar com dados válidos (200), inexistente (404), campos ausentes (400), campo > 5000 chars (400), sem token (401)
    - Criar `test/integration/seed.test.js` (smoke tests): seed cria admin + 3 parques + eventos + atividades; seed idempotente (sem duplicação); admin consegue logar; eventos do seed têm `disponibilidade=true`; atividades têm `disponibilidade="Aberto"`; senha é hash bcrypt
    - _Requirements: 13.1, 13.4, 13.6, 14.1, 14.2, 14.3, 15.1, 15.2, 15.3, 15.4, 16.1, 16.4, 16.5, 18.1_
  - [ ]* 14.5 Escrever testes de integração para segurança
    - Criar `test/integration/security.test.js` cobrindo: endpoint protegido sem token (401), token inválido (401), token expirado (401), endpoints públicos sem token (200), resposta de qualquer endpoint não contém senha ou hash
    - _Requirements: 18.2, 19.1, 19.2, 19.3, 19.4_

- [ ] 15. README.md do back-end
  - [~] 15.1 Criar README.md com instruções de instalação, configuração e execução
    - Criar `tere-verde-backend/README.md` com: descrição do projeto, pré-requisitos (Node.js, PostgreSQL), instruções de instalação (`npm install`), configuração de variáveis de ambiente (cópia do `.env.example`), execução das migrations (`npx prisma migrate dev`), execução do seed (`npm run seed`), início do servidor (`npm run dev`), comandos de teste (`npm test`, `npm run test:unit`, `npm run test:property`, `npm run test:integration`), tabela de endpoints (método, rota, auth, descrição)
    - _Requirements: 24.2_

- [~] 16. Checkpoint final — Executar toda a suíte de testes
  - Executar `npm test` e garantir que todos os testes property-based passam. Executar `npm run test:integration` com banco de teste configurado e garantir que todos os testes de integração passam. Corrigir quaisquer falhas antes de considerar a implementação concluída. Perguntar ao usuário se há questões em aberto.

## Notes

- Tarefas marcadas com `*` são opcionais e podem ser puladas para uma entrega MVP mais rápida
- O projeto é criado do zero em `tere-verde-backend/` — nenhum arquivo de código existe previamente
- O front-end existente fica em `c:\Users\Nidesu\Desktop\MVP\Tere-verde-main\Tere-verde-main\` e os arquivos `event.js`, `atividades.js` e `index.js` são a fonte de verdade para os dados do seed
- O design possui uma seção "Correctness Properties" — testes property-based são aplicáveis e cobrem as 24 propriedades definidas
- O campo `local` em Evento usa o enum `Serra_dos_Orgaos`/`Tres_Picos`/`Montanhas_Teresopolis` para compatibilidade com o front-end
- O campo `parque` em Atividade usa o nome completo (ex: "Parque Nacional da Serra dos Órgãos") para compatibilidade com o front-end
- Atividades não expõem `id` nas respostas públicas; o `id` é usado apenas nas URLs de operações administrativas
- Distância e tempo são armazenados como strings formatadas (ex: "1,3 km", "1h") — compatibilidade com o front-end

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1", "5.1", "5.2", "6.1", "6.2", "6.3"] },
    { "id": 1, "tasks": ["2.2", "3.1", "7.1", "7.3"] },
    { "id": 2, "tasks": ["3.2", "3.3", "5.3"] },
    { "id": 3, "tasks": ["3.4"] },
    { "id": 4, "tasks": ["9.1"] },
    { "id": 5, "tasks": ["9.2"] },
    { "id": 6, "tasks": ["8.1", "10.1"] },
    { "id": 7, "tasks": ["11.1"] },
    { "id": 8, "tasks": ["12.1"] },
    { "id": 9, "tasks": ["7.2"] },
    { "id": 10, "tasks": ["14.1", "14.2", "14.3", "14.4", "14.5"] },
    { "id": 11, "tasks": ["15.1"] }
  ]
}
```
