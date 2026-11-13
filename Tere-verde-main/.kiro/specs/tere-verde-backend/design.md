# Design Document: Tere Verde Backend

## Overview

O back-end do projeto Circuito Terê Verde ("Terê Verde Online") é uma API REST desenvolvida em Node.js + Express com PostgreSQL e Prisma ORM. O objetivo é substituir os dados hoje hardcoded e armazenados no `localStorage` do front-end existente (HTML/CSS/JavaScript puro) por uma fonte de dados centralizada, servida via HTTP.

A API atende dois atores:
- **Administrador**: usuário autenticado via JWT com permissão para criar, editar, excluir e controlar a disponibilidade de eventos, atividades e parques.
- **Visitante**: usuário não autenticado que consome apenas os endpoints públicos de leitura.

O MVP roda localmente (sem deploy em nuvem), preparando a API para integração com o front-end web existente e, futuramente, com o aplicativo mobile do próximo semestre.

### Pesquisa e Contexto do Front-End Existente

A pesquisa consistiu na análise do código-fonte do front-end existente para garantir compatibilidade de dados. Os arquivos relevantes analisados foram:

- **`event.js`**: Define a estrutura de eventos com campos `id` (UUID), `nome`, `data` (YYYY-MM-DD), `dataTer`, `horario` (HH:MM), `horarioTer`, `local` (enum: `Serra_dos_Orgaos`, `Tres_Picos`, `Montanhas_Teresopolis`), `descricao`. Eventos são ordenados por `data` em ordem crescente. O filtro por parque é feito no lado do cliente, mapeando o identificador enum para o nome completo do parque.
- **`atividades.js`**: Define a estrutura de atividades com campos `parque` (nome completo do parque, ex: "Parque Nacional da Serra dos Órgãos"), `nome`, `distancia` (string formatada, ex: "1,3 km"), `tempo` (string formatada, ex: "1h"), `descricao`, `disponibilidade` ("Aberto"/"Fechado"), `imagens` (caminho de arquivo), `dificuldade` ("Fácil"/"Médio"/"Difícil"), `tipo` ("Trilha"/"Cachoeira"/"Escalada"). Atividades **não possuem campo `id`** no front-end. Filtros combináveis por parque, dificuldade e tipo são aplicados no lado do cliente.
- **`admin_eventos.js`**: Implementa a validação de eventos no front-end: `dataInicio` não pode ser posterior a `dataTermino`; se as datas forem iguais, `horarioInicio` não pode ser posterior a `horarioTermino`. Usa `Date.now()` como id (substituído por UUID no back-end).
- **`login.js`**: Autenticação hardcoded (`admin`/`admin`), a ser substituída por JWT.
- **`index.js`**: Contém dados hardcoded dos parques em objetos `modalData`, `modalDataMontanhas`, `modalDataTresPicos`, incluindo horários de funcionamento, regras de conduta e áreas de convivência (estacionamento, camping, cachoeira, trilha, escalada).

**Decisões de design derivadas da pesquisa:**

1. **Duas representações de parque**: Eventos usam o identificador enum (`Serra_dos_Orgaos`) no campo `local`; atividades usam o nome completo (`Parque Nacional da Serra dos Órgãos`) no campo `parque`. A API mantém ambas as representações para compatibilidade com o front-end.
2. **Atividades sem `id` no front-end**: O back-end gera UUIDs para todas as atividades, mas o campo `id` não é incluído no formato de resposta público para atividades (Req 9.7). O `id` é usado apenas nas URLs de operações administrativas.
3. **Distância e tempo como strings**: O front-end armazena `distancia` como "1,3 km" e `tempo` como "1h". O back-end preserva esses formatos de string para compatibilidade, com validação adicional de positividade.

## Architecture

A API segue uma arquitetura em camadas com separação de responsabilidades:

```mermaid
graph TB
    subgraph "Cliente"
        FE["Front-end Web (HTML/CSS/JS)"]
        MB["App Mobile (futuro)"]
    end

    subgraph "API Terê Verde (Node.js + Express)"
        MW["Middlewares<br/>auth • errorHandler • jsonParser"]
        subgraph "Rotas"
            AR["/auth"]
            ER["/eventos"]
            AT["/atividades"]
            PR["/parques"]
        end
        subgraph "Controllers"
            AC["AuthController"]
            EC["EventoController"]
            ATC["AtividadeController"]
            PC["ParqueController"]
        end
        subgraph "Serviços"
            JWT["jwtService"]
            VAL["validationService"]
            TRN["transformers"]
        end
        subgraph "Data Access"
            PC2["Prisma Client"]
        end
    end

    subgraph "Persistência"
        PG[("PostgreSQL")]
    end

    FE --> MW
    MB --> MW
    MW --> AR & ER & AT & PR
    AR --> AC
    ER --> EC
    AT --> ATC
    PR --> PC
    AC --> JWT
    AC --> VAL
    EC --> VAL
    EC --> TRN
    ATC --> VAL
    ATC --> TRN
    PC --> VAL
    PC --> TRN
    AC & EC & ATC & PC --> PC2
    PC2 --> PG
```

### Decisões Arquiteturais

**1. API Stateless com Token Blacklist para Logout**

