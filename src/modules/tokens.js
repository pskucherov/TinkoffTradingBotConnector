const fs = require('fs');

const { logger } = require('./logger');
const config = require('../config');
const fileName = config.files.tokens;

const { app } = require('./server');

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
 * Добавляем к токену выбранный аккаунт для торговли.
 *
 * @param {String} token
 * @param {String} accountId
 */
const addAccountIdToToken = (token, accountId) => {
    const file = fs.readFileSync(fileName, 'utf8');

    if (file.includes(token)) {
        const tokens = JSON.parse(file);

        for (const t of tokens) {
            if (t.token === token) {
                t.accountId = accountId;
                break;
            }
        }

        fs.writeFileSync(fileName, JSON.stringify(tokens));
    }
};

/**
 * Возвращает выбранный токен, если такой есть.
 *
 * @returns {?String}
 */
const getSelectedToken = fullTokenData => {
    const file = fs.readFileSync(fileName, 'utf8');

    const tokens = JSON.parse(file);

    for (const t of tokens) {
        if (t.selected) {
            return fullTokenData ? t : t.token;
        }
    }

    return {};
};

/**
 * Сохраняет токен в файл.
 * Если это первый токен, то ставит его выбранным.
 *
 * @param {Boolean} isSandbox
 * @param {String} token
 */
const saveToken = (isSandbox, token, brokerId, password) => {
    const file = fs.readFileSync(fileName, 'utf8');

    if (!file.includes(token)) {
        const tokens = JSON.parse(file);

        tokens.push({ token, isSandbox: Boolean(isSandbox), brokerId, password });

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

const checkFinamServer = async sdk => {
    app.get('/getfinamauthstatus', (req, res) => {
        const data = getSelectedToken(1);

        if (!data || data.brokerId !== 'FINAM') {
            return res.status(404).end();
        }

        const status = sdk.checkServerStatus();

        return res.json(status);
    });
};

const tokenRequest = createSdk => {
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
            logger(0, error, res);
        }
    });

    app.get('*/deltoken', async (req, res) => {
        try {
            delToken(req.query.token);

            return res
                .json({});
        } catch (error) {
            logger(0, error, res);
        }
    });

    app.get('*/selecttoken', async (req, res) => {
        try {
            selectToken(req.query.token);

            return res
                .json({});
        } catch (error) {
            logger(0, error, res);
        }
    });

    app.get('*/getncheckselectedtoken', async (req, res) => {
        try {
            const data = getSelectedToken(1);

            if (!data) {
                return res.status(404).end();
            }

            return res
                .json(data);
        } catch (error) {
            logger(0, error, res);
        }
    });

    const setTinkoffToken = async (res, token, brokerId) => {
        let sandboxAccounts;
        let isProduction;
        let isSandbox;
        let userInfo;

        try {
            const sdk = createSdk(token, 'opexviewer.addtoken');

            // Сделать запрос к пользователю
            sandboxAccounts = Boolean(await sdk.sandbox.getSandboxAccounts({}));

            // Сделать запрос за пользовательской информацией.
            userInfo = Boolean(await sdk.users.getInfo({}));

            // Ошибку не обрабатываем, т.к. в данном случае это ок.
            // В идеале в ответе иметь это сендбокс или нет.
        } catch (e) { return { error: 1 } }

        if (sandboxAccounts && userInfo) {
            isProduction = true;
        } else if (sandboxAccounts) {
            isSandbox = true;
        } else {
            return { error: 1 };
        }

        saveToken(isSandbox, token, brokerId);

        return { isProduction, isSandbox };
    };

    const setFinamToken = async (res, token, brokerId, password) => {
        saveToken(false, token, brokerId, password);

        return { isProduction: true, isSandbox: false };
    };

    app.get('*/addtoken', async (req, res) => {
        const { token, brokerId, password } = req.query;

        try {
            if (brokerId === 'TINKOFF') {
                const { isProduction, error } = await setTinkoffToken(res, token, brokerId);

                if (error) {
                    return res.json({ error: true });
                }

                return res
                    .json({
                        token: isProduction ? 'production' : 'sandbox',
                        brokerId,
                    });
            }
        } catch (error) {
            logger(0, error, res);
        }

        try {
            if (brokerId === 'FINAM') {
                const { isSandbox, isProduction, error } = await setFinamToken(res, token, brokerId, password);

                if (error) {
                    return res.json({ error: true });
                }

                return res
                    .json({
                        token: isProduction ? 'production' : 'sandbox',
                        brokerId,
                    });
            }
        } catch (error) {
            logger(0, error, res);
        }
    });
};

module.exports = {
    tokenRequest,
    getSelectedToken,
    addAccountIdToToken,
    checkFinamServer,
};
