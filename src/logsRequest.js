const path = require('path');
const configFile = path.join(__dirname, './config.js');
const config = require(configFile);
const { logger } = require('./modules/logger');
const { app } = require('./modules/server');

app.get('/logs/:type', async (req, res) => {
    const fs = require('fs');
    const type = req.params.type;

    try {
        if (type === 'server') {
            const data = fs.readFileSync(config.files.logsServer);

            res.send(data);
        } else if (type === 'API') {
            const data = fs.readFileSync(config.files.logsApi);

            res.send(data);
        }
    } catch (error) {
        logger(0, error, res);
    }
});