A API é stateless (Req 23.1): toda informação de sessão está contida no JWT, e nenhuma sessão é mantida no servidor entre requisições. O logout (Req 2) exige invalidação server-side do token, implementada via uma **blacklist em memória** que armazena o JTI (JWT ID) dos tokens invalidados junto com seu timestamp de expiração. Entradas expiradas são removidas automaticamente.

Esta abordagem é uma exceção aceitável à regra stateless: a blacklist não armazena estado de sessão, mas sim uma lista de revogação de segurança. Em caso de reinício do servidor, a blacklist é limpa, mas os tokens expiram em 1 hora (configurável), limitando o impacto.

**2. Transformadores de Resposta para Compatibilidade com o Front-End**

Os modelos do Prisma não correspondem diretamente ao formato JSON esperado pelo front-end. Uma camada de transformadores converte os modelos do banco para o formato de resposta compatível:
- `Evento` → `{ id, nome, data, dataTer, horario, horarioTer, local, descricao }` (sem `disponibilidade` na listagem pública)
- `Atividade` → `{ parque: Parque.nome, nome, distancia, tempo, descricao, disponibilidade, imagens, dificuldade, tipo }` (sem `id` na listagem pública)
- `Parque` → `{ nome, horarios, regras, areasConvivencia }`

**3. Validação Centralizada**

Toda a lógica de validação é extraída em funções puras no `validationService`, permitindo testes unitários e property-based sem dependência de banco de dados ou HTTP.

**4. Tratamento de Erros Centralizado**

Um middleware `errorHandler` captura todos os erros não tratados e converte em respostas HTTP apropriadas, garantindo respostas consistentes em toda a API.

### Variáveis de Ambiente

| Variável | Descrição | Default |
|---|---|---|
| `DATABASE_URL` | String de conexão PostgreSQL | `postgresql://user:pass@localhost:5432/tereverde` |
| `JWT_SECRET` | Segredo para assinatura JWT | — (obrigatório) |
| `JWT_EXPIRES_IN` | Expiração do token em segundos | `3600` |
| `ADMIN_SEED_EMAIL` | E-mail do admin do seed | `admin@tereverde.com` |
| `ADMIN_SEED_PASSWORD` | Senha do admin do seed | `admin` |
| `PORT` | Porta do servidor | `3000` |
| `NODE_ENV` | Ambiente (`development` ou `production`) | `development` |

## Components and Interfaces

### Estrutura de Diretórios

```
tere-verde-backend/
├── src/
│   ├── app.js                      # Configuração do Express
│   ├── server.js                   # Ponto de entrada (inicia servidor)
│   ├── controllers/
│   │   ├── AuthController.js
│   │   ├── EventoController.js
│   │   ├── AtividadeController.js
│   │   └── ParqueController.js
│   ├── routes/
│   │   ├── index.js                # Monta todos os roteadores
│   │   ├── authRoutes.js
│   │   ├── eventoRoutes.js
│   │   ├── atividadeRoutes.js
│   │   └── parqueRoutes.js
│   ├── middlewares/
│   │   ├── auth.js                 # Verificação de JWT + blacklist
│   │   ├── errorHandler.js         # Tratamento centralizado de erros
│   │   └── jsonParser.js           # Parser de JSON com tratamento de malformado
│   ├── services/
│   │   ├── jwtService.js           # sign, verify, blacklist
│   │   ├── validationService.js    # Funções puras de validação
│   │   └── transformers.js         # Conversão modelo → JSON de resposta
│   └── prisma/
│       └── prismaClient.js         # Instância singleton do Prisma Client
├── prisma/
│   ├── schema.prisma               # Schema do Prisma
│   └── migrations/
├── data/
│   ├── seed.js                     # Script principal de seed
│   ├── parquesSeed.js              # Dados dos 3 parques
│   ├── eventosSeed.js              # Eventos padrão do front-end
│   └── atividadesSeed.js           # Atividades padrão do front-end
├── test/
│   ├── unit/
│   ├── property/
│   └── integration/
├── .env.example
├── package.json
└── README.md
```

### 1. Middlewares

#### `auth.js` — Middleware de Autenticação

Verifica a presença e validade do token JWT em requisições a endpoints protegidos.

```javascript
// Interface conceitual
function authMiddleware(req, res, next)
// Extrai o token do header Authorization: Bearer <token>
// Verifica assinatura, expiração e blacklist
// Anexa req.admin = { id, email, role }
// Retorna 401 se ausente/inválido/expirado/blacklisted
```

```javascript
function adminGuard(req, res, next)
// Verifica req.admin.role === "admin"
// Retorna 403 se o token é válido mas o usuário não é admin
```

#### `errorHandler.js` — Tratamento de Erros

```javascript
function errorHandler(err, req, res, next)
// Recebe erros lançados por controllers/middlewares
// Mapeia tipos de erro para códigos HTTP apropriados:
//   ValidationError      → 400
//   AuthError            → 401
//   ForbiddenError      → 403
//   NotFoundError        → 404
//   PrismaKnownError     → 400 ou 500 conforme tipo
//   Erro não tratado     → 500
```

#### `jsonParser.js` — Parser de JSON

Envolve o `express.json()` para capturar erros de JSON malformado (Req 20.3) e retornar 400 com mensagem descritiva em vez de deixar o erro propagar sem tratamento.

### 2. Serviços

#### `jwtService.js`

