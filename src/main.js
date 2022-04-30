const path = require('path');

const { createSdk } = require('tinkoff-sdk-grpc-js');

const { app } = require('./modules/server');
const { logger } = require('./modules/logger');
const { tokenRequest } = require('./modules/tokens');

const options = { year: 'numeric', month: 'numeric', day: 'numeric' };

// Логи ошибок пишутся отдельно для TinkoffApi и http сервера.
const logsServerFileName = path.join(__dirname, '../logs/server/' + new Date().toLocaleString(undefined, options) + '.txt');

// Ответ сервера, чтобы проверен что запущен.
app.get('*/check', (req, res) => {
    return res
        .status(200)
        .json({ status: true });
});

// CRUD токенов.
tokenRequest(createSdk, app, logsServerFileName);

app.get('/', async (req, res) => {
    try {
        const sdk = createSdk(req.query.token, req.query.appname);

        return res
            .json(await checkToken(sdk));
    } catch (error) {
        logger(logsServerFileName, error, res);
    }
});

function checkToken(sdk) {
    return sdk.users.getAccounts();
}
