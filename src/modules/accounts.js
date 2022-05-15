const { app } = require('./server');

const { logger } = require('./logger');
const { addAccountIdToToken, getSelectedToken } = require('./tokens');

/**
 * Получить расписание торгов.
 *
 * @param {*} sdk
 * @param {String[]} exchange
 * @param {String} from
 * @param {String} to
 * @returns
 */
const getAccounts = async (sdk, isSandbox) => {
    const f = isSandbox ? sdk.sandbox.getSandboxAccounts : sdk.users.getAccounts;

    let accounts = await f();

    // Если для песочницы нет счетов, то сразу создаём и закидываем туда деньги.
    if (isSandbox && (!accounts || !accounts.accounts || !accounts.accounts.length)) {
        // { accountId: 'eb2d8afc-840f-4cae-bfc8-51e52e9b5a30' }
        const newAccount = await sdk.sandbox.openSandboxAccount();

        await sdk.sandbox.sandboxPayIn({
            accountId: newAccount && newAccount.accountId,
            amount: {
                currency: 'RUB',
                units: 100000,
                nano: 0,
            },
        });
        accounts = await f();
    }

    return accounts;
};

const accountsRequest = sdkObj => {
    app.get('/getaccounts', async (req, res) => {
        const { sdk } = sdkObj;

        try {
            // Запрашиваем токен каждый раз, т.к. мог поменяться.
            // Знать sandbox или нет -- критично.
            const token = getSelectedToken(1);

            return res.json(token ? await getAccounts(sdk, token.isSandbox) : {});
        } catch (error) {
            logger(0, error, res);
        }
    });

    app.get('/selectaccount', async (req, res) => {
        try {
            // Запрашиваем токен каждый раз, т.к. мог поменяться.
            // Знать sandbox или нет -- критично.
            let token = getSelectedToken(1);
            const id = req.query.id;

            addAccountIdToToken(token.token, id);

            token = getSelectedToken(1);

            return res.json({ accountId: token.accountId });
        } catch (error) {
            logger(0, error, res);
        }
    });
};

module.exports = {
    accountsRequest,
};