```javascript
// Gera um token JWT com payload { sub, email, role, jti, iat, exp }
function signToken(admin) → string

// Verifica assinatura e expiração do token
function verifyToken(token) → { sub, email, role, jti, exp }

// Adiciona JTI à blacklist com timestamp de expiração
function blacklistToken(jti, exp)

// Verifica se o JTI está na blacklist
function isBlacklisted(jti) → boolean

// Limpa entradas expiradas da blacklist (chamado periodicamente)
function cleanupBlacklist()
```

#### `validationService.js`

Funções puras de validação, sem efeitos colaterais, testáveis isoladamente:

```javascript
// Validações de formato
function isValidDate(dateStr) → boolean      // YYYY-MM-DD, data válida
function isValidTime(timeStr) → boolean      // HH:MM, 00:00–23:59
function isValidEmail(emailStr) → boolean    // contém "@" e domínio

// Validações de enum
function isValidLocal(local) → boolean      // Serra_dos_Orgaos | Tres_Picos | Montanhas_Teresopolis
function isValidDificuldade(val) → boolean   // Fácil | Médio | Difícil
function isValidTipo(val) → boolean          // Trilha | Cachoeira | Escalada
function isValidDisponibilidadeAtividade(val) → boolean  // Aberto | Fechado

// Validações de regra de negócio
function validateEventoDatas(data, dataTer) → { valid: boolean, message?: string }
function validateEventoHorarios(data, dataTer, horario, horarioTer) → { valid: boolean, message?: string }
function isPositiveNumericValue(value) → boolean  // para distancia e tempo

// Validações de campos obrigatórios
function validateRequiredFields(body, requiredFields) → { valid: boolean, missing: string[] }

// Validação completa de entidades
function validateEventoCreate(body) → { valid: boolean, errors: string[] }
function validateEventoUpdate(body) → { valid: boolean, errors: string[] }
function validateAtividadeCreate(body) → { valid: boolean, errors: string[] }
function validateAtividadeUpdate(body) → { valid: boolean, errors: string[] }
function validateParqueUpdate(body) → { valid: boolean, errors: string[] }
```

#### `transformers.js`

```javascript
// Converte modelo Prisma Evento → JSON compatível com o front-end (listagem pública)
function toEventoPublicJSON(evento) → { id, nome, data, dataTer, horario, horarioTer, local, descricao }

// Converte modelo Prisma Evento → JSON completo (admin: inclui disponibilidade)
function toEventoAdminJSON(evento) → { id, nome, data, dataTer, horario, horarioTer, local, descricao, disponibilidade }

// Converte modelo Prisma Atividade → JSON compatível com o front-end (listagem pública)
function toAtividadePublicJSON(atividade, parqueNome) → { parque, nome, distancia, tempo, descricao, disponibilidade, imagens, dificuldade, tipo }

// Converte modelo Prisma Parque → JSON compatível com o front-end
function toParqueJSON(parque) → { id, nome, horarios, regras, areasConvivencia }
```

### 3. Controllers

#### `AuthController.js`

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `login` | `POST /auth/login` | Público | Valida credenciais, retorna JWT |
| `logout` | `POST /auth/logout` | Admin | Adiciona token à blacklist |

**POST /auth/login**
- Request: `{ email: string, senha: string }`
- Response 200: `{ token: string }`
- Response 400: `{ erro: string, campos?: string[] }` — campos ausentes ou e-mail inválido
- Response 401: `{ erro: string }` — credenciais inválidas

**POST /auth/logout**
- Header: `Authorization: Bearer <token>`
- Response 200: `{ mensagem: string }`
- Response 401: `{ erro: string }` — sem token ou token inválido/blacklisted

#### `EventoController.js`

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `list` | `GET /eventos` | Público | Lista eventos disponíveis (máx. 100) |
| `create` | `POST /eventos` | Admin | Cria novo evento |
| `update` | `PUT /eventos/:id` | Admin | Atualiza campos do evento |
| `remove` | `DELETE /eventos/:id` | Admin | Remove evento |
| `toggleDisponibilidade` | `PATCH /eventos/:id/disponibilidade` | Admin | Ativa/desativa disponibilidade |

**GET /eventos** (público)
- Query: `?parque=Serra_dos_Orgaos|Tres_Picos|Montanhas_Teresopolis` (opcional)
- Response 200: `[ { id, nome, data, dataTer, horario, horarioTer, local, descricao } ]`
- Ordenado por `data` crescente; apenas `disponibilidade = true`; máx. 100 itens

**POST /eventos** (admin)
- Request: `{ nome, data, dataTer, horario, horarioTer, local, descricao }`
- Response 201: `{ id, nome, data, dataTer, horario, horarioTer, local, descricao, disponibilidade }`
- Response 400: `{ erro: string, campos?: string[] }`

**PUT /eventos/:id** (admin)
- Request: partial `{ nome?, data?, dataTer?, horario?, horarioTer?, local?, descricao? }`
- Response 200: evento atualizado (formato admin)
- Response 400/404: conforme validação

**DELETE /eventos/:id** (admin)
- Response 204: sem corpo
- Response 404: `{ erro: string }`

**PATCH /eventos/:id/disponibilidade** (admin)
- Request: `{ disponibilidade: boolean }`
- Response 200: `{ id, disponibilidade: boolean }`
- Response 400/404: conforme validação

