# Requirements Document

## Introduction

Este documento define os requisitos do back-end MVP do projeto Circuito Terê Verde ("Terê Verde Online"). O back-end é uma API REST desenvolvida em Node.js + Express, com PostgreSQL como banco de dados e Prisma como ORM, que substitui os dados hoje hardcoded e armazenados no localStorage do front-end existente (HTML/CSS/JavaScript puro).

O MVP permite que administradores autenticados cadastrem, consultem, editem, excluam e controlem a disponibilidade de eventos e atividades dos três parques do Circuito Terê Verde. Visitantes acessam informações públicas atualizadas servidas pelo servidor, sem necessidade de autenticação. A API é stateless e desacoplada do front-end web, preparando-se para a integração com o aplicativo mobile previsto para o próximo semestre.

## Glossary

- **API_Terê_Verde**: A aplicação back-end REST, desenvolvida em Node.js + Express, que serve os dados do Circuito Terê Verde.
- **Administrador**: Usuário autenticado via token JWT com permissão para criar, editar, excluir e controlar a disponibilidade de eventos, atividades e parques.
- **Visitante**: Usuário não autenticado que consome apenas os endpoints públicos de leitura da API_Terê_Verde.
- **Token**: Token JWT (JSON Web Token) emitido pela API_Terê_Verde após autenticação bem-sucedida, usado para autorizar endpoints protegidos.
- **Endpoint_Protegido**: Endpoint da API_Terê_Verde que exige um Token válido para ser acessado (operações de escrita e gerenciamento).
- **Endpoint_Público**: Endpoint da API_Terê_Verde acessível sem autenticação (operações de leitura para visitantes).
- **Evento**: Entidade que representa um acontecimento do Circuito Terê Verde, com nome, data de início, data de término, horário de início, horário de término, parque associado, descrição e status de disponibilidade.
- **Atividade**: Entidade que representa uma trilha, cachoeira ou escalada dentro de um parque, com nome, parque, distância, tempo estimado, dificuldade, tipo, descrição, caminho de imagem e disponibilidade.
- **Parque**: Entidade que representa uma unidade de conservação do Circuito Terê Verde, com nome, horários de funcionamento, regras de conduta e áreas de convivência disponíveis. Os parques existentes são: Parque Nacional da Serra dos Órgãos, Parque Estadual dos Três Picos e Parque Natural Municipal Montanhas de Teresópolis.
- **Disponibilidade**: Atributo booleano que controla se um Evento ou Atividade é visível para Visitantes. Quando ativo (true), o item aparece nas listagens públicas; quando inativo (false), o item fica oculto.
- **Disponibilidade_Atividade**: Atributo de uma Atividade com valores "Aberto" ou "Fechado", controlando se a atividade é exibida para Visitantes.
- **Dificuldade**: Classificação do nível de exigência de uma Atividade, com valores fixos: "Fácil", "Médio" ou "Difícil".
- **Tipo**: Classificação da categoria de uma Atividade, com valores fixos: "Trilha", "Cachoeira" ou "Escalada".
- **Local_Evento**: Identificador do parque associado a um Evento, com valores fixos: "Serra_dos_Orgaos", "Tres_Picos" ou "Montanhas_Teresopolis".
- **Prisma**: ORM (Object-Relational Mapping) utilizado para mapear as entidades do domínio às tabelas do PostgreSQL.
- **PostgreSQL**: Sistema de gerenciamento de banco de dados relacional onde os dados são persistidos, substituindo o localStorage do front-end.
- **bcrypt**: Biblioteca de hash de senhas utilizada para armazenar as credenciais do Administrador de forma segura.
- **JSON_Resposta**: Documento JSON retornado pela API_Terê_Verde em cada requisição, compatível com a estrutura de dados já utilizada pelo front-end.
- **Seed**: Script de inicialização que popula o banco de dados com dados padrão (Administrador inicial, eventos, atividades e parques).
- **Áreas_Convivência**: Conjunto de áreas disponíveis em um Parque, que pode incluir: estacionamento, camping, cachoeira, trilha e escalada.

## Requirements

### Requirement 1: Autenticação de Administrador

**User Story:** Como administrador, quero realizar login com e-mail e senha, para receber um Token que autorize o acesso aos endpoints protegidos.

#### Acceptance Criteria

