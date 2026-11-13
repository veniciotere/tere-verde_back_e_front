
require('dotenv').config();

const bcrypt = require('bcrypt');
const readline = require('readline');
const pool = require('../src/config/database');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function perguntar(pergunta) {
    return new Promise((resolve) => {
        rl.question(pergunta, resolve);
    });
}

async function criarAdmin() {
    try {
        const nome = await perguntar('Nome do administrador: ');
        const email = await perguntar('E-mail: ');
        const senha = await perguntar('Senha: ');

        if (!nome.trim() || !email.trim() || !senha) {
            console.log('Todos os campos são obrigatórios.');
            return;
        }

        if (senha.length < 8) {
            console.log('A senha deve ter pelo menos 8 caracteres.');
            return;
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        await pool.query(
            `INSERT INTO admins (nome, email, senha_hash)
             VALUES ($1, $2, $3)`,
            [nome.trim(), email.trim().toLowerCase(), senhaHash]
        );

        console.log('Administrador cadastrado com sucesso!');

    } catch (error) {
        if (error.code === '23505') {
            console.log('Já existe um administrador com esse e-mail.');
        } else {
            console.error('Erro ao cadastrar administrador:', error.message);
        }
    } finally {
        rl.close();
        await pool.end();
    }
}

criarAdmin();