#### `AtividadeController.js`

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `list` | `GET /atividades` | Público | Lista atividades abertas (máx. 50) |
| `create` | `POST /atividades` | Admin | Cria nova atividade |
| `update` | `PUT /atividades/:id` | Admin | Atualiza campos da atividade |
| `remove` | `DELETE /atividades/:id` | Admin | Remove atividade |
| `setDisponibilidade` | `PATCH /atividades/:id/disponibilidade` | Admin | Define Aberto/Fechado |

**GET /atividades** (público)
- Query: `?parque=<nome completo>&dificuldade=Fácil|Médio|Difícil&tipo=Trilha|Cachoeira|Escalada` (todos opcionais, combináveis)
- Response 200: `[ { parque, nome, distancia, tempo, descricao, disponibilidade, imagens, dificuldade, tipo } ]`
- Apenas `disponibilidade = "Aberto"`; máx. 50 itens

**POST /atividades** (admin)
- Request: `{ nome, parque, distancia, tempo, descricao, dificuldade, tipo, disponibilidade? }`
- `disponibilidade` opcional, default `"Aberto"`
- Response 201: atividade criada (formato admin, inclui `id`)
- Response 400: `{ erro: string, campos?: string[] }`

**PATCH /atividades/:id/disponibilidade** (admin)
- Request: `{ disponibilidade: "Aberto" | "Fechado" }`
- Response 200: `{ id, disponibilidade: string }`
- Response 400: valor inválido

#### `ParqueController.js`

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `list` | `GET /parques` | Público | Lista todos os parques |
| `getById` | `GET /parques/:id` | Público | Retorna um parque específico |
| `update` | `PUT /parques/:id` | Admin | Atualiza dados do parque |

**GET /parques** (público)
- Response 200: `[ { id, nome, horarios, regras, areasConvivencia } ]`

**GET /parques/:id** (público)
- Response 200: `{ id, nome, horarios, regras, areasConvivencia }`
- Response 400: id com formato inválido
- Response 404: parque não encontrado

**PUT /parques/:id** (admin)
- Request: `{ nome, horarios, regras, areasConvivencia }` (todos obrigatórios, cada um máx. 5000 caracteres)
- Response 200: parque atualizado
- Response 400: campos ausentes/vazios/excedendo 5000 caracteres

## Data Models

### Diagrama Entidade-Relacionamento

```mermaid
erDiagram
    Admin {
        String id PK "UUID"
        String email UK
        String senhaHash "bcrypt"
        DateTime createdAt
    }

    Parque {
        String id PK "UUID"
        String identificador UK "enum: Serra_dos_Orgaos, Tres_Picos, Montanhas_Teresopolis"
        String nome UK "Nome completo do parque"
        Json horarios "Array de seções { titulo, conteudo[] }"
        Json regras "Array de regras de conduta"
        Json areasConvivencia "Array de áreas disponíveis"
        DateTime createdAt
        DateTime updatedAt
    }

    Evento {
        String id PK "UUID"
        String nome
        String data "YYYY-MM-DD"
        String dataTer "YYYY-MM-DD"
        String horario "HH:MM"
        String horarioTer "HH:MM"
        LocalEvento local "Enum"
        String descricao
        Boolean disponibilidade "Default: true"
        String parqueId FK
        DateTime createdAt
        DateTime updatedAt
    }

    Atividade {
        String id PK "UUID"
        String nome
        String distancia "String formatada (ex: 1,3 km)"
        String tempo "String formatada (ex: 1h)"
        String descricao
        DisponibilidadeAtividade disponibilidade "Default: Aberto"
        String imagens "Caminho de arquivo (opcional)"
        Dificuldade dificuldade "Enum"
        TipoAtividade tipo "Enum"
        String parqueId FK
        DateTime createdAt
        DateTime updatedAt
    }

    Parque ||--o{ Evento : "possui"
    Parque ||--o{ Atividade : "possui"
```

### Schema do Prisma

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum LocalEvento {
  Serra_dos_Orgaos
  Tres_Picos
  Montanhas_Teresopolis
}

enum Dificuldade {
  Facil
  Medio
  Dificil
}

enum TipoAtividade {
  Trilha
  Cachoeira
  Escalada
}

enum DisponibilidadeAtividade {
  Aberto
  Fechado
}

model Admin {
  id        String   @id @default(uuid())
  email     String   @unique
  senhaHash String
  createdAt DateTime @default(now())

  @@map("admins")
}

model Parque {
  id               String   @id @default(uuid())
  identificador    String   @unique
  nome             String   @unique
  horarios         Json
  regras           Json
  areasConvivencia Json
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  eventos          Evento[]
  atividades       Atividade[]

  @@map("parques")
}

model Evento {
  id              String        @id @default(uuid())
  nome            String
  data            String
  dataTer         String
  horario         String
  horarioTer      String
  local           LocalEvento
  descricao       String
  disponibilidade Boolean       @default(true)
  parqueId        String
  parque          Parque        @relation(fields: [parqueId], references: [id])
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@index([parqueId])
  @@map("eventos")
}

