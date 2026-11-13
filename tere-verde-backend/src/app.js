
const cors = require('cors');
const express = require('express');

const app = express();

// Configurações antes das rotas
app.use(cors());
app.use(express.json());

const parksRoutes = require('./routes/parks.routes');
const authRoutes = require('./routes/auth.routes');
const activitiesRoutes = require('./routes/activities.routes');
const eventsRoutes = require('./routes/events.routes');

app.get('/', (req, res) => {
    res.json({
        mensagem: 'Bem-vindo à API do Terê Verde!'
    });
});

app.use('/api/v1/parks', parksRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/activities', activitiesRoutes);
app.use('/api/v1/events', eventsRoutes);

module.exports = app;
