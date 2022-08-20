const path = require('path');
const configFile = path.join(__dirname, '../config.js');
const config = require(configFile);
const { logger } = require('./logger');
const { app } = require('./server');
const fs = require('fs');
const { utils } = require('tconnector/utils');

app.get('/logs/:type', async (req, res) => {
    try {
        const fileName = req.params.type === 'server' ? config.files.logsServer : config.files.logsApi;

        if (['dsp', 'ts', 'xdf'].includes(req.params.type)) {
            const data = utils.getFileContent(req.params.type);

            return res.send(data);
        }

        if (fs.existsSync(fileName)) {
            const data = fs.readFileSync(fileName);

            res.send(data);
        } else {
            res.status(404).end();
        }
    } catch (error) {
        logger(0, error, res);
    }
});