model Atividade {
  id              String                   @id @default(uuid())
  nome            String
  distancia       String
  tempo           String
  descricao       String
  disponibilidade DisponibilidadeAtividade @default(Aberto)
  imagens         String?
  dificuldade     Dificuldade
  tipo            TipoAtividade
  parqueId        String
  parque          Parque                   @relation(fields: [parqueId], references: [id])
  createdAt       DateTime                 @default(now())
  updatedAt       DateTime                 @updatedAt

  @@index([parqueId])
  @@map("atividades")
}
```

### Decisões de Modelagem

**1. Datas e horários como strings**

Os campos `data`, `dataTer`, `horario` e `horarioTer` são armazenados como strings (`YYYY-MM-DD` e `HH:MM`) para compatibilidade direta com o front-end, que já utiliza esses formatos. A validação de formato é feita na camada de aplicação via `validationService`.

**2. Distância e tempo como strings formatadas**

Os campos `distancia` e `tempo` são strings formatadas (ex: "1,3 km", "1h") para compatibilidade com o front-end. A validação (Req 8.8) verifica que o valor não é vazio e que, se um valor numérico for extraído, este é positivo. Rejeita-se valores que comecem com sinal negativo.

**3. Parque como tabela separada com identificador e nome**

A tabela `Parque` possui tanto `identificador` (enum string, ex: "Serra_dos_Orgaos") quanto `nome` (nome completo, ex: "Parque Nacional da Serra dos Órgãos"). Eventos referenciam o parque via `parqueId` (FK), e o campo `local` no JSON de resposta é derivado de `Parque.identificador`. Atividades referenciam o parque via `parqueId` (FK), e o campo `parque` no JSON de resposta é derivado de `Parque.nome`.

**4. Disponibilidade booleana vs. enum**

- Eventos usam `disponibilidade Boolean` (true/false), conforme Req 7.
- Atividades usam `disponibilidade DisponibilidadeAtividade` (enum: Aberto/Fechado), conforme Req 12.

**5. Campos JSON em Parque**

`horarios`, `regras` e `areasConvivencia` são armazenados como `Json` no PostgreSQL, permitindo estruturas flexíveis (arrays de strings, objetos com seções) compatíveis com os dados hardcoded do front-end em `index.js`.

**6. UUIDs gerados pelo banco**

Todos os identificadores são UUIDs gerados pelo Prisma (`@default(uuid())`), garantindo unicidade sem coordenação de aplicação (Req 3.7, Req 8.6).

**7. Integridade referencial**

`Evento.parqueId` e `Atividade.parqueId` são chaves estrangeiras para `Parque.id`, com índices para otimização de consultas por parque. Iso satisfaz Req 21.2.

**8. Enum `LocalEvento` no nível do banco**

O campo `local` em `Evento` usa o enum `LocalEvento` do Prisma, garantindo que apenas os três valores permitidos sejam persistidos, complementando a validação da camada de aplicação.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Required field validation rejects missing or empty fields

*For any* request body and *for any* set of required field names, the validation function SHALL return invalid if and only if at least one required field is absent, null, empty string, or whitespace-only, and SHALL list exactly the fields that are missing.

**Validates: Requirements 1.3, 3.6, 8.4**

### Property 2: Email format validation

*For any* string, the email validation function SHALL return true if and only if the string contains an "@" character with a non-empty local part and a non-empty domain part containing at least one dot.

**Validates: Requirements 1.6**

### Property 3: Date format validation

*For any* string, the date validation function SHALL return true if and only if the string matches the format YYYY-MM-DD and represents a valid calendar date.

**Validates: Requirements 20.2**

### Property 4: Time format validation

*For any* string, the time validation function SHALL return true if and only if the string matches the format HH:MM with hours in range 00–23 and minutes in range 00–59.

**Validates: Requirements 20.2**

### Property 5: Event date ordering validation

*For any* pair of date strings (data, dataTer) in valid YYYY-MM-DD format, the validation function SHALL reject the event if data is strictly greater than dataTer, and SHALL accept it if data is less than or equal to dataTer.

**Validates: Requirements 3.2, 5.3**

### Property 6: Event time ordering validation on same-day events

*For any* event where data equals dataTer, the validation function SHALL reject the event if horario is strictly greater than horarioTer, and SHALL accept it if horario is less than or equal to horarioTer. For events where data differs from dataTer, time ordering SHALL not be validated.

**Validates: Requirements 3.3**

### Property 7: Local enum validation

*For any* string, the local validation function SHALL return true if and only if the string is exactly one of "Serra_dos_Orgaos", "Tres_Picos", or "Montanhas_Teresopolis".

**Validates: Requirements 3.4**

### Property 8: Dificuldade enum validation

*For any* string, the dificuldade validation function SHALL return true if and only if the string is exactly one of "Fácil", "Médio", or "Difícil".

**Validates: Requirements 8.2, 10.3**

### Property 9: Tipo enum validation

*For any* string, the tipo validation function SHALL return true if and only if the string is exactly one of "Trilha", "Cachoeira", or "Escalada".

**Validates: Requirements 8.3, 10.4**

### Property 10: Disponibilidade atividade enum validation

*For any* string, the disponibilidade validation function SHALL return true if and only if the string is exactly "Aberto" or "Fechado".

**Validates: Requirements 12.6**

### Property 11: Numeric positivity validation for distancia and tempo

*For any* value provided for the distancia or tempo fields, if the value is a number type, the validation function SHALL reject it if it is negative; if the value is a string, the validation function SHALL reject it if it begins with a negative numeric prefix, and SHALL accept non-empty strings with non-negative leading values.

**Validates: Requirements 8.8**

### Property 12: Default disponibilidade assignment for activities

*For any* valid activity creation body that does not include the "disponibilidade" field, the system SHALL assign the default value "Aberto" to the disponibilidade field before persistence.

**Validates: Requirements 8.7**

### Property 13: Event availability filtering in public listings

*For any* set of events stored in the database, the public listing endpoint SHALL return only events with disponibilidade set to true, and SHALL return at most 100 events.

**Validates: Requirements 4.1, 4.4, 7.5**

### Property 14: Event park filtering in public listings

*For any* set of available events and *for any* park filter value, the public listing SHALL return only events whose local field matches the specified park filter, and SHALL return an empty list if no event matches.

**Validates: Requirements 4.2**

### Property 15: Event sorting invariant in public listings

*For any* set of available events returned by the public listing endpoint, the events SHALL be sorted by the data field in ascending order.

**Validates: Requirements 4.3**

### Property 16: Event serialization format for public listings

*For any* valid Evento model, the public serialization transformer SHALL produce a JSON object containing exactly the fields id, nome, data, dataTer, horario, horarioTer, local, and descricao, where local is one of the three front-end identifiers ("Serra_dos_Orgaos", "Tres_Picos", "Montanhas_Teresopolis"), and SHALL NOT include the disponibilidade field.

**Validates: Requirements 4.5, 22.1, 22.3**

### Property 17: Activity availability filtering in public listings

*For any* set of activities stored in the database, the public listing endpoint SHALL return only activities with disponibilidade set to "Aberto", and SHALL return at most 50 activities.

**Validates: Requirements 9.1, 9.6, 12.5**

### Property 18: Activity combined filtering in public listings

*For any* set of open activities and *for any* combination of filters (parque, dificuldade, tipo — each optionally provided), the public listing SHALL return only activities that satisfy all provided filters simultaneously, and SHALL return an empty list when no activity matches all filters.

**Validates: Requirements 9.2, 9.3, 9.4, 9.5, 9.9**

### Property 19: Activity serialization format for public listings

*For any* valid Atividade model with its associated Parque, the public serialization transformer SHALL produce a JSON object containing exactly the fields parque, nome, distancia, tempo, descricao, disponibilidade, imagens, dificuldade, and tipo, where parque is the full name of the associated Parque (e.g., "Parque Nacional da Serra dos Órgãos"), and SHALL NOT include the id field.

**Validates: Requirements 9.7, 22.2**

### Property 20: Park serialization format

*For any* valid Parque model, the serialization transformer SHALL produce a JSON object containing exactly the fields id, nome, horarios, regras, and areasConvivencia.

**Validates: Requirements 13.2, 13.5**

### Property 21: Park field validation with length constraint

*For any* park update body, the validation function SHALL reject the body if and only if at least one required field (nome, horarios, regras, areasConvivencia) is absent, empty, or exceeds 5000 characters, and SHALL list each invalid field with its specific reason.

**Validates: Requirements 14.3**

### Property 22: Password never exposed in API responses

*For any* API response produced by any endpoint (public or protected), the serialized JSON string SHALL NOT contain any key named "senha", "senhaHash", "password", or "hash".

**Validates: Requirements 18.2**

### Property 23: Event JSON round-trip

*For any* valid Evento model, serializing the event to its public JSON format and parsing the resulting JSON back SHALL produce an object equivalent to the expected front-end event structure (containing the same values for id, nome, data, dataTer, horario, horarioTer, local, and descricao).

**Validates: Requirements 22.4**

### Property 24: Activity JSON round-trip

*For any* valid Atividade model with its associated Parque, serializing the activity to its public JSON format and parsing the resulting JSON back SHALL produce an object equivalent to the expected front-end activity structure (containing the same values for parque, nome, distancia, tempo, descricao, disponibilidade, imagens, dificuldade, and tipo).

**Validates: Requirements 22.4**

## Error Handling

### Estratégia Centralizada

Todos os erros são tratados por um middleware `errorHandler` no final da cadeia de middlewares do Express. Os controllers lançam erros tipados que o middleware converte em respostas HTTP apropriadas.

### Classes de Erro

```javascript
class ValidationError extends Error     // → 400
class AuthError extends Error           // → 401
class ForbiddenError extends Error      // → 403
class NotFoundError extends Error       // → 404
class InternalError extends Error       // → 500
```

### Mapeamento de Códigos HTTP

| Situação | HTTP Code | Corpo da Resposta |
|---|---|---|
| Operação bem-sucedida (leitura) | 200 | JSON com dados |
| Criação bem-sucedida | 201 | JSON com entidade criada |
| Exclusão bem-sucedida | 204 | Sem corpo |
| Campos obrigatórios ausentes/vazios | 400 | `{ erro: string, campos: string[] }` |
| Formato de data/horário inválido | 400 | `{ erro: string, campos: string[] }` |
| Enum inválido (local, dificuldade, tipo, disponibilidade) | 400 | `{ erro: string, valoresPermitidos: string[] }` |
| Data de início posterior à data de término | 400 | `{ erro: string }` |
| Horário de início posterior ao horário de término (mesmo dia) | 400 | `{ erro: string }` |
| Distância ou tempo negativo/não numérico | 400 | `{ erro: string, campos: string[] }` |
| Campo excede 5000 caracteres (parque) | 400 | `{ erro: string, campos: string[], motivos: string[] }` |
| JSON malformado no corpo da requisição | 400 | `{ erro: string }` |
| Identificador com formato inválido (parque) | 400 | `{ erro: string }` |
| Token ausente | 401 | `{ erro: "Token de autenticação necessário" }` |
| Token inválido ou expirado | 401 | `{ erro: "Token inválido ou expirado" }` |
| Token na blacklist (após logout) | 401 | `{ erro: "Token invalidado" }` |
| Credenciais inválidas (login) | 401 | `{ erro: "E-mail ou senha inválidos" }` |
| Token válido mas usuário não é admin | 403 | `{ erro: "Acesso restrito a administradores" }` |
| Entidade não encontrada (evento, atividade, parque) | 404 | `{ erro: string }` |
| Erro interno do banco de dados | 500 | `{ erro: "Erro interno do servidor" }` |
| Erro não tratado | 500 | `{ erro: "Erro interno do servidor" }` |

### Tratamento de Erros do Prisma

O middleware `errorHandler` intercepta erros específicos do Prisma:
- `P2025` (registro não encontrado) → convertido para `NotFoundError` (404)
- `P2002` (violação de constraint única) → convertido para `ValidationError` (400)
- Outros códigos Prisma → `InternalError` (500)

### JSON Malformado

O middleware `jsonParser` envolve `express.json()` e captura erros de sintaxe JSON. Se o corpo da requisição contém JSON inválido, retorna imediatamente 400 com a mensagem `"JSON malformado no corpo da requisição"` antes de chegar aos controllers (Req 20.3).

### Propagação de Erros

Os controllers utilizam `try/catch` e repassam erros para `next(err)`, garantindo que o `errorHandler` centralizado processe todos os erros de forma consistente. Em ambiente de desenvolvimento, o stack trace é incluído na resposta para debug; em produção, é omitido.

## Testing Strategy

### Abordagem Dupla de Testes

A estratégia combina testes unitários (exemplos específicos e casos de borda) com testes property-based (propriedades universais) e testes de integração (end-to-end com banco de dados de teste).

### 1. Testes Property-Based (PBT)

**Biblioteca:** `fast-check` para Node.js, executado com `jest`.

**Configuração:**
- Mínimo de 100 iterações por teste property-based
- Cada teste deve referenciar a propriedade do design document via comentário
- Tag: `// Feature: tere-verde-backend, Property {N}: {descrição}`

