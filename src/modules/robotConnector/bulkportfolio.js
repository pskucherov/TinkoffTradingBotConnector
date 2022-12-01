const { getFigiData } = require('../getHeadsInstruments');
const { io } = require('../server');
const { getSelectedToken } = require('../tokens');
const { getPortfolio, getOrders } = require('./tinkoffApi');

const getPortfolioWithData = async (pos, botLib, accountId, selectedBot) => {
    const figi = {};
    const {
        portfolio,
        orders,
    } = pos;
    let calcPositions;

    try {
        if (portfolio && portfolio.positions && Array.isArray(portfolio.positions)) {
            if (accountId && botLib?.bots && selectedBot) {
                const settings = botLib.bots[selectedBot].getSettings(selectedBot, accountId, 'portfolio');

                calcPositions = botLib.bots[selectedBot].calcPortfolio(portfolio.positions, settings);
                calcPositions = {
                    ...calcPositions,
                    ...settings,
                };
            }

            portfolio.positions.forEach(async (p, k) => {
                figi[p.figi] = await getFigiData(p.figi);

                if (calcPositions && calcPositions[p.figi]) {
                    portfolio.positions[k].positionVolume = calcPositions[p.figi].positionVolume;
                    delete calcPositions[p.figi];
                }
            });
        }
    } catch (e) {
        console.log(e); // eslint-disable-line no-console
    }

    return {
        portfolio,
        figi,
        calcPositions,
        orders: orders?.orders,
    };
};

const auth = require('../users/socketAuth');

const portfolioConnector = async (sdkObj, botLib, isSandbox) => { // eslint-disable-line
    if (!sdkObj.sdk || !botLib) {
        return;
    }

    const {
        getSandboxPortfolio,
    } = sdkObj.sdk.sandbox;

    io.of('/portfolio').use(auth).on('connection', async socket => {
        try {
            let selectedRobot = false;

            const {
                orders,
                operations,
            } = sdkObj.sdk;

            const { accountId, brokerId } = getSelectedToken(1);

            const sendData = async () => {
                const portfolio = await getPortfolio(accountId, getSandboxPortfolio, isSandbox, operations);

                socket.emit('portfolio:data', await getPortfolioWithData({
                    orders: await getOrders(accountId, getSandboxPortfolio, isSandbox, orders),
                    portfolio,
                }, botLib, accountId, selectedRobot));
            };

            sendData();
            const interval = setInterval(sendData, 10000);

            socket.on('portfolio:getDataForRobot', async data => {
                selectedRobot = data.selectedRobot;
                await sendData();
            });

            socket.on('disconnect', reason => {
                clearInterval(interval);
            });
        } catch (e) {
            console.log(e); // eslint-disable-line no-console
        }
    });
};

module.exports = {
    portfolioConnector,
};
