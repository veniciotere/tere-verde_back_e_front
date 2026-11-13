
const express = require('express');
const router = express.Router();
const autenticarAdmin = require('../middlewares/auth.middleware');

const pool = require('../config/database');

// Listar todos os parques
router.get('/', async (req, res) => {
    try {
        const resultado = await pool.query(
            'SELECT * FROM parks ORDER BY id'
        );

        res.json(resultado.rows);
    } catch (error) {
        console.error('Erro ao buscar parques:', error.message);
        res.status(500).json({
            erro: 'Erro ao consultar os parques.'
        });
    }
});

// Buscar parque por ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const resultado = await pool.query(
            'SELECT * FROM parks WHERE id = $1',
            [id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                erro: 'Parque não encontrado.'
            });
        }

        res.json(resultado.rows[0]);
    } catch (error) {
        console.error('Erro ao buscar parque:', error.message);
        res.status(500).json({
            erro: 'Erro ao consultar o parque.'
        });
    }
});


// Atualizar informações de um parque (RF14)
router.patch('/:id', autenticarAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            horarios_funcionamento,
            regras_conduta,
            areas_disponiveis
        } = req.body;

        if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
            return res.status(400).json({
                erro: 'ID do parque inválido.'
            });
        }

        if (
            horarios_funcionamento === undefined &&
            regras_conduta === undefined &&
            areas_disponiveis === undefined
        ) {
            return res.status(400).json({
                erro: 'Informe pelo menos um campo para atualizar.'
            });
        }

        if (
            horarios_funcionamento !== undefined &&
            typeof horarios_funcionamento !== 'string'
        ) {
            return res.status(400).json({
                erro: 'Horários devem ser informados como texto.'
            });
        }

        if (
            regras_conduta !== undefined &&
            typeof regras_conduta !== 'string'
        ) {
            return res.status(400).json({
                erro: 'Regras de conduta devem ser informadas como texto.'
            });
        }

        if (areas_disponiveis !== undefined) {
            const camposPermitidos = [
                'estacionamento',
                'camping',
                'cachoeira',
                'trilha',
                'escalada'
            ];

            if (
                typeof areas_disponiveis !== 'object' ||
                areas_disponiveis === null ||
                Array.isArray(areas_disponiveis) ||
                Object.keys(areas_disponiveis).some(
                    campo => !camposPermitidos.includes(campo)
                ) ||
                Object.values(areas_disponiveis).some(
                    valor => typeof valor !== 'boolean'
                )
            ) {
                return res.status(400).json({
                    erro: 'Áreas disponíveis devem conter apenas campos permitidos com valores booleanos.'
                });
            }
        }

        const resultado = await pool.query(
            `UPDATE parks
             SET
                horarios_funcionamento = COALESCE($1, horarios_funcionamento),
                regras_conduta = COALESCE($2, regras_conduta),
                areas_disponiveis = COALESCE($3, areas_disponiveis),
                atualizado_em = CURRENT_TIMESTAMP
             WHERE id = $4
             RETURNING *`,
            [
                horarios_funcionamento ?? null,
                regras_conduta ?? null,
                areas_disponiveis === undefined
                    ? null
                    : JSON.stringify(areas_disponiveis),
                id
            ]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                erro: 'Parque não encontrado.'
            });
        }

        res.json({
            mensagem: 'Informações do parque atualizadas com sucesso.',
            parque: resultado.rows[0]
        });

    } catch (error) {
        console.error('Erro ao atualizar parque:', error.message);

        res.status(500).json({
            erro: 'Erro ao atualizar as informações do parque.'
        });
    }
});


module.exports = router;    