**Arquivos de teste property-based:**

`test/property/validationProperties.test.js` — Propriedades 1-12:
- Property 1: Required field validation (gera bodies com campos aleatórios removidos/esvaziados)
- Property 2: Email format validation (gera strings aleatórias, verifica padrão @ + domínio)
- Property 3: Date format validation (gera strings aleatórias, verifica YYYY-MM-DD válido)
- Property 4: Time format validation (gera strings aleatórias, verifica HH:MM válido)
- Property 5: Event date ordering (gera pares de datas aleatórias, verifica start <= end)
- Property 6: Event time ordering on same day (gera eventos same-day com horários aleatórios)
- Property 7: Local enum validation (gera strings aleatórias, verifica os 3 valores)
- Property 8: Dificuldade enum validation (gera strings aleatórias, verifica os 3 valores)
- Property 9: Tipo enum validation (gera strings aleatórias, verifica os 3 valores)
- Property 10: Disponibilidade atividade enum validation (gera strings aleatórias, verifica 2 valores)
- Property 11: Numeric positivity (gera valores numéricos e strings com prefixos positivos/negativos)
- Property 12: Default disponibilidade (gera bodies de atividade sem o campo disponibilidade)

`test/property/filterProperties.test.js` — Propriedades 13-15, 17-18:
- Property 13: Event availability filtering (gera listas de eventos com disponibilidade aleatória)
- Property 14: Event park filtering (gera eventos com locais aleatórios, aplica filtro)
- Property 15: Event sorting invariant (gera listas de eventos, verifica ordem por data)
- Property 17: Activity availability filtering (gera listas de atividades com disponibilidade aleatória)
- Property 18: Activity combined filtering (gera atividades e combinações aleatórias de filtros)

