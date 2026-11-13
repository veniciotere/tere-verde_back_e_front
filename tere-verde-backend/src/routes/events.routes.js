
const express = require('express');
const router = express.Router();

const pool = require('../config/database');
const autenticarAdmin = require('../middlewares/auth.middleware');


// Cadastrar evento (RF03)
router.post('/', autenticarAdmin, async (req, res) => {
    try {
        const {
            nome,
            park_id,
            data_inicio,
            data_fim,
            horario_inicio,
            horario_fim,
            descricao
        } = req.body;

        if (
            !nome ||
            !park_id ||
            !data_inicio ||
            !data_fim ||
            !horario_inicio ||
            !horario_fim ||
            !descricao
        ) {
            return res.status(400).json({
                erro: 'Todos os campos obrigatórios devem ser preenchidos.'
            });
        }

        if (!Number.isInteger(Number(park_id)) || Number(park_id) <= 0) {
            return res.status(400).json({
                erro: 'ID do parque inválido.'
            });
        }

        if (data_fim < data_inicio) {
            return res.status(400).json({
                erro: 'A data de término não pode ser anterior à data de início.'
            });
        }

        const resultado = await pool.query(
            `INSERT INTO events (
                nome,
                park_id,
                data_inicio,
                data_fim,
                horario_inicio,
                horario_fim,
                descricao
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *`,
            [
                nome,
                Number(park_id),
                data_inicio,
                data_fim,
                horario_inicio,
                horario_fim,
                descricao
            ]
        );

        res.status(201).json({
            mensagem: 'Evento cadastrado com sucesso.',
            evento: resultado.rows[0]
        });

    } catch (error) {
        if (error.code === '23503') {
            return res.status(404).json({
                erro: 'Parque não encontrado.'
            });
        }

        console.error('Erro ao cadastrar evento:', error.message);

        res.status(500).json({
            erro: 'Erro ao cadastrar evento.'
        });
    }
});


// Listar eventos públicos (RF04)
router.get('/', async (req, res) => {
    try {
        const { park_id } = req.query;

        let consulta = `
            SELECT
                events.id,
                events.nome,
                TO_CHAR(events.data_inicio, 'YYYY-MM-DD') AS data,
                TO_CHAR(events.data_fim, 'YYYY-MM-DD') AS "dataTer",
                events.horario_inicio AS horario,
                events.horario_fim AS "horarioTer",
                parks.codigo AS local,
                events.descricao
            FROM events
            INNER JOIN parks ON events.park_id = parks.id
            WHERE events.visivel = TRUE
        `;

        const valores = [];

        if (park_id) {
            if (!Number.isInteger(Number(park_id)) || Number(park_id) <= 0) {
                return res.status(400).json({
                    erro: 'ID do parque inválido.'
                });
            }

            valores.push(Number(park_id));
            consulta += ` AND events.park_id = $${valores.length}`;
        }

        consulta += ' ORDER BY data_inicio ASC';

        const resultado = await pool.query(consulta, valores);

        res.json(resultado.rows);

    } catch (error) {
        console.error('Erro ao listar eventos:', error.message);

        res.status(500).json({
            erro: 'Erro ao buscar eventos.'
        });
    }
});