1. WHEN um Administrador envia e-mail correspondente a um Administrador cadastrado e senha que corresponde ao hash bcrypt armazenado, THE API_Terê_Verde SHALL retornar um Token JWT assinado e status HTTP 200
2. WHEN um Administrador envia e-mail não cadastrado ou senha que não corresponde ao hash bcrypt do Administrador encontrado, THE API_Terê_Verde SHALL retornar status HTTP 401 com mensagem indicando falha de autenticação
3. WHEN e-mail ou senha estão ausentes, nulos ou como string vazia no corpo da requisição, THE API_Terê_Verde SHALL retornar status HTTP 400 com uma mensagem indicando quais campos são obrigatórios
4. WHEN um Administrador realiza login com sucesso, THE API_Terê_Verde SHALL gerar o Token com prazo de expiração de 3600 segundos, configurável via variável de ambiente
5. THE API_Terê_Verde SHALL armazenar a senha do Administrador utilizando hash bcrypt, sem persistir senha em texto puro
6. IF o e-mail informado está presente mas possui formato inválido (sem "@" ou sem domínio), THEN THE API_Terê_Verde SHALL retornar status HTTP 400 com mensagem indicando que o formato do e-mail é inválido

### Requirement 2: Logout de Administrador

**User Story:** Como administrador, quero encerrar minha sessão, para invalidar meu Token e impedir seu uso posterior.

#### Acceptance Criteria

1. WHEN um Administrador autenticado solicita logout, THE API_Terê_Verde SHALL invalidar o Token atual e retornar status HTTP 200
2. WHEN um Token invalidado por logout é utilizado em uma requisição a um Endpoint_Protegido, THE API_Terê_Verde SHALL retornar status HTTP 401
3. WHILE o Token está invalidado, THE API_Terê_Verde SHALL rejeitar qualquer requisição a Endpoints_Protegidos que o utilize, retornando status HTTP 401
4. IF um logout é solicitado sem um Token válido, THEN THE API_Terê_Verde SHALL retornar status HTTP 401 indicando que a autenticação é necessária e não invalidar nenhum Token
5. IF um logout é solicitado com um Token que já está invalidado, THEN THE API_Terê_Verde SHALL retornar status HTTP 401 indicando que o Token já é inválido

### Requirement 3: Cadastro de Evento

**User Story:** Como administrador, quero cadastrar um novo evento informando nome, datas, horários, parque e descrição, para que ele seja exibido aos visitantes.

#### Acceptance Criteria

1. WHEN um Administrador autenticado envia todos os campos obrigatórios com valores não vazios e datas/horários em formato válido, THE API_Terê_Verde SHALL persistir o Evento no PostgreSQL e retornar o Evento criado com status HTTP 201
2. IF a data de início do Evento é posterior à data de término, THEN THE API_Terê_Verde SHALL retornar status HTTP 400 com mensagem indicando que a data de início não pode ser posterior à data de término, sem persistir o Evento
3. IF o horário de início é posterior ao horário de término em um Evento cuja data de início é igual à data de término, THEN THE API_Terê_Verde SHALL retornar status HTTP 400 com mensagem indicando que o horário de início não pode ser posterior ao horário de término no mesmo dia, sem persistir o Evento
4. IF o campo "local" informado não corresponde a "Serra_dos_Orgaos", "Tres_Picos" ou "Montanhas_Teresopolis", THEN THE API_Terê_Verde SHALL retornar status HTTP 400 com mensagem listando os valores permitidos
5. WHILE o solicitante não possui um Token válido, THE API_Terê_Verde SHALL retornar status HTTP 401
6. IF um ou mais campos obrigatórios (nome, data, dataTer, horario, horarioTer, local, descricao) estão ausentes ou vazios, THEN THE API_Terê_Verde SHALL retornar status HTTP 400 listando os campos faltantes
7. WHEN um Evento é cadastrado com sucesso, THE API_Terê_Verde SHALL gerar um identificador único (UUID) para o Evento no momento do cadastro

### Requirement 4: Listagem de Eventos para Visitantes

**User Story:** Como visitante, quero consultar a lista de eventos disponíveis, para me informar sobre os acontecimentos do Circuito Terê Verde.

#### Acceptance Criteria

