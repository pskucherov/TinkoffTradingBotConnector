const path = require('path');
const configFile = path.join(__dirname, '../config.js');
const config = require(configFile);
const { logger } = require('./logger');
const { app } = require('./server');
const fs = require('fs');

app.get('/logs/:type', async (req, res) => {
    try {
        const fileName = req.params.type === 'server' ? config.files.logsServer : config.files.logsApi;
        let data;

        if (fs.existsSync(fileName)) {
            data = fs.readFileSync(fileName);
            res.send(data);
        } else {
            res.status(404).end();
        }
    } catch (error) {
        logger(0, error, res);
    }
});
