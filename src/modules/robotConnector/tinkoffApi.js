const { logger, sdkLogger } = require('../logger');
const { getFigiData, getTradingSchedules, getShares, getBlueChipsShares } = require('../getHeadsInstruments');
const { getFromMorning, getToEvening } = require('../utils');
const { getSelectedToken } = require('../tokens');
const { saveStartedRobot, getData } = require('./state');
const { cacheState } = require('./utils');

const getPortfolio = async (accountId, getSandboxPortfolio, isSandbox, operations) => {
    try {
        const command = isSandbox ? getSandboxPortfolio : operations.getPortfolio;

        // {"totalAmountShares":{"currency":"rub","units":2424,"nano":800000000},"totalAmountBonds":{"currency":"rub","units":0,"nano":0},"totalAmountEtf":{"currency":"rub","units":0,"nano":0},"totalAmountCurrencies":{"currency":"rub","units":9533,"nano":350000000},"totalAmountFutures":{"currency":"rub","units":0,"nano":0},"expectedYield":{"units":0,"nano":-340000000},"positions":[{"figi":"BBG004730N88","instrumentType":"share","quantity":{"units":20,"nano":0},"averagePositionPrice":{"currency":"rub","units":123,"nano":270000000},"expectedYield":{"units":-40,"nano":-600000000},"currentNkd":{"currency":"rub","units":0,"nano":0},"currentPrice":{"currency":"rub","units":121,"nano":240000000},"averagePositionPriceFifo":{"currency":"rub","units":123,"nano":270000000},"quantityLots":{"units":2,"nano":0}}]}
        return await command({ accountId });
    } catch (e) { logger(1, e) }
};

const getPositions = async (accountId, getSandboxPositions, isSandbox, operations) => {
    try {
        const command = isSandbox ? getSandboxPositions : operations.getPositions;

        // {"money":[{"currency":"rub","units":9533,"nano":350000000}],"blocked":[],"securities":[{"figi":"BBG004730N88","blocked":0,"balance":20}],"limitsLoadingInProgress":false,"futures":[]}
        return await command({ accountId });
    } catch (e) { logger(1, e) }
};

const getOrders = async (accountId, getSandboxOrders, isSandbox, orders) => {
    try {
        const command = isSandbox ? getSandboxOrders : orders.getOrders;

        return await command({
            accountId,
        });
    } catch (e) { logger(1, e) }
};

const getLastPrices = async (figi, marketData) => {
    try {
        const command = marketData.getLastPrices;

        return await command({ figi }); // Array.isArray(figi) ? figi.map(f => { return { figi: f }}) : [{ figi }]);
    } catch (e) { logger(1, e) }
};