1. THE API_Terê_Verde SHALL disponibilizar um Endpoint_Público que retorne no máximo 100 Eventos com Disponibilidade ativa, retornando uma lista vazia quando nenhum Evento possuir Disponibilidade ativa
2. IF o parâmetro de filtro por parque é informado, THEN THE API_Terê_Verde SHALL retornar apenas os Eventos cujo Local_Evento corresponde ao parque informado, retornando uma lista vazia quando nenhum Evento corresponder ao parque informado
3. THE API_Terê_Verde SHALL retornar os Eventos ordenados pela data de início em ordem crescente
4. WHILE a Disponibilidade de um Evento está inativa, THE API_Terê_Verde SHALL omitir esse Evento das listagens públicas
5. THE API_Terê_Verde SHALL retornar os Eventos no formato JSON_Resposta com os campos id, nome, data, dataTer, horario, horarioTer, local e descricao, onde os campos de data seguem o formato YYYY-MM-DD e os campos de horário seguem o formato HH:MM

### Requirement 5: Edição de Evento

**User Story:** Como administrador, quero editar os dados de um evento existente, para manter as informações atualizadas.

#### Acceptance Criteria

1. WHEN um Administrador autenticado envia ao menos um campo com valor válido para um Evento existente, THE API_Terê_Verde SHALL atualizar apenas os campos informados no PostgreSQL, preservando os campos não informados, e retornar o Evento atualizado com status HTTP 200
2. IF o identificador do Evento informado não existe no banco de dados, THEN THE API_Terê_Verde SHALL retornar status HTTP 404 com mensagem indicando que o Evento não foi encontrado
3. IF a data de início atualizada é posterior à data de término, THEN THE API_Terê_Verde SHALL retornar status HTTP 400 com mensagem indicando que a data de início não pode ser posterior à data de término, sem alterar o Evento
4. WHILE o solicitante não possui um Token válido, THE API_Terê_Verde SHALL retornar status HTTP 401
5. IF o corpo da requisição está vazio ou contém apenas campos inválidos, THEN THE API_Terê_Verde SHALL retornar status HTTP 400 com mensagem indicando quais campos são inválidos, sem alterar o Evento

### Requirement 6: Exclusão de Evento

**User Story:** Como administrador, quero excluir um evento cadastrado, para remover informações que não são mais relevantes.

#### Acceptance Criteria

1. WHEN um Administrador autenticado solicita a exclusão de um Evento existente, THE API_Terê_Verde SHALL remover o Evento do PostgreSQL e retornar status HTTP 204
2. IF o identificador do Evento informado não existe, THEN THE API_Terê_Verde SHALL retornar status HTTP 404 com mensagem indicando que o Evento não foi encontrado
3. WHILE o solicitante não possui um Token válido, THE API_Terê_Verde SHALL retornar status HTTP 401
4. IF o solicitante possui um Token válido mas não possui privilégios de Administrador, THEN THE API_Terê_Verde SHALL retornar status HTTP 403

### Requirement 7: Controle de Disponibilidade de Evento

**User Story:** Como administrador, quero ativar ou desativar a visibilidade de um evento, para controlar se ele aparece para os visitantes.

#### Acceptance Criteria

1. WHEN um Administrador autenticado ativa a Disponibilidade de um Evento, THE API_Terê_Verde SHALL marcar a Disponibilidade como ativa e retornar status HTTP 200
2. WHEN um Administrador autenticado desativa a Disponibilidade de um Evento, THE API_Terê_Verde SHALL marcar a Disponibilidade como inativa e retornar status HTTP 200
3. IF o identificador do Evento não existe, THEN THE API_Terê_Verde SHALL retornar status HTTP 404 com mensagem indicando que o Evento não foi encontrado
4. WHILE o solicitante não possui um Token válido (ausente, expirado ou inválido), THE API_Terê_Verde SHALL retornar status HTTP 401
5. WHILE um Evento tem Disponibilidade desativada, THE API_Terê_Verde SHALL omitir esse Evento das listagens de Eventos acessíveis a Visitantes
6. IF o solicitante possui um Token válido mas não possui perfil de Administrador, THEN THE API_Terê_Verde SHALL rejeitar a solicitação retornando status HTTP 403

### Requirement 8: Cadastro de Atividade

**User Story:** Como administrador, quero cadastrar uma atividade (trilha, cachoeira ou escalada) informando seus dados, para que os visitantes possam consultá-la.

#### Acceptance Criteria

