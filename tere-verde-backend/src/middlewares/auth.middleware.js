
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/database');

async function autenticarAdmin(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            erro: 'Token de autenticação não informado.'
        });
    }

    const partes = authHeader.split(' ');

    if (partes.length !== 2 || partes[0] !== 'Bearer') {
        return res.status(401).json({
            erro: 'Formato do token inválido.'
        });
    }

    const token = partes[1];

    try {
        const dados = jwt.verify(token, process.env.JWT_SECRET);

        const tokenHash = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        const resultado = await pool.query(
            'SELECT id FROM revoked_tokens WHERE token_hash = $1',
            [tokenHash]
        );

        if (resultado.rows.length > 0) {
            return res.status(401).json({
                erro: 'Este token foi revogado.'
            });
        }

        req.admin = dados;

        next();

    } catch (error) {
        if (error.name === 'JsonWebTokenError' ||
            error.name === 'TokenExpiredError') {
            return res.status(401).json({
                erro: 'Token inválido ou expirado.'
            });
        }

        console.error('Erro ao verificar token:', error.message);

        return res.status(500).json({
            erro: 'Erro interno ao verificar autenticação.'
        });
    }
}

module.exports = autenticarAdmin;
