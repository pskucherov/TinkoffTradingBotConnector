const path = require('path');

const { createSdk } = require('tinkoff-sdk-grpc-js');

const { app } = require('./modules/server');
const { logger } = require('./modules/logger');
const { saveToken, delToken, getTokens } = require('./modules/tokens');

const options = { year: 'numeric', month: 'numeric', day: 'numeric' };
// Логи ошибок пишутся отдельно для TinkoffApi и http сервера.
const logsServerFileName = path.join(__dirname, '../logs/server/' + new Date().toLocaleString(undefined, options) + '.txt');

// Ответ сервера, чтобы проверен что запущен.
app.get('*/check', (req, res) => {
    return res
        .status(200)
        .json({ status: true });
});

app.get('*/gettokens', async (req, res) => {
    try {
        return res
            .json(getTokens());
    } catch (error) {
        logger(logsServerFileName, error, res);
    }
});


app.get('*/deltoken', async (req, res) => {
    try {
        delToken(req.query.token);
    } catch (error) {
        logger(logsServerFileName, error, res);
    }
});

app.get('/addtoken', async (req, res) => {
    let userInfo;
    let sandboxAccounts;
    let isSandbox = false;
    let isProduction = false;

    try {
        const sdk = createSdk(req.query.token, 'opexviewer.addtoken');

        // Сделать запрос к пользователю
        sandboxAccounts = Boolean(await sdk.sandbox.getSandboxAccounts({}));

        // Сделать запрос за пользовательской информацией.
        userInfo = Boolean(await sdk.users.getInfo({}));

        // Ошибку не обрабатываем, т.к. в данном случае это ок.
        // В идеале в ответе иметь это сендбокс или нет.
    } catch {}

    if (sandboxAccounts && userInfo) {
        isProduction = true;
    } else if (sandboxAccounts) {
        isSandbox = true;
    } else {
        return res
            .json({ error: true });
    }

    try {
        saveToken(isSandbox, req.query.token);
        
        return res
            .json({
                token: isProduction ? 'production' : 'sandbox'
            });
    } catch (error) {
        logger(logsServerFileName, error, res);
    }
});


app.get('/', async (req, res) => {
    try {
        const sdk = createSdk(req.query.token, req.query.appname);
        console.log(await checkToken(sdk));

        return res
            .json(await checkToken(sdk));
            
    } catch (error) {
        logger(logsServerFileName, error, res);
    }
});


function checkToken(sdk) {
    return sdk.users.getAccounts();
}