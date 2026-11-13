
const express = require('express');
const router = express.Router();

const pool = require('../config/database');
const autenticarAdmin = require('../middlewares/auth.middleware');

// Cadastrar atividade (RF08)
router.post('/', autenticarAdmin, async (req, res) => {
    try {
        const {
            nome,
            park_id,
            distancia,
            tempo,
            dificuldade,
            tipo,
            descricao,
            disponibilidade,
            imagens
        } = req.body;

        if (
            !nome ||
            !park_id ||
            !distancia ||
            !tempo ||
            !dificuldade ||
            !tipo ||
            !descricao
        ) {
            return res.status(400).json({
                erro: 'Todos os campos obrigatórios devem ser preenchidos.'
            });
        }

        if (
            !Number.isInteger(Number(park_id)) ||
            Number(park_id) <= 0
        ) {
            return res.status(400).json({
                erro: 'ID do parque inválido.'
            });
        }

        if (!['Fácil', 'Médio', 'Difícil'].includes(dificuldade)) {
            return res.status(400).json({
                erro: 'Dificuldade inválida.'
            });
        }

        if (!['Trilha', 'Cachoeira', 'Escalada'].includes(tipo)) {
            return res.status(400).json({
                erro: 'Tipo de atividade inválido.'
            });
        }

        const status = disponibilidade || 'Aberto';

        if (!['Aberto', 'Fechado'].includes(status)) {
            return res.status(400).json({
                erro: 'Disponibilidade inválida.'
            });
        }

        const resultado = await pool.query(
            `INSERT INTO activities
            (nome, park_id, distancia, tempo, dificuldade,
             tipo, descricao, disponibilidade, imagens)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *`,
            [
                nome,
                Number(park_id),
                distancia,
                tempo,
                dificuldade,
                tipo,
                descricao,
                status,
                imagens || null
            ]
        );

        res.status(201).json({
            mensagem: 'Atividade cadastrada com sucesso.',
            atividade: resultado.rows[0]
        });

    } catch (error) {
        if (error.code === '23503') {
            return res.status(404).json({
                erro: 'Parque não encontrado.'
            });
        }

        console.error('Erro ao cadastrar atividade:', error.message);

        res.status(500).json({
            erro: 'Erro ao cadastrar atividade.'
        });
    }
});


// Listar atividades com filtros (RF09)
router.get('/', async (req, res) => {
    try {
        const { park_id, dificuldade, tipo } = req.query;

        const filtros = [];
        const valores = [];

        if (park_id !== undefined) {
            if (
                !Number.isInteger(Number(park_id)) ||
                Number(park_id) <= 0
            ) {
                return res.status(400).json({
                    erro: 'ID do parque inválido.'
                });
            }

            valores.push(Number(park_id));
            filtros.push(`park_id = $${valores.length}`);
        }

        if (dificuldade !== undefined) {
            if (!['Fácil', 'Médio', 'Difícil'].includes(dificuldade)) {
                return res.status(400).json({
                    erro: 'Dificuldade inválida.'
                });
            }

            valores.push(dificuldade);
            filtros.push(`dificuldade = $${valores.length}`);
        }

        if (tipo !== undefined) {
            if (!['Trilha', 'Cachoeira', 'Escalada'].includes(tipo)) {
                return res.status(400).json({
                    erro: 'Tipo de atividade inválido.'
                });
            }

            valores.push(tipo);
            filtros.push(`tipo = $${valores.length}`);
        }

        const where = filtros.length > 0
            ? `WHERE ${filtros.join(' AND ')}`
            : '';

        const resultado = await pool.query(
            `SELECT
                activities.id,
                activities.park_id,
                parks.nome AS parque,
                activities.nome,
                activities.distancia,
                activities.tempo,
                activities.dificuldade,
                activities.tipo,
                activities.descricao,
                activities.disponibilidade,
                activities.imagens,
                activities.criado_em,
                activities.atualizado_em
            FROM activities
            INNER JOIN parks ON activities.park_id = parks.id
            ${where}
            ORDER BY activities.id`,
            valores
);

        res.json(resultado.rows);

    } catch (error) {
        console.error('Erro ao listar atividades:', error.message);

        res.status(500).json({
            erro: 'Erro ao consultar atividades.'
        });
    }
});


