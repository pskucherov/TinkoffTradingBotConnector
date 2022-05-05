const fs = require('fs');
const path = require('path');

const { logger } = require('./logger');
const fileName = path.join(__dirname, '../../tokens/data.json');

/**
 * Выставляет маркер выбранного токена.
 *
 * @param {String} token
 */
const selectToken = token => {
    const file = fs.readFileSync(fileName, 'utf8');

    if (file.includes(token)) {
        const tokens = JSON.parse(file);

        for (const t of tokens) {
            if (t.token === token) {
                t.selected = true;
            } else if (t.selected) {
                delete t.selected;
            }
        }

        fs.writeFileSync(fileName, JSON.stringify(tokens));
    }
};

/**
 * Сохраняет токен в файл.
 * Если это первый токен, то ставит его выбранным.
 *
 * @param {Boolean} isSandbox
 * @param {String} token
 */
const saveToken = (isSandbox, token) => {
    const file = fs.readFileSync(fileName, 'utf8');

    if (!file.includes(token)) {
        const tokens = JSON.parse(file);

        tokens.push({ token: token, isSandbox });

        if (tokens.length === 1) {
            tokens[0].selected = true;
        }

        fs.writeFileSync(fileName, JSON.stringify(tokens));
    }
};

/**
 * Удаляет токен.
 *
 * @param {String} token
 */
const delToken = token => {
    const file = fs.readFileSync(fileName, 'utf8');

    if (file.includes(token)) {
        const tokens = JSON.parse(file).filter(t => t.token !== token);

        fs.writeFileSync(fileName, JSON.stringify(tokens));
    }
};

/**
 * Возвращает токены из файла.
 *
 * @param {String} token
 */
const getTokens = () => {
    return JSON.parse(fs.readFileSync(fileName, 'utf8'));
};

const tokenRequest = (createSdk, app, logsServerFileName) => {
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

            return res
                .json({});
        } catch (error) {
            logger(logsServerFileName, error, res);
        }
    });

    app.get('*/selecttoken', async (req, res) => {
        try {
            selectToken(req.query.token);

            return res
                .json({});
        } catch (error) {
            logger(logsServerFileName, error, res);
        }
    });

    app.get('*/addtoken', async (req, res) => {
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
        } catch (e) {}

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
                    token: isProduction ? 'production' : 'sandbox',
                });
        } catch (error) {
            logger(logsServerFileName, error, res);
        }
    });
};

module.exports = {
    tokenRequest,
};