const startRobot = async (sdkObj, botLib, isSandbox, figi, reqQuery, needSave = true) => { // eslint-disable-line
    if (!sdkObj.sdk || !botLib) {
        return;
    }

    const bots = botLib.bots;

    const {
        orders,
        operations,

        marketData,
        marketDataStream,
        SubscriptionAction,
        MarketDataRequest,

        CandleInterval,

        InstrumentStatus,
        InstrumentIdType,

        SubscriptionInterval,

        OrderDirection,
        OrderType,

        ordersStream,
        operationsStream,
    } = sdkObj.sdk;

    const {
        postSandboxOrder,
        getSandboxOrders,
        cancelSandboxOrder,
        getSandboxOrderState,
        getSandboxPositions,
        getSandboxOperations,
        getSandboxPortfolio,
    } = sdkObj.sdk.sandbox;

    const lastPriceSubscribe = () => {
        try {
            function getCreateSubscriptionLastPriceRequest(figi) {
                return MarketDataRequest.fromJSON({
                    subscribeLastPriceRequest: {
                        subscriptionAction: SubscriptionAction.SUBSCRIPTION_ACTION_SUBSCRIBE,
                        instruments: Array.isArray(figi) ? figi.map(f => { return { figi: f } }) : [{ figi }],
                    },
                });
            }

            return [
                marketDataStream.marketDataStream,
                getCreateSubscriptionLastPriceRequest,
            ];
        } catch (e) { logger(1, e) }
    };

    const postOrder = async (accountId, figi, quantity, price, direction, orderType, orderId) => { // eslint-disable-line max-params
        try {
            const command = isSandbox ? postSandboxOrder : orders.postOrder;

            return await command({
                accountId,
                figi,
                quantity,
                price,
                direction, // OrderDirection.ORDER_DIRECTION_BUY,
                orderType, // OrderType.ORDER_TYPE_LIMIT,
                orderId, //: 'abc-fsdfdsfsdf-2',
            });
        } catch (e) { logger(1, e) }
    };

    const getOrderState = async (accountId, orderId) => {
        try {
            const command = isSandbox ? getSandboxOrderState : orders.getOrderState;

            return await command({
                accountId,
                orderId,
            });
        } catch (e) { logger(1, e) }
    };

    const cancelOrder = async (accountId, orderId) => {
        try {
            const command = isSandbox ? cancelSandboxOrder : orders.cancelOrder;

            return await command({
                accountId,
                orderId,
            });
        } catch (e) { logger(1, e) }
    };

    const orderBookSubscribe = () => {
        try {
            function getCreateSubscriptionOrderBookRequest(figi) {
                return MarketDataRequest.fromJSON({
                    subscribeOrderBookRequest: {
                        subscriptionAction: SubscriptionAction.SUBSCRIPTION_ACTION_SUBSCRIBE,
                        instruments: Array.isArray(figi) ?
                            figi.map(f => { return { figi: f, depth: 50 } }) : [{ figi, depth: 50 }],
                    },
                });
            }

            return [
                marketDataStream.marketDataStream,
                getCreateSubscriptionOrderBookRequest,
            ];
        } catch (e) { logger(1, e) }
    };

    // OPERATION_STATE_EXECUTED (1) TODO: брать из sdk и порефакторить количество параметров
    const getOperations = async (accountId, figi, to, state = 1, from = new Date()) => { // eslint-disable-line max-params
        const f = getFromMorning(from);
        let t;

        if (!to) {
            t = getToEvening(from);
        } else {
            t = getToEvening(to);
        }

        try {
            const command = isSandbox ? getSandboxOperations : operations.getOperations;

            return await command({ accountId, figi, from: f, to: t, state });
        } catch (e) {
            logger(1, e);
        }
    };

    let {
        backtest,
    } = reqQuery;

    const {
        accountId, adviser,
        name,
        interval,
        date,
    } = reqQuery;

    backtest = Number(backtest);

    try {
        let robotStarted = {};

        if (bots[name]) {
            const type = bots[name].type;

            const robot = new bots[name](
                accountId,
                Number(adviser),
                backtest,
                {
                    subscribes: {
                        lastPrice: lastPriceSubscribe,
                        orderbook: orderBookSubscribe,
                        orders: ordersStream.tradesStream,
                        positions: operationsStream.positionsStream,
                    },
                    getTradingSchedules: getTradingSchedules.bind(this, sdkObj.sdk),
                    cacheState,
                    postOrder,
                    getOrderState,
                    cancelOrder,
                    getOrders: async (accountId, getSandboxPortfolio, isSandbox) => {
                        return await getOrders(accountId, getSandboxPortfolio, isSandbox, orders);
                    },
                    getPortfolio: async (accountId, getSandboxPortfolio, isSandbox) => {
                        return await getPortfolio(accountId, getSandboxPortfolio, isSandbox, operations);
                    },
                    getPositions: async (accountId, getSandboxPositions, isSandbox) => {
                        return await getPositions(accountId, getSandboxPositions, isSandbox, operations);
                    },
                    getOperations,

                    getLastPrices: async figi => {
                        return await getLastPrices(figi, marketData);
                    },
                },
                {
                    token: getSelectedToken(),
                    enums: {
                        CandleInterval,
                        InstrumentStatus,
                        InstrumentIdType,
                        SubscriptionInterval,
                        OrderDirection,
                        OrderType,
                    },
                    blueChipsShares: getBlueChipsShares().instruments,
                    isSandbox,
                },
            );

            robotStarted = {
                robot,
                name,
                type,
            };

            botLib.robotsStarted.push(robotStarted);

            robot.start();
            if (needSave) {
                saveStartedRobot(accountId, name, isSandbox, figi, reqQuery);
            }

            let tickerInfo;
            const splittedFigi = Array.isArray(figi) ? figi : figi.split(',');

            if (splittedFigi.length === 1) {
                tickerInfo = getFigiData(figi);
            } else {
                tickerInfo = splittedFigi.map(f => getFigiData(f)).filter(f => Boolean(f));
            }

            if (backtest) {
                await robot.setBacktestState(0, interval,
                    splittedFigi, date, {
                        figi: splittedFigi,
                        tickerInfo,
                        type,
                    });
            } else {
                await robot.setCurrentState(undefined, undefined, undefined, undefined, {
                    figi: splittedFigi,
                    tickerInfo,
                    type,
                });
            }
        }

        return robotStarted;
    } catch (e) {
        logger(0, e);
    }
};

const syncStartedRobot = async (sdkObj, botLib, isSandbox) => {
    const robotStatus = getData();

    Object.keys(robotStatus).forEach(r => {
        Object.keys(robotStatus[r]).forEach(async name => {
            if (robotStatus[r][name]) {
                const i = (botLib?.robotsStarted || []).findIndex(started => Boolean(started?.robot?.inProgress));

                if (i === -1) {
                    await startRobot(sdkObj, botLib,
                        robotStatus[r][name].isSandbox,
                        robotStatus[r][name].figi,
                        robotStatus[r][name].params,
                        false,
                    );
                }
            }
        });
    });
};

module.exports = {
    startRobot,

    getPortfolio,
    getPositions,
    getOrders,

    syncStartedRobot,
};
