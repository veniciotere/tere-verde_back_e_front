
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const autenticarAdmin = require('../middlewares/auth.middleware');
const crypto = require('crypto');

const router = express.Router();
const pool = require('../config/database');

// Login do administrador
router.post('/login', async (req, res) => {
    try {
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({
                erro: 'E-mail e senha são obrigatórios.'
            });
        }

        const resultado = await pool.query(
            'SELECT * FROM admins WHERE email = $1',
            [email]
        );

        if (resultado.rows.length === 0) {
            return res.status(401).json({
                erro: 'E-mail ou senha inválidos.'
            });
        }

        const admin = resultado.rows[0];

        const senhaValida = await bcrypt.compare(
            senha,
            admin.senha_hash
        );

        if (!senhaValida) {
            return res.status(401).json({
                erro: 'E-mail ou senha inválidos.'
            });
        }

        const token = jwt.sign(
            {
                id: admin.id,
                email: admin.email
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '1h'
            }
        );

        res.json({
            mensagem: 'Login realizado com sucesso.',
            token,
            administrador: {
                id: admin.id,
                nome: admin.nome,
                email: admin.email
            }
        });

    } catch (error) {
        console.error('Erro no login:', error.message);

        res.status(500).json({
            erro: 'Erro interno ao realizar login.'
        });
    }
});

// Rota temporária para testar a autenticação JWT
router.get('/teste-protegida', autenticarAdmin, (req, res) => {
    res.json({
        mensagem: 'Acesso autorizado!',
        administrador: req.admin
    });
});


// Logout do administrador
router.post('/logout', autenticarAdmin, async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];

        const tokenHash = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        const expiracao = new Date(req.admin.exp * 1000);

        await pool.query(
            `INSERT INTO revoked_tokens
             (token_hash, admin_id, expiracao)
             VALUES ($1, $2, $3)`,
            [tokenHash, req.admin.id, expiracao]
        );

        res.json({
            mensagem: 'Logout realizado com sucesso.'
        });

    } catch (error) {
        console.error('Erro no logout:', error.message);

        res.status(500).json({
            erro: 'Erro ao realizar logout.'
        });
    }
});


module.exports = router;
