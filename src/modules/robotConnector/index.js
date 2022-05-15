const path = require('path');
const { app } = require('../server');
const { logger } = require('../logger');
const fs = require('fs');

const { bots } = require('tradingbot');
const { getCandles, getCachedOrderBook, getRobotStateCachePath } = require('../getHeadsInstruments');
const { getFromMorning, getToEvening } = require('../utils');

let robotStarted;

try {
    const robotConnector = sdkObj => {
        const {
            orders,
            operations,
            marketDataStream,
            SubscriptionAction,
            MarketDataRequest,

            CandleInterval,

            InstrumentStatus,
            InstrumentIdType,

            SubscriptionInterval,

            OrderDirection,
            OrderType,
        } = sdkObj.sdk;

        const lastPriceSubscribe = figi => {
            try {
                function getCreateSubscriptionLastPriceRequest() {
                    return MarketDataRequest.fromJSON({
                        subscribeLastPriceRequest: {
                            subscriptionAction: SubscriptionAction.SUBSCRIPTION_ACTION_SUBSCRIBE,
                            instruments: [{ figi }],
                        },
                    });
                }

                return [
                    marketDataStream.marketDataStream,
                    getCreateSubscriptionLastPriceRequest,
                ];
            } catch (e) { logger(1, e) }
        };

        const getCandlesToBacktest = async (figi, interval, date, step) => {
            date = Number(date);
            const from = new Date(date);
            const to = new Date(date);

            from.setHours(5, 0, 0, 0);
            to.setHours(20, 59, 59, 999);

            const { candles } = await getCandles(sdkObj, figi, interval, from.getTime(), to.getTime());

            if (!candles || !candles.length) {
                return;
            }

            return candles.slice(0, step);
        };

        const postOrder = async (accountId, figi, quantity, price, direction, orderType, orderId) => { // eslint-disable-line max-params
            try {
                // console.log({
                //     accountId,
                //     figi,
                //     quantity,
                //     price,
                //     direction, // OrderDirection.ORDER_DIRECTION_BUY,
                //     orderType, // OrderType.ORDER_TYPE_LIMIT,
                //     orderId, //: 'abc-fsdfdsfsdf-2',
                // });
                // console.log('^my');

                return await orders.postOrder({
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

        const getOrders = async accountId => {
            try {
                return await orders.getOrders({
                    accountId,
                });
            } catch (e) { logger(1, e) }
        };

        const cancelOrder = async (accountId, orderId) => {
            try {
                return await orders.cancelOrder({
                    accountId,
                    orderId,
                });
            } catch (e) { logger(1, e) }
        };

        const cacheState = (figi, time, lastPrice, orderBook) => {
            try {
                const fileName = getRobotStateCachePath(figi, time);

                // Здесь логично поставить или,
                // но lastPrice приходит и в выходные.
                // С учётом большого объёма данных думаю можно пренебречь.
                if (lastPrice && orderBook) {
                    fs.writeFileSync(fileName, JSON.stringify([lastPrice, orderBook]) + '\r\n', { flag: 'a' });
                }
            } catch (e) { logger(0, e) }
        };

        const getPortfolio = async accountId => {
            try {
                // {"totalAmountShares":{"currency":"rub","units":2424,"nano":800000000},"totalAmountBonds":{"currency":"rub","units":0,"nano":0},"totalAmountEtf":{"currency":"rub","units":0,"nano":0},"totalAmountCurrencies":{"currency":"rub","units":9533,"nano":350000000},"totalAmountFutures":{"currency":"rub","units":0,"nano":0},"expectedYield":{"units":0,"nano":-340000000},"positions":[{"figi":"BBG004730N88","instrumentType":"share","quantity":{"units":20,"nano":0},"averagePositionPrice":{"currency":"rub","units":123,"nano":270000000},"expectedYield":{"units":-40,"nano":-600000000},"currentNkd":{"currency":"rub","units":0,"nano":0},"currentPrice":{"currency":"rub","units":121,"nano":240000000},"averagePositionPriceFifo":{"currency":"rub","units":123,"nano":270000000},"quantityLots":{"units":2,"nano":0}}]}
                return await operations.getPortfolio({ accountId });
            } catch (e) { logger(1, e) }
        };

        const getPositions = async accountId => {
            try {
                // {"money":[{"currency":"rub","units":9533,"nano":350000000}],"blocked":[],"securities":[{"figi":"BBG004730N88","blocked":0,"balance":20}],"limitsLoadingInProgress":false,"futures":[]}
                return await operations.getPositions({ accountId });
            } catch (e) { logger(1, e) }
        };

        const orderBookSubscribe = figi => {
            try {
                function getCreateSubscriptionOrderBookRequest() {
                    return MarketDataRequest.fromJSON({
                        subscribeOrderBookRequest: {
                            subscriptionAction: SubscriptionAction.SUBSCRIPTION_ACTION_SUBSCRIBE,
                            instruments: [{ figi, depth: 50 }],
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
        const getOperations = async (operations, accountId, figi, to, state = 1, from = new Date()) => { // eslint-disable-line max-params
            const f = getFromMorning(from);
            let t;

            if (!to) {
                t = getToEvening(from);
            } else {
                t = getToEvening(to);
            }

            // {"operations":[{"id":"31271365988","parentOperationId":"","currency":"rub","payment":{"currency":"rub","units":0,"nano":0},"price":{"currency":"rub","units":108,"nano":340000000},"state":2,"quantity":10,"quantityRest":10,"figi":"BBG004730N88","instrumentType":"share","date":"2022-05-11T14:53:06.915Z","type":"Покупка ЦБ","operationType":15,"trades":[]},{"id":"31271326321","parentOperationId":"","currency":"rub","payment":{"currency":"rub","units":0,"nano":0},"price":{"currency":"rub","units":124,"nano":0},"state":2,"quantity":10,"quantityRest":10,"figi":"BBG004730N88","instrumentType":"share","date":"2022-05-11T14:51:01.318Z","type":"Продажа ЦБ","operationType":22,"trades":[]},{"id":"2662384173","parentOperationId":"31271271951","currency":"rub","payment":{"currency":"rub","units":0,"nano":-310000000},"price":{"currency":"rub","units":0,"nano":0},"state":1,"quantity":0,"quantityRest":0,"figi":"BBG004730N88","instrumentType":"share","date":"2022-05-11T14:48:10.777Z","type":"Удержание комиссии за операцию","operationType":19,"trades":[]},{"id":"31271271951","parentOperationId":"","currency":"rub","payment":{"currency":"rub","units":-1234,"nano":-200000000},"price":{"currency":"rub","units":123,"nano":420000000},"state":1,"quantity":10,"quantityRest":0,"figi":"BBG004730N88","instrumentType":"share","date":"2022-05-11T14:48:09.777Z","type":"Покупка ЦБ","operationType":15,"trades":[{"tradeId":"5370694474","dateTime":"2022-05-11T14:48:09.777Z","quantity":10,"price":{"currency":"rub","units":123,"nano":420000000}}]},{"id":"31271197970","parentOperationId":"","currency":"rub","payment":{"currency":"rub","units":0,"nano":0},"price":{"currency":"rub","units":125,"nano":0},"state":2,"quantity":10,"quantityRest":10,"figi":"BBG004730N88","instrumentType":"share","date":"2022-05-11T14:44:19.347Z","type":"Продажа ЦБ","operationType":22,"trades":[]},{"id":"2662346063","parentOperationId":"31271158513","currency":"rub","payment":{"currency":"rub","units":0,"nano":-310000000},"price":{"currency":"rub","units":0,"nano":0},"state":1,"quantity":0,"quantityRest":0,"figi":"BBG004730N88","instrumentType":"share","date":"2022-05-11T14:42:26.763Z","type":"Удержание комиссии за операцию","operationType":19,"trades":[]},{"id":"31271158513","parentOperationId":"","currency":"rub","payment":{"currency":"rub","units":-1231,"nano":-200000000},"price":{"currency":"rub","units":123,"nano":120000000},"state":1,"quantity":10,"quantityRest":0,"figi":"BBG004730N88","instrumentType":"share","date":"2022-05-11T14:42:25.763Z","type":"Покупка ЦБ","operationType":15,"trades":[{"tradeId":"5370680537","dateTime":"2022-05-11T14:42:25.763Z","quantity":10,"price":{"currency":"rub","units":123,"nano":120000000}}]}]}
            // {"operations":[{"id":"2670843563","parentOperationId":"31294360696","currency":"rub","payment":{"currency":"rub","units":0,"nano":-300000000},"price":{"currency":"rub","units":0,"nano":0},"state":1,"quantity":0,"quantityRest":0,"figi":"BBG004730N88","instrumentType":"share","date":"2022-05-13T11:30:03.663Z","type":"Удержание комиссии за операцию","operationType":19,"trades":[]},{"id":"31294360696","parentOperationId":"","currency":"rub","payment":{"currency":"rub","units":1199,"nano":100000000},"price":{"currency":"rub","units":119,"nano":910000000},"state":1,"quantity":10,"quantityRest":0,"figi":"BBG004730N88","instrumentType":"share","date":"2022-05-13T11:30:02.663Z","type":"Продажа ЦБ","operationType":22,"trades":[{"tradeId":"5393788838","dateTime":"2022-05-13T11:30:02.663Z","quantity":10,"price":{"currency":"rub","units":119,"nano":910000000}}]}]}
            try {
                return await operations.getOperations({ accountId, figi, from: f, to: t, state });
            } catch (e) {
                logger(1, e);
            }
        };

        app.get('/robots/start/:figi', async (req, res) => {
            try {
                if (robotStarted) {
                    return res.json(robotStarted);
                }

                const name = req.query.name;
                const backtest = req.query.backtest;
                const robot = new bots[name](
                    req.query.accountId,
                    Number(req.query.adviser),
                    Number(req.query.backtest),
                    {
                        subscribes: {
                            lastPrice: lastPriceSubscribe(req.params.figi),
                            orderbook: orderBookSubscribe(req.params.figi),
                        },
                        cacheState,
                        postOrder,
                        getOrders,
                        cancelOrder,
                        getPortfolio,
                        getPositions,
                        getOperations,
                    },
                    { enums: {
                        CandleInterval,

                        InstrumentStatus,
                        InstrumentIdType,
                        SubscriptionInterval,
                        OrderDirection,
                        OrderType,
                    } },
                );

                if (bots[name]) {
                    robotStarted = {
                        // figi: req.params.figi,
                        // date: req.query.date,
                        // interval: req.query.interval,
                        robot,

                        // backtest,
                        name,
                    };

                    robotStarted.robot.start();

                    if (backtest) {
                        robot.setBacktestState(0, req.query.interval, req.params.figi, req.query.date);
                    }
                }

                return res.json(robotStarted);
            } catch (err) {
                logger(0, err);
            }
        });

        app.get('/robots/backtest/step/:step', async (req, res) => {
            try {
                const step = Number(req.params.step);

                if (!robotStarted || !step || step < 1) {
                    return res.status(404).end();
                }

                const {
                    robot,
                } = robotStarted;

                if (!robot) {
                    return res.status(404).end();
                }

                const { figi, interval, date } = robot.getBacktestState();

                robot.setBacktestState(step);

                const candles = await getCandlesToBacktest(figi, interval, date, step);

                // TODO: брать по времени свечи, а не шагу
                const orderbook = getCachedOrderBook(figi, date);

                if (!candles && !orderbook) {
                    return res.status(404).end();
                }

                const lastPrice = candles && candles[candles.length - 1] && candles[candles.length - 1].close;

                robotStarted.robot.setCurrentState(
                    lastPrice,
                    candles,
                    undefined,
                    undefined,
                    orderbook,
                );

                //setTimeout(() => {
                return res.json(robotStarted.robot.getPositions());

                //}, (robotStarted.robot.getParams['timer'] + 50));

                // robotStarted.robot.
            } catch (err) {
                logger(0, err);
            }
        });
    };

    app.get('/robots/getnames', async (req, res) => {
        try {
            return res.json(Object.keys(bots));
        } catch (err) {
            logger(0, err);
        }
    });

    app.get('/robots/status', async (req, res) => {
        if (robotStarted && robotStarted.robot) {
            return res.json(robotStarted.robot.getBacktestState());
        }

        return res.status(404).end();
    });

    app.get('/robots/stop', async (req, res) => {
        if (robotStarted && robotStarted.robot) {
            robotStarted.robot.stop();
        }

        robotStarted = undefined;

        return res.json({});
    });

    module.exports = {
        robotConnector,
    };
} catch (error) {
    logger(0, error);
}
