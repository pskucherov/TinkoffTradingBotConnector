const { getFigiData } = require('../getHeadsInstruments');
const { io } = require('../server');
const { getSelectedToken } = require('../tokens');
const { getPortfolio } = require('./tinkoffApi');

const getPortfolioWithData = async portfolio => {
    const figi = {};

    try {
        if (portfolio && portfolio.positions && Array.isArray(portfolio.positions)) {
            portfolio.positions.forEach(async p => {
                figi[p.figi] = await getFigiData(p.figi);
            });
        }
    } catch (e) {
        console.log(e); // eslint-disable-line no-console
    }

    return {
        portfolio,
        figi,
    };
};

const portfolioConnector = async (sdkObj, botLib, isSandbox) => { // eslint-disable-line
    if (!sdkObj.sdk || !botLib) {
        return;
    }

    const {
        postSandboxOrder,
        getSandboxOrders,
        cancelSandboxOrder,
        getSandboxOrderState,
        getSandboxPositions,
        getSandboxOperations,
        getSandboxPortfolio,
    } = sdkObj.sdk.sandbox;

    // let gen = operationsStream.portfolioStream({
    //     accounts: [accountId],
    // });

    io.of('/portfolio').on('connection', async socket => {
        try {
            const bots = botLib.bots;

            const {
                operations,
                operationsStream,
            } = sdkObj.sdk;

            const { accountId, brokerId } = getSelectedToken(1);

            let portfolio = await getPortfolio(accountId, getSandboxPortfolio, isSandbox, operations);

            socket.emit('portfolio:data', await getPortfolioWithData(portfolio));

            const interval = setInterval(async () => {
                portfolio = await getPortfolio(accountId, getSandboxPortfolio, isSandbox, operations);
                socket.emit('portfolio:data', await getPortfolioWithData(portfolio));
            }, 10000);

            socket.on('disconnect', reason => {
                clearInterval(interval);
            });

            // for await (const data of gen) {
            //     if (param && param.isDisconnected) {
            //         break;
            //     }

            //     if (data && data.portfolio) {
            //         socket.emit('portfolio:data', await getPortfolioWithData(data.portfolio));
            //     }
            // }

            // positionsSubscribe {"position":{"accountId":"2125297396","money":[{"availableValue":{"currency":"rub","units":540,"nano":230000000},"blockedValue":{"currency":"rub","units":2,"nano":400000000}}],"securities":[{"figi":"BBG004S68B31","blocked":10,"balance":140,"positionUid":"962f3a99-3b2d-4af6-995e-26be412b7b22","instrumentUid":"30817fea-20e6-4fee-ab1f-d20fc1a1bb72","exchangeBlocked":false,"instrumentType":"share"}],"futures":[],"options":[],"date":"2022-11-10T17:18:11.459Z"}}
            // positionsSubscribe {"position":{"accountId":"2125297396","money":[{"availableValue":{"currency":"rub","units":1206,"nano":330000000},"blockedValue":{"currency":"rub","units":2,"nano":400000000}}],"securities":[{"figi":"BBG004S68B31","blocked":0,"balance":140,"positionUid":"962f3a99-3b2d-4af6-995e-26be412b7b22","instrumentUid":"30817fea-20e6-4fee-ab1f-d20fc1a1bb72","exchangeBlocked":false,"instrumentType":"share"}],"futures":[],"options":[],"date":"2022-11-10T17:18:11.509Z"}}
            // positionsSubscribe {"position":{"accountId":"2125297396","money":[{"availableValue":{"currency":"rub","units":1208,"nano":730000000},"blockedValue":{"currency":"rub","units":0,"nano":0}}],"securities":[],"futures":[],"options":[],"date":"2022-11-10T17:18:12.327Z"}}
            // positionsSubscribe {"position":{"accountId":"2125297396","money":[{"availableValue":{"currency":"rub","units":1206,"nano":730000000},"blockedValue":{"currency":"rub","units":0,"nano":0}}],"securities":[],"futures":[],"options":[],"date":"2022-11-10T17:18:12.335Z"}}
            // portfolioSubscribe {"portfolio":{"totalAmountShares":{"currency":"rub","units":253616,"nano":400000000},"totalAmountBonds":{"currency":"rub","units":0,"nano":0},"totalAmountEtf":{"currency":"rub","units":0,"nano":0},"totalAmountCurrencies":{"currency":"rub","units":1208,"nano":730000000},"expectedYield":{"units":2444041,"nano":0},"positions":[{"figi":"BBG004731489","instrumentType":"share","quantity":{"units":8,"nano":0},"averagePositionPrice":{"currency":"rub","units":13010,"nano":0},"expectedYield":{"units":7,"nano":163700000},"averagePositionPricePt":{"units":13010,"nano":0},"currentPrice":{"currency":"rub","units":13942,"nano":0},"averagePositionPriceFifo":{"currency":"rub","units":13010,"nano":0},"quantityLots":{"units":8,"nano":0},"blocked":false},{"figi":"BBG004S68B31","instrumentType":"share","quantity":{"units":140,"nano":0},"averagePositionPrice":{"currency":"rub","units":68,"nano":750000000},"expectedYield":{"units":-3,"nano":-112700000},"averagePositionPricePt":{"units":68,"nano":750000000},"currentPrice":{"currency":"rub","units":66,"nano":610000000},"averagePositionPriceFifo":{"currency":"rub","units":68,"nano":750000000},"quantityLots":{"units":140,"nano":0},"blocked":false},{"figi":"BBG004730N88","instrumentType":"share","quantity":{"units":500,"nano":0},"averagePositionPrice":{"currency":"rub","units":111,"nano":410000000},"expectedYield":{"units":21,"nano":757400000},"averagePositionPricePt":{"units":111,"nano":410000000},"currentPrice":{"currency":"rub","units":135,"nano":650000000},"averagePositionPriceFifo":{"currency":"rub","units":111,"nano":410000000},"quantityLots":{"units":500,"nano":0},"blocked":false},{"figi":"BBG004S689R0","instrumentType":"share","quantity":{"units":10,"nano":0},"averagePositionPrice":{"currency":"rub","units":5976,"nano":599000000},"expectedYield":{"units":8,"nano":640300000},"averagePositionPricePt":{"units":5976,"nano":599000000},"currentPrice":{"currency":"rub","units":6493,"nano":0},"averagePositionPriceFifo":{"currency":"rub","units":5976,"nano":599000000},"quantityLots":{"units":10,"nano":0},"blocked":false},{"figi":"RUB000UTSTOM","instrumentType":"currency","quantity":{"units":1208,"nano":730000000},"averagePositionPrice":{"currency":"rub","units":1,"nano":0},"expectedYield":{"units":0,"nano":0},"averagePositionPricePt":{"units":1,"nano":0},"currentPrice":{"currency":"rub","units":1,"nano":0},"averagePositionPriceFifo":{"currency":"rub","units":1,"nano":0},"quantityLots":{"units":1208,"nano":730000000},"blocked":false}],"accountId":"2125297396"}}
            // const positionsSubscribe = async accounts => {
            //     const gen = operationsStream.positionsStream({
            //         accounts: Array.isArray(accounts) ? accounts : [accounts],
            //     });
            //     for await (const data of gen) {
            //         if (data) {
            //             console.log('positionsSubscribe', JSON.stringify(data));
            //         }
            //     }
            // };

            // portfolioSubscribe(accountId, param);

            // const subscribes = {
            //     PortfolioStream: portfolioSubscribe(accountId),
            //     PositionsStream: positionsSubscribe(accountId),
            // };
        } catch (e) {
            console.log(e); // eslint-disable-line no-console
        }
    });
};

module.exports = {
    portfolioConnector,
};