1. WHEN um Administrador autenticado envia dados válidos de uma Atividade, THE API_Terê_Verde SHALL persistir a Atividade no PostgreSQL e retornar a Atividade criada com status HTTP 201
2. IF o campo "dificuldade" informado não corresponde a "Fácil", "Médio" ou "Difícil", THEN THE API_Terê_Verde SHALL retornar status HTTP 400 com mensagem indicando os valores permitidos
3. IF o campo "tipo" informado não corresponde a "Trilha", "Cachoeira" ou "Escalada", THEN THE API_Terê_Verde SHALL retornar status HTTP 400 com mensagem indicando os valores permitidos
4. IF um ou mais campos obrigatórios (nome, parque, distancia, tempo, descricao, dificuldade, tipo) estão ausentes, THEN THE API_Terê_Verde SHALL retornar status HTTP 400 listando os campos faltantes
5. WHILE o solicitante não possui um Token válido, THE API_Terê_Verde SHALL retornar status HTTP 401
6. WHEN uma Atividade é cadastrada com sucesso, THE API_Terê_Verde SHALL gerar um identificador único para a Atividade no momento do cadastro
7. IF o campo "disponibilidade" não for informado no cadastro, THEN THE API_Terê_Verde SHALL atribuir o valor padrão "Aberto" à Disponibilidade_Atividade
8. IF os campos "distancia" ou "tempo" contiverem valores negativos ou não numéricos onde um número é esperado, THEN THE API_Terê_Verde SHALL retornar status HTTP 400 com mensagem indicando que os valores devem ser positivos

### Requirement 9: Listagem de Atividades para Visitantes

**User Story:** Como visitante, quero consultar a lista de atividades com filtros, para encontrar atividades adequadas ao meu interesse e nível.

#### Acceptance Criteria

1. THE API_Terê_Verde SHALL disponibilizar um Endpoint_Público que retorne no máximo 50 Atividades com Disponibilidade_Atividade igual a "Aberto"
2. WHERE o parâmetro de filtro por parque é informado, THE API_Terê_Verde SHALL retornar apenas as Atividades cujo parque corresponde ao valor informado
3. WHERE o parâmetro de filtro por dificuldade é informado, THE API_Terê_Verde SHALL retornar apenas as Atividades cuja Dificuldade corresponde ao valor informado
4. WHERE o parâmetro de filtro por tipo é informado, THE API_Terê_Verde SHALL retornar apenas as Atividades cujo Tipo corresponde ao valor informado
5. THE API_Terê_Verde SHALL permitir a combinação simultânea dos filtros de parque, dificuldade e tipo, retornando apenas as Atividades que satisfizerem todos os filtros informados
6. WHILE a Disponibilidade_Atividade de uma Atividade é "Fechado", THE API_Terê_Verde SHALL omitir essa Atividade das listagens públicas
7. THE API_Terê_Verde SHALL retornar as Atividades no formato JSON_Resposta contendo os campos parque, nome, distancia, tempo, descricao, disponibilidade, imagens, dificuldade e tipo
8. WHERE nenhum filtro é informado, THE API_Terê_Verde SHALL retornar no máximo 50 Atividades com Disponibilidade_Atividade igual a "Aberto"
9. IF nenhuma Atividade corresponder aos filtros informados, THEN THE API_Terê_Verde SHALL retornar uma lista vazia com status HTTP 200

### Requirement 10: Edição de Atividade

**User Story:** Como administrador, quero editar os dados de uma atividade existente, para manter as informações atualizadas.

#### Acceptance Criteria

1. WHEN um Administrador autenticado envia dados conformes às regras de validação definidas para o cadastro de Atividade para uma Atividade existente, THE API_Terê_Verde SHALL atualizar a Atividade no PostgreSQL e retornar a Atividade atualizada com status HTTP 200
2. IF o identificador da Atividade informado não existe no banco de dados, THEN THE API_Terê_Verde SHALL retornar status HTTP 404 com mensagem indicando que a Atividade não foi encontrada
3. IF o campo "dificuldade" atualizado não corresponde a um valor permitido do modelo de dados de Atividade, THEN THE API_Terê_Verde SHALL retornar status HTTP 400 com mensagem indicando os valores permitidos
4. IF o campo "tipo" atualizado não corresponde a um valor permitido do modelo de dados de Atividade, THEN THE API_Terê_Verde SHALL retornar status HTTP 400 com mensagem indicando os valores permitidos
5. WHILE o solicitante não possui um Token válido, THE API_Terê_Verde SHALL retornar status HTTP 401
6. IF a operação de atualização no banco de dados falhar após validação, THEN THE API_Terê_Verde SHALL retornar status HTTP 500 com mensagem indicando erro interno e preservar os dados originais da Atividade