// Editar atividade (RF10)
router.put('/:id', autenticarAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const {
            nome,
            park_id,
            distancia,
            tempo,
            dificuldade,
            tipo,
            descricao,
            disponibilidade,
            imagens
        } = req.body;

        if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
            return res.status(400).json({
                erro: 'ID da atividade inválido.'
            });
        }

        if (
            !nome ||
            !park_id ||
            !distancia ||
            !tempo ||
            !dificuldade ||
            !tipo ||
            !descricao
        ) {
            return res.status(400).json({
                erro: 'Todos os campos obrigatórios devem ser preenchidos.'
            });
        }

        if (
            !Number.isInteger(Number(park_id)) ||
            Number(park_id) <= 0
        ) {
            return res.status(400).json({
                erro: 'ID do parque inválido.'
            });
        }

        if (!['Fácil', 'Médio', 'Difícil'].includes(dificuldade)) {
            return res.status(400).json({
                erro: 'Dificuldade inválida.'
            });
        }

        if (!['Trilha', 'Cachoeira', 'Escalada'].includes(tipo)) {
            return res.status(400).json({
                erro: 'Tipo de atividade inválido.'
            });
        }

        const status = disponibilidade || 'Aberto';

        if (!['Aberto', 'Fechado'].includes(status)) {
            return res.status(400).json({
                erro: 'Disponibilidade inválida.'
            });
        }

        const resultado = await pool.query(
            `UPDATE activities
             SET nome = $1,
                 park_id = $2,
                 distancia = $3,
                 tempo = $4,
                 dificuldade = $5,
                 tipo = $6,
                 descricao = $7,
                 disponibilidade = $8,
                 imagens = $9,
                 atualizado_em = CURRENT_TIMESTAMP
             WHERE id = $10
             RETURNING *`,
            [
                nome,
                Number(park_id),
                distancia,
                tempo,
                dificuldade,
                tipo,
                descricao,
                status,
                imagens || null,
                id
            ]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                erro: 'Atividade não encontrada.'
            });
        }

        res.json({
            mensagem: 'Atividade atualizada com sucesso.',
            atividade: resultado.rows[0]
        });

    } catch (error) {
        if (error.code === '23503') {
            return res.status(404).json({
                erro: 'Parque não encontrado.'
            });
        }

        console.error('Erro ao editar atividade:', error.message);

        res.status(500).json({
            erro: 'Erro ao atualizar atividade.'
        });
    }
});


// Excluir atividade (RF11)
router.delete('/:id', autenticarAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
            return res.status(400).json({
                erro: 'ID da atividade inválido.'
            });
        }

        const resultado = await pool.query(
            'DELETE FROM activities WHERE id = $1 RETURNING *',
            [id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                erro: 'Atividade não encontrada.'
            });
        }

        res.json({
            mensagem: 'Atividade excluída com sucesso.'
        });

    } catch (error) {
        console.error('Erro ao excluir atividade:', error.message);

        res.status(500).json({
            erro: 'Erro ao excluir atividade.'
        });
    }
});


// Alterar disponibilidade da atividade (RF12)
router.patch('/:id/disponibilidade', autenticarAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { disponibilidade } = req.body;

        if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
            return res.status(400).json({
                erro: 'ID da atividade inválido.'
            });
        }

        if (!['Aberto', 'Fechado'].includes(disponibilidade)) {
            return res.status(400).json({
                erro: 'Disponibilidade deve ser Aberto ou Fechado.'
            });
        }

        const resultado = await pool.query(
            `UPDATE activities
             SET disponibilidade = $1,
                 atualizado_em = CURRENT_TIMESTAMP
             WHERE id = $2
             RETURNING *`,
            [disponibilidade, id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                erro: 'Atividade não encontrada.'
            });
        }

        res.json({
            mensagem: 'Disponibilidade atualizada com sucesso.',
            atividade: resultado.rows[0]
        });

    } catch (error) {
        console.error('Erro ao alterar disponibilidade:', error.message);

        res.status(500).json({
            erro: 'Erro ao atualizar disponibilidade.'
        });
    }
});


module.exports = router;