// Listar todos os eventos para administração
router.get('/admin/listar', autenticarAdmin, async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT
                events.id,
                events.nome,
                TO_CHAR(events.data_inicio, 'YYYY-MM-DD') AS data,
                TO_CHAR(events.data_fim, 'YYYY-MM-DD') AS "dataTer",
                events.horario_inicio AS horario,
                events.horario_fim AS "horarioTer",
                parks.codigo AS local,
                events.descricao,
                events.visivel
            FROM events
            INNER JOIN parks ON events.park_id = parks.id
            ORDER BY events.data_inicio ASC
        `);

        res.json(resultado.rows);

    } catch (error) {
        console.error('Erro ao listar eventos administrativos:', error.message);

        res.status(500).json({
            erro: 'Erro ao buscar eventos.'
        });
    }
});


// Editar evento (RF05)
router.put('/:id', autenticarAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const {
            nome,
            park_id,
            data_inicio,
            data_fim,
            horario_inicio,
            horario_fim,
            descricao,
            visivel
        } = req.body;

        if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
            return res.status(400).json({
                erro: 'ID do evento inválido.'
            });
        }

        if (
            !nome ||
            !park_id ||
            !data_inicio ||
            !data_fim ||
            !horario_inicio ||
            !horario_fim ||
            !descricao
        ) {
            return res.status(400).json({
                erro: 'Todos os campos obrigatórios devem ser preenchidos.'
            });
        }

        if (!Number.isInteger(Number(park_id)) || Number(park_id) <= 0) {
            return res.status(400).json({
                erro: 'ID do parque inválido.'
            });
        }

        if (data_fim < data_inicio) {
            return res.status(400).json({
                erro: 'A data de término não pode ser anterior à data de início.'
            });
        }

        if (visivel !== undefined && typeof visivel !== 'boolean') {
            return res.status(400).json({
                erro: 'O campo visivel deve ser verdadeiro ou falso.'
            });
        }

        const resultado = await pool.query(
            `UPDATE events
             SET nome = $1,
                 park_id = $2,
                 data_inicio = $3,
                 data_fim = $4,
                 horario_inicio = $5,
                 horario_fim = $6,
                 descricao = $7,
                 visivel = COALESCE($8, visivel),
                 atualizado_em = CURRENT_TIMESTAMP
             WHERE id = $9
             RETURNING *`,
            [
                nome,
                Number(park_id),
                data_inicio,
                data_fim,
                horario_inicio,
                horario_fim,
                descricao,
                visivel ?? null,
                id
            ]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                erro: 'Evento não encontrado.'
            });
        }

        res.json({
            mensagem: 'Evento atualizado com sucesso.',
            evento: resultado.rows[0]
        });

    } catch (error) {
        if (error.code === '23503') {
            return res.status(404).json({
                erro: 'Parque não encontrado.'
            });
        }

        console.error('Erro ao editar evento:', error.message);

        res.status(500).json({
            erro: 'Erro ao atualizar evento.'
        });
    }
});


// Excluir evento (RF06)
router.delete('/:id', autenticarAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
            return res.status(400).json({
                erro: 'ID do evento inválido.'
            });
        }

        const resultado = await pool.query(
            'DELETE FROM events WHERE id = $1 RETURNING *',
            [id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                erro: 'Evento não encontrado.'
            });
        }

        res.json({
            mensagem: 'Evento excluído com sucesso.'
        });

    } catch (error) {
        console.error('Erro ao excluir evento:', error.message);

        res.status(500).json({
            erro: 'Erro ao excluir evento.'
        });
    }
});


// Alterar visibilidade do evento (RF07)
router.patch('/:id/visibilidade', autenticarAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { visivel } = req.body;

        if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
            return res.status(400).json({
                erro: 'ID do evento inválido.'
            });
        }

        if (typeof visivel !== 'boolean') {
            return res.status(400).json({
                erro: 'O campo visivel deve ser verdadeiro ou falso.'
            });
        }

        const resultado = await pool.query(
            `UPDATE events
             SET visivel = $1,
                 atualizado_em = CURRENT_TIMESTAMP
             WHERE id = $2
             RETURNING *`,
            [visivel, id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                erro: 'Evento não encontrado.'
            });
        }

        res.json({
            mensagem: 'Visibilidade atualizada com sucesso.',
            evento: resultado.rows[0]
        });

    } catch (error) {
        console.error('Erro ao alterar visibilidade:', error.message);

        res.status(500).json({
            erro: 'Erro ao atualizar visibilidade.'
        });
    }
});


module.exports = router;