### Requirement 11: Exclusão de Atividade

**User Story:** Como administrador, quero excluir uma atividade cadastrada, para remover informações que não são mais relevantes.

#### Acceptance Criteria

1. WHEN um Administrador autenticado solicita a exclusão de uma Atividade existente, THE API_Terê_Verde SHALL remover a Atividade do PostgreSQL e retornar status HTTP 204
2. IF o identificador da Atividade informado não existe, THEN THE API_Terê_Verde SHALL retornar status HTTP 404 com mensagem indicando que a Atividade informada não foi encontrada
3. WHILE o solicitante não possui um Token válido, THE API_Terê_Verde SHALL retornar status HTTP 401
4. IF o solicitante possui um Token válido mas não é Administrador, THEN THE API_Terê_Verde SHALL retornar status HTTP 403

### Requirement 12: Controle de Disponibilidade de Atividade

**User Story:** Como administrador, quero marcar uma atividade como aberta ou fechada, para controlar se ela é exibida para os visitantes.

#### Acceptance Criteria

1. WHEN um Administrador autenticado define a Disponibilidade_Atividade como "Aberto", THE API_Terê_Verde SHALL atualizar o status da Atividade e retornar status HTTP 200 contendo o status atualizado
2. WHEN um Administrador autenticado define a Disponibilidade_Atividade como "Fechado", THE API_Terê_Verde SHALL atualizar o status da Atividade e retornar status HTTP 200 contendo o status atualizado
3. IF o identificador da Atividade não existe, THEN THE API_Terê_Verde SHALL retornar status HTTP 404 com mensagem indicando que a Atividade não foi encontrada
4. WHILE o solicitante não possui um Token válido, THE API_Terê_Verde SHALL retornar status HTTP 401
5. WHILE uma Atividade tem Disponibilidade_Atividade definida como "Fechado", THE API_Terê_Verde SHALL omitir essa Atividade das listagens públicas para Visitantes
6. IF um Administrador autenticado fornece um valor de Disponibilidade_Atividade diferente de "Aberto" ou "Fechado", THEN THE API_Terê_Verde SHALL retornar status HTTP 400 com mensagem indicando que o valor fornecido é inválido e não alterar o status atual da Atividade

### Requirement 13: Listagem de Informações dos Parques

**User Story:** Como visitante, quero consultar as informações de cada parque (horários, regras e áreas de convivência), para me planejar antes da visita.

#### Acceptance Criteria

1. THE API_Terê_Verde SHALL disponibilizar um Endpoint_Público que retorne as informações de todos os Parques cadastrados, retornando uma lista vazia quando nenhum Parque estiver cadastrado
2. THE API_Terê_Verde SHALL retornar, para cada Parque, os campos: nome, horários de funcionamento, regras de conduta e Áreas_Convivência disponíveis
3. WHERE o parâmetro identificador de um Parque específico é informado, THE API_Terê_Verde SHALL retornar apenas as informações daquele Parque
4. IF o identificador do Parque informado não existe, THEN THE API_Terê_Verde SHALL retornar status HTTP 404 com mensagem indicando que o Parque não foi encontrado
5. THE API_Terê_Verde SHALL retornar os dados dos Parques no formato JSON_Resposta compatível com a estrutura esperada pelo front-end
6. IF o identificador do Parque informado possui formato inválido, THEN THE API_Terê_Verde SHALL retornar status HTTP 400 com mensagem indicando que o identificador é inválido

### Requirement 14: Edição de Informações do Parque

**User Story:** Como administrador, quero atualizar os dados de um parque (horários, regras e áreas de convivência), para manter as informações corretas.

#### Acceptance Criteria

