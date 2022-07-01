const { app } = require('./server');

const { logger } = require('./logger');
const { addAccountIdToToken, getSelectedToken } = require('./tokens');

const config = require('../config.js');

const fs = require('fs');

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

    app.get('/getaccountinfo', async (req, res) => {
        const { sdk } = sdkObj;
        const { accountId, isSandbox } = getSelectedToken(1);

        if (!accountId) {
            return res.status(404).end();
        }

        let info;
        let marginattr;
        let tarrif;
        let portfolio;
        let withdrawlimits;

        if (!isSandbox) {
            try {
                info = await sdk.users.getInfo({});
            } catch (error) { logger(1, error) }

            try {
                marginattr = await sdk.users.getMarginAttributes({
                    accountId,
                });
            } catch (error) { logger(1, error) }

            try {
                tarrif = await sdk.users.getUserTariff({});
            } catch (error) { logger(1, error) }

            try {
                withdrawlimits = await sdk.operations.getWithdrawLimits({
                    accountId,
                });
            } catch (error) { logger(1, error) }
        }

        try {
            portfolio = await (isSandbox ? sdk.sandbox.getSandboxPortfolio : sdk.operations.getPortfolio)({
                accountId,
            });
        } catch (error) { logger(1, error) }

        res.json({
            info,
            marginattr,
            tarrif,
            portfolio,
            withdrawlimits,
        });
    });

    app.get('/getbalance', async (req, res) => {
        const { sdk } = sdkObj;
        const { accountId, isSandbox } = getSelectedToken(1);

        if (!accountId) {
            return res.status(404).end();
        }

        try {
            return res.json(await (isSandbox ? sdk.sandbox.getSandboxPortfolio : sdk.operations.getPortfolio)({
                accountId,
            }));
        } catch (error) {
            logger(1, error, res);
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

    app.get('/getbrokerreport', async (req, res) => {
        const { sdk } = sdkObj;
        const { accountId, isSandbox } = getSelectedToken(1);

        if (!accountId) {
            return res.status(404).end();
        }

        const today = new Date().toISOString();
        let week = new Date();

        week.setDate(week.getDate() - 15);
        week = week.toISOString();

        try {
            const brokerReport = await(isSandbox ? sdk.sandbox.getBrokerReport : sdk.operations.getBrokerReport)({
                generateBrokerReportRequest: {
                    accountId,
                    from: new Date(week),
                    to: new Date(today),
                },
            });

            const taskId = await brokerReport.generateBrokerReportResponse?.taskId;
            const fileName = config.files.brokerReport;

            if (taskId) {
                const interval = setInterval(async () => {
                    let q;

                    try {
                        q = await (isSandbox ? sdk.sandbox.getBrokerReport : sdk.operations.getBrokerReport)({
                            getBrokerReportRequest: {
                                taskId: taskId,
                            },
                        });
                    } catch (error) {}
                    if (q) {
                        try {
                            const content = JSON.stringify(q);

                            fs.writeFile(fileName, content, function(error) {
                                if (error) {
                                    logger(0, error, res);
                                }
                            });
                        } catch (error) {}

                        clearInterval(interval);

                        return res.json(q);
                    }
                }, 5000);
            } else {
                let data;

                try {
                    if (fs.existsSync(fileName)) {
                        data = fs.readFileSync(fileName);

                        return res.send(data);
                    }
                } catch (error) {
                    logger(0, error, res);
                }
            }
        } catch (error) {
            logger(1, error, res);
        }
    });
};

module.exports = {
    accountsRequest,
};
