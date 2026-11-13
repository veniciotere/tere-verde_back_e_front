# 🌿 Terê Verde

**Terê Verde** é uma aplicação web desenvolvida com o objetivo de divulgar parques, atividades e eventos disponíveis em Teresópolis – RJ, facilitando o acesso da população e dos visitantes às informações sobre lazer, turismo e contato com a natureza.

## 🎯 Objetivo do projeto

Desenvolver uma plataforma que centralize informações sobre parques, atividades e eventos de Teresópolis, oferecendo uma interface acessível ao público e uma área administrativa para gerenciamento dos conteúdos.

## 🚀 Funcionalidades e requisitos funcionais

| Código | Requisito | Situação |
|---|---|---|
| RF01 | Autenticação de administrador | Concluído e testado |
| RF02 | Logout do administrador | Pendente |
| RF03 | Cadastro de eventos | Concluído e testado |
| RF04 | Consulta pública de eventos | Concluído e testado |
| RF05 | Edição de eventos | Pendente |
| RF06 | Exclusão de eventos | Concluído e testado |
| RF07 | Controle de visibilidade dos eventos | Implementado, aguardando teste |
| RF08 | Cadastro de atividades | Pendente |
| RF09 | Consulta pública de atividades | Concluído e testado |
| RF10 | Edição de atividades | Pendente |
| RF11 | Exclusão de atividades | Pendente |
| RF12 | Controle de disponibilidade das atividades | Pendente |
| RF13 | Consulta de parques | Integrado |
| RF14 | Atualização das informações dos parques | Pendente |

*As situações serão atualizadas conforme a implementação e validação dos requisitos.*

## 🛠️ Tecnologias utilizadas

### Front-End
- HTML5
- CSS3
- JavaScript

### Back-End
- Node.js
- Express
- PostgreSQL
- JSON Web Token (JWT)
- bcrypt
- CORS

### Ferramentas
- Git
- GitHub
- Visual Studio Code
- Postman

## 📁 Estrutura do projeto

```text
tere-verde_back_e_front/
│
├── Tere-verde-main/       # Front-End
│
├── tere-verde-backend/    # Back-End
│
└── README.md
```

## ⚙️ Pré-requisitos

Para executar o projeto localmente, é necessário ter instalado:

- Node.js
- PostgreSQL
- Git

## 💻 Como executar o projeto

### 1. Clonar o repositório

```bash
git clone URL_DO_REPOSITORIO
```

### 2. Acessar a pasta do Back-End

```bash
cd tere-verde_back_e_front/tere-verde-backend
```

### 3. Instalar as dependências

```bash
npm install
```

### 4. Configurar o banco de dados

Crie um banco de dados PostgreSQL e configure as variáveis de ambiente no arquivo `.env`, conforme o modelo `.env.example`, caso disponível.

O script de estrutura do banco está localizado em:

```text
tere-verde-backend/data/schema.sql
```

### 5. Executar o servidor

Consulte os comandos disponíveis no `package.json` do Back-End para iniciar a API.

## 📌 Status do projeto

**Em desenvolvimento.**

O projeto está passando pelas etapas de implementação, integração entre Front-End e Back-End e testes das funcionalidades.

## 👨‍🎓 Desenvolvedor

**Marcos Vinicios Marques da Silva**

- Matrícula: 01019051
- Curso: Análise e Desenvolvimento de Sistemas (ADS)

---

🌱 **Terê Verde — Conectando pessoas à natureza de Teresópolis.**
