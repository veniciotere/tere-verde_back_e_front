
const app = require('./app');
const pool = require('./config/database');

const PORT = 3000;

async function startServer() {
    try {
        await pool.query('SELECT NOW()');

        console.log('Conectado ao PostgreSQL com sucesso!');

        app.listen(PORT, () => {
            console.log(`Servidor rodando em http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Erro ao conectar ao PostgreSQL:', error.message);
        process.exit(1);
    }
}

startServer();