1. WHEN um Administrador autenticado envia dados com todos os campos obrigatórios (nome, horários de funcionamento, regras de conduta, áreas de convivência) preenchidos com valores não vazios e cada campo não excedendo 5000 caracteres, THE API_Terê_Verde SHALL atualizar o Parque correspondente no PostgreSQL e retornar o Parque atualizado com status HTTP 200
2. IF o identificador do Parque informado não corresponde a um Parque existente no PostgreSQL, THEN THE API_Terê_Verde SHALL retornar status HTTP 404 com mensagem indicando que nenhum Parque foi encontrado para o identificador informado
3. IF um ou mais campos obrigatórios (nome, horários de funcionamento, regras de conduta, áreas de convivência) estão ausentes, vazios ou excedem 5000 caracteres, THEN THE API_Terê_Verde SHALL retornar status HTTP 400 listando cada campo inválido com o motivo da falha e não alterar os dados existentes do Parque
4. WHILE o solicitante não possui um Token válido, THE API_Terê_Verde SHALL retornar status HTTP 401 e não alterar os dados do Parque
5. IF a atualização no PostgreSQL falhar após a validação dos dados, THEN THE API_Terê_Verde SHALL retornar status HTTP 500 com mensagem indicando erro interno e preservar os dados originais do Parque

### Requirement 15: Seed de Administrador Inicial

**User Story:** Como desenvolvedor, quero um script de seed que cadastre um administrador padrão, para permitir o primeiro acesso ao sistema.

#### Acceptance Criteria

1. WHEN o script de Seed é executado, THE API_Terê_Verde SHALL cadastrar um Administrador padrão no PostgreSQL com e-mail e senha definidos em configuração
2. THE API_Terê_Verde SHALL armazenar a senha do Administrador padrão utilizando hash bcrypt, sem persistir senha em texto puro
3. WHEN o Administrador padrão já existe no banco de dados, THE API_Terê_Verde SHALL não duplicar o cadastro e manter o registro existente
4. WHEN o Administrador padrão recém-criado realiza login com as credenciais do Seed, THE API_Terê_Verde SHALL retornar um Token válido

### Requirement 16: Seed de Dados Iniciais

**User Story:** Como desenvolvedor, quero um script de seed que popule o banco com os eventos, atividades e parques existentes no front-end, para iniciar o sistema com dados consistentes.

#### Acceptance Criteria

1. WHEN o script de Seed é executado, THE API_Terê_Verde SHALL cadastrar os três Parques existentes com seus respectivos horários de funcionamento, regras de conduta e Áreas_Convivência
2. WHEN o script de Seed é executado, THE API_Terê_Verde SHALL cadastrar os Eventos padrão atualmente definidos no front-end (event.js), preservando nome, datas, horários, local e descrição
3. WHEN o script de Seed é executado, THE API_Terê_Verde SHALL cadastrar as Atividades padrão atualmente definidas no front-end (atividades.js), preservando parque, nome, distância, tempo, descrição, disponibilidade, imagem, dificuldade e tipo
4. WHEN os dados de Seed já existem no banco de dados, THE API_Terê_Verde SHALL evitar duplicação, mantendo os registros existentes ou atualizando-os conforme definição de configuração
5. THE API_Terê_Verde SHALL atribuir Disponibilidade ativa a todos os Eventos e Disponibilidade_Atividade "Aberto" a todas as Atividades inseridos pelo Seed

### Requirement 17: Desempenho da API

**User Story:** Como usuário da API, quero respostas rápidas, para ter uma boa experiência de uso.

#### Acceptance Criteria

1. THE API_Terê_Verde SHALL responder às requisições dos Endpoints_Públicos em até 500 milissegundos sob carga normal de operação
2. THE API_Terê_Verde SHALL responder às requisições dos Endpoints_Protegidos em até 500 milissegundos sob carga normal de operação

### Requirement 18: Segurança de Autenticação

**User Story:** Como administrador, quero minha senha protegida, para que credenciais não sejam expostas em caso de comprometimento do banco de dados.

#### Acceptance Criteria

1. THE API_Terê_Verde SHALL armazenar todas as senhas de Administrador utilizando hash bcrypt com custo adequado
2. THE API_Terê_Verde SHALL nunca retornar o campo de senha (em texto puro ou em hash) em qualquer resposta de Endpoint_Protegido ou Endpoint_Público

### Requirement 19: Autorização por Token

**User Story:** Como desenvolvedor, quero endpoints de escrita protegidos e endpoints de leitura públicos, para garantir que apenas Administradores autenticados alterem dados.

#### Acceptance Criteria

1. WHILE uma requisição a um Endpoint_Protegido não inclui um Token, THE API_Terê_Verde SHALL retornar status HTTP 401
2. WHILE uma requisição a um Endpoint_Protegido inclui um Token inválido ou expirado, THE API_Terê_Verde SHALL retornar status HTTP 401
3. THE API_Terê_Verde SHALL permitir acesso aos Endpoints_Públicos sem exigir um Token
4. WHEN um Visitante acessa um Endpoint_Protegido, THE API_Terê_Verde SHALL retornar status HTTP 401