`test/property/serializationProperties.test.js` — Propriedades 16, 19-24:
- Property 16: Event serialization format (gera modelos Evento aleatórios, verifica campos de saída)
- Property 19: Activity serialization format (gera modelos Atividade aleatórios com Parque, verifica campos)
- Property 20: Park serialization format (gera modelos Parque aleatórios, verifica campos)
- Property 21: Park field validation with length (gera bodies com campos de tamanho variável)
- Property 22: Password never exposed (gera respostas de API aleatórias, verifica ausência de senha)
- Property 23: Event JSON round-trip (gera eventos, serializa, parseia, verifica equivalência)
- Property 24: Activity JSON round-trip (gera atividades, serializa, parseia, verifica equivalência)

### 2. Testes Unitários (Exemplos e Casos de Borda)

`test/unit/` — Testes baseados em exemplos para casos específicos e casos de borda:

**Casos de borda cobertos pelos geradores do PBT (não requerem testes unitários separados):**
- Data com ano bissexto (29 de fevereiro)
- Horário limite 23:59 e 00:00
- Strings Unicode (acentos em "Fácil", "Médio")
- Strings vazias e apenas whitespace
- UUIDs válidos e inválidos

**Testes unitários focados em:**
- Exemplos específicos que demonstram comportamento correto (1-2 por endpoint)
- Pontos de integração entre componentes (controller → service → prisma com mocks)
- Casos de erro específicos com mensagens exatas

