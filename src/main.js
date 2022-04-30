const path = require('path');

const { createSdk } = require('tinkoff-sdk-grpc-js');

const { app } = require('./modules/server');
const { logger } = require('./modules/logger');
const { tokenRequest, getSelectedToken } = require('./modules/tokens');
const { getFutures } = require('./modules/getHeadsInstruments');
const config = require('./config');

// Логи ошибок пишутся отдельно для TinkoffApi и http сервера.
const options = { year: 'numeric', month: 'numeric', day: 'numeric' };

const token = getSelectedToken() || config.defaultToken;

// const futures = getFutures();

// TODO: изменить руками или в процессе создания робота.
const appName = config.appName || 'pskucherov.tinkofftradingbot';
let sdk;

if (!token) {
    logger(0, 'Нет выбранного токена. Добавьте в src/config.js руками или через opexviewer.');
} else {
    sdk = createSdk(token, appName);
}

// Ответ сервера, чтобы проверен что запущен.
app.get('*/check', (req, res) => {
    return res
        .status(200)
        .json({ status: true });
});

// CRUD токенов.
tokenRequest(createSdk, app);

app.get('/', async (req, res) => {
    try {
        return res
            .json(await checkToken(sdk));
    } catch (error) {
        logger(0, error, res);
    }
});

function checkToken(sdk) {
    return sdk.users.getAccounts();
}