### Requirement 20: Validação de Dados

**User Story:** Como desenvolvedor, quero validação de todos os dados recebidos pela API, para garantir integridade e retornar erros claros.

#### Acceptance Criteria

1. WHEN a API_Terê_Verde recebe dados inválidos em qualquer Endpoint_Protegido, THE API_Terê_Verde SHALL retornar status HTTP 400 com mensagem indicando os campos inválidos
2. THE API_Terê_Verde SHALL validar o formato de datas (YYYY-MM-DD) e horários (HH:MM) em todos os campos de data e horário de Evento
3. IF o corpo da requisição contém JSON malformado, THE API_Terê_Verde SHALL retornar status HTTP 400 com mensagem descritiva
4. THE API_Terê_Verde SHALL utilizar códigos HTTP adequados para cada situação: 200 para sucesso, 201 para criação, 204 para exclusão, 400 para erro de validação, 401 para não autorizado, 404 para não encontrado e 500 para erro interno

### Requirement 21: Persistência de Dados

**User Story:** Como desenvolvedor, quero os dados armazenados em PostgreSQL, para substituir o localStorage do front-end por uma fonte de dados centralizada e confiável.

#### Acceptance Criteria

1. THE API_Terê_Verde SHALL persistir todos os dados de Administrador, Evento, Atividade e Parque no PostgreSQL utilizando Prisma como ORM
2. THE API_Terê_Verde SHALL manter a integridade referencial entre Parques, Eventos e Atividades no PostgreSQL

### Requirement 22: Compatibilidade com o Front-End

**User Story:** Como desenvolvedor, quero a API retorne JSON compatível com a estrutura do front-end, para permitir a integração sem reescrever o front-end existente.

#### Acceptance Criteria

1. THE API_Terê_Verde SHALL retornar os Eventos no formato JSON com os campos id, nome, data, dataTer, horario, horarioTer, local e descricao, compatível com a estrutura utilizada em event.js
2. THE API_Terê_Verde SHALL retornar as Atividades no formato JSON com os campos parque, nome, distancia, tempo, descricao, disponibilidade, imagens, dificuldade e tipo, compatível com a estrutura utilizada em atividades.js
3. THE API_Terê_Verde SHALL mapear o campo "local" dos Eventos para os mesmos identificadores utilizados pelo front-end ("Serra_dos_Orgaos", "Tres_Picos", "Montanhas_Teresopolis")
4. FOR ALL Eventos e Atividades retornados pela API, parsear o JSON de resposta e verificar campos SHALL produzir um objeto equivalente ao esperado pelo front-end (propriedade de ida e volta)

### Requirement 23: Preparação para Mobile

**User Story:** Como desenvolvedor, quero a API stateless e desacoplada do front-end, para permitir a integração com o app mobile do próximo semestre.

#### Acceptance Criteria

1. THE API_Terê_Verde SHALL ser stateless, sem armazenar estado de sessão no servidor entre requisições
2. THE API_Terê_Verde SHALL não acoplar lógica de apresentação ou estrutura específica do front-end web nas respostas dos endpoints

### Requirement 24: Organização do Código e Versionamento

**User Story:** Como desenvolvedor, quero o código organizado e versionado no GitHub, para facilitar a manutenção e colaboração.

#### Acceptance Criteria

1. THE API_Terê_Verde SHALL organizar o código-fonte em uma estrutura de pastas contendo os diretórios src/ (código-fonte), test/ (testes) e data/ (dados e scripts de seed)
2. THE API_Terê_Verde SHALL incluir um arquivo README.md informativo no repositório, contendo instruções de instalação, configuração e execução
3. THE API_Terê_Verde SHALL ter o código versionado no GitHub com histórico de commits

### Requirement 25: HTTPS em Produção

**User Story:** Como administrador, quero a comunicação protegida em produção, para evitar interceptação de dados sensíveis como credenciais.

#### Acceptance Criteria

1. WHILE a API_Terê_Verde está em ambiente de produção, THE API_Terê_Verde SHALL servir as requisições sobre HTTPS
2. WHILE a API_Terê_Verde está em ambiente de desenvolvimento, THE API_Terê_Verde SHALL permitir comunicação sobre HTTP para facilitar testes locais