### 3. Testes de Integração

`test/integration/` — Testes end-to-end com banco de dados PostgreSQL de teste:

**Configuração:**
- Banco de dados de teste separado (DATABASE_URL_TEST)
- Setup: executar migrations + seed antes de cada suite
- Teardown: limpar tabelas após cada teste

**Suites de integração:**

`test/integration/auth.test.js`:
- Login com credenciais válidas → 200 + JWT
- Login com e-mail inexistente → 401
- Login com senha incorreta → 401
- Login com campos ausentes → 400
- Login com e-mail mal formatado → 400
- Logout com token válido → 200
- Logout sem token → 401
- Logout com token já invalidado → 401
- Uso de token invalidado em endpoint protegido → 401
- Verificar expiração do token configurável

`test/integration/eventos.test.js`:
- Criar evento válido → 201
- Criar evento com data de início > data de término → 400
- Criar evento com horário de início > horário de término (mesmo dia) → 400
- Criar evento com local inválido → 400
- Criar evento com campos ausentes → 400
- Criar evento sem token → 401
- Listar eventos públicos → 200, apenas disponíveis, ordenados
- Filtrar eventos por parque → 200, filtrados
- Editar evento (parcial) → 200, campos preservados
- Editar evento inexistente → 404
- Editar evento com data inválida → 400
- Deletar evento → 204
- Deletar evento inexistente → 404
- Toggle disponibilidade → 200
- Toggle disponibilidade de evento inexistente → 404

`test/integration/atividades.test.js`:
- Criar atividade válida → 201
- Criar atividade com dificuldade inválida → 400
- Criar atividade com tipo inválido → 400
- Criar atividade com campos ausentes → 400
- Criar atividade sem disponibilidade → 201, default "Aberto"
- Criar atividade com distancia negativa → 400
- Listar atividades públicas → 200, apenas "Aberto", máx. 50
- Filtrar atividades por parque, dificuldade, tipo (individual e combinado)
- Listar atividades com filtros sem resultado → 200, lista vazia
- Editar atividade → 200
- Editar atividade inexistente → 404
- Editar atividade com dificuldade/tipo inválido → 400
- Deletar atividade → 204
- Deletar atividade inexistente → 404
- Set disponibilidade "Aberto"/"Fechado" → 200
- Set disponibilidade com valor inválido → 400

`test/integration/parques.test.js`:
- Listar parques → 200
- Obter parque por ID → 200
- Obter parque inexistente → 404
- Obter parque com ID inválido → 400
- Editar parque com dados válidos → 200
- Editar parque inexistente → 404
- Editar parque com campos ausentes → 400
- Editar parque com campo > 5000 caracteres → 400
- Editar parque sem token → 401

`test/integration/seed.test.js` (smoke tests):
- Executar seed → admin, 3 parques, eventos e atividades criados
- Executar seed duas vezes → sem duplicação
- Admin do seed consegue fazer login → 200 + JWT
- Eventos do seed têm disponibilidade ativa
- Atividades do seed têm disponibilidade "Aberto"
- Senha do admin é hash bcrypt (não texto puro)

`test/integration/security.test.js`:
- Endpoint protegido sem token → 401
- Endpoint protegido com token inválido → 401
- Endpoint protegido com token expirado → 401
- Endpoints públicos sem token → 200
- Resposta de qualquer endpoint não contém senha
- HTTPS em produção (verificação de configuração)
- HTTP em desenvolvimento

### 4. Cobertura de Testes

**Camada de validação (PBT):** As funções puras de validação no `validationService` são testadas exhaustivamente com property-based tests, cobrindo o espaço de entrada com randomização.

**Camada de serialização (PBT):** Os transformadores são testados com property-based tests para formato e round-trip.

**Camada de controllers (Integração):** Os fluxos completos de cada endpoint são testados com integração, cobrindo cenários de sucesso e erro.

**Camada de middlewares (Integração):** Auth, admin guard e error handler são testados via integração.

**Camada de persistência (Integração + Smoke):** Prisma operations e seed scripts são testados com banco de dados de teste.

### 5. Execução dos Testes

```bash
# Todos os testes
npm test

# Apenas testes unitários e property-based
npm run test:unit

# Apenas testes de integração (requer banco de teste rodando)
npm run test:integration

# Testes property-based com verbose output
npm run test:property -- --verbose
```

### Decisão: PBT É Aplicável

PBT é aplicável a este projeto porque o back-end contém:
- **Funções puras de validação** (formato de data/horário, enums, campos obrigatórios, positividade numérica) que variam com a entrada
- **Lógica de filtragem** (disponibilidade, parque, dificuldade, tipo) que é computável e testável universalmente
- **Transformadores de serialização** com propriedades de round-trip e formato bem definidas

PBT NÃO é aplicável para:
- Operações de banco de dados (testadas via integração)
- Geração/verificação de JWT (biblioteca externa, testada via integração)
- Hashing bcrypt (biblioteca externa, testada via integração)
- Configuração de seed e HTTPS (testados via smoke tests)
- Desempenho e organização de código (verificados via testes específicos ou revisão)
