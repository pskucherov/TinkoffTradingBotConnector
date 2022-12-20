const path = require('path');
const { app } = require('../server');
const { logger, sdkLogger } = require('../logger');
const fs = require('fs');

const config = require('../../config');
const { getCandles, getCachedOrderBook, getRobotStateCachePath, getFigiData, getTradingSchedules, getFinamCandles } = require('../getHeadsInstruments');
const { getFromMorning, getToEvening } = require('../utils');
const { getSelectedToken } = require('../tokens');
const { getPortfolio, getPositions, getOrders, startRobot } = require('./tinkoffApi');
const { saveStartedRobot, delStartedRobot } = require('./state');
const { cacheState } = require('./utils');

let robotStarted;
let allRobotsInProgress;
let bots;

const getCandlesToBacktest = async (sdkObj, figi, interval, date, step) => {
    const { brokerId } = getSelectedToken(1);
    const funcGetCandles = brokerId === 'FINAM' ? getFinamCandles : getCandles;

    date = Number(date);
    const from = new Date(date);
    const to = new Date(date);

    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);

    const { candles } = await funcGetCandles(sdkObj, figi, interval, from.getTime(), to.getTime());

    if (!candles || !candles.length) {
        return;
    }

    return candles.slice(0, step);
};

try {
    const finamRobotConnector = (sdkObj, botLib) => { // eslint-disable-line
        if (!sdkObj.sdk || !botLib) {
            return;
        }

        const { sdk } = sdkObj;

        bots = botLib.bots;

        // robotStarted = botLib.robotsStarted; // TODO: выбрать нужный (?)

        app.get('/robots/tconnectordebug', async (req, res) => {
            const answer = { ...sdk };

            delete answer.securities;
            delete answer.subscribes;
            delete answer.shares;
            delete answer.futures;

            return res.json(answer);
        });

        const getOrders = async (accountId, figi) => {
            if (!figi) {
                return [];
            }

            try {
                const o = await sdk.getOrders(figi);

                return { orders: o || [] };
            } catch (e) { logger(1, e) }
        };

        const cancelOrder = async (accountId, orderId) => {
            try {
                return await sdk.cancelOrder(orderId);
            } catch (e) { logger(1, e) }
        };

        const getFinamPositions = async () => {
            try {
                // {"totalAmountShares":{"currency":"rub","units":2424,"nano":800000000},"totalAmountBonds":{"currency":"rub","units":0,"nano":0},"totalAmountEtf":{"currency":"rub","units":0,"nano":0},"totalAmountCurrencies":{"currency":"rub","units":9533,"nano":350000000},"totalAmountFutures":{"currency":"rub","units":0,"nano":0},"expectedYield":{"units":0,"nano":-340000000},"positions":[{"figi":"BBG004730N88","instrumentType":"share","quantity":{"units":20,"nano":0},"averagePositionPrice":{"currency":"rub","units":123,"nano":270000000},"expectedYield":{"units":-40,"nano":-600000000},"currentNkd":{"currency":"rub","units":0,"nano":0},"currentPrice":{"currency":"rub","units":121,"nano":240000000},"averagePositionPriceFifo":{"currency":"rub","units":123,"nano":270000000},"quantityLots":{"units":2,"nano":0}}]}
                const p = await sdk.getPortfolioAsync();

                return { positions: p && p.security || [] };
            } catch (e) { logger(1, e) }
        };

        const getQuotationsAndOrderbook = figi => {
            try {
                // {"totalAmountShares":{"currency":"rub","units":2424,"nano":800000000},"totalAmountBonds":{"currency":"rub","units":0,"nano":0},"totalAmountEtf":{"currency":"rub","units":0,"nano":0},"totalAmountCurrencies":{"currency":"rub","units":9533,"nano":350000000},"totalAmountFutures":{"currency":"rub","units":0,"nano":0},"expectedYield":{"units":0,"nano":-340000000},"positions":[{"figi":"BBG004730N88","instrumentType":"share","quantity":{"units":20,"nano":0},"averagePositionPrice":{"currency":"rub","units":123,"nano":270000000},"expectedYield":{"units":-40,"nano":-600000000},"currentNkd":{"currency":"rub","units":0,"nano":0},"currentPrice":{"currency":"rub","units":121,"nano":240000000},"averagePositionPriceFifo":{"currency":"rub","units":123,"nano":270000000},"quantityLots":{"units":2,"nano":0}}]}
                const q = sdk.getQuotations(figi);

                return q || {};
            } catch (e) { logger(1, e) }
        };

        const postOrder = async (accountId, figi, quantity, price, direction, orderType, orderId) => { // eslint-disable-line max-params
            try {
                const order = await sdk.newOrder(figi, price, quantity,
                    direction === 1 ? 'B' : 'S', robotStarted.robot.name,
                );

                if (typeof order === 'string') {
                    logger(1, order);

                    return false;
                }

                return order;
            } catch (e) { logger(1, e) }
        };

        app.get('/robots/cancelorder', async (req, res) => {
            try {
                const {
                    transactionid,
                } = req.query;

                await cancelOrder(0, transactionid);

                return res.status(404).end();
            } catch (err) {
                logger(0, err);
            }
        });

        app.get('/robots/cancelposition', async (req, res) => {
            try {
                const {
                    figi, direction, lots,
                } = req.query;

                // Приходит direction текущей позиции. 1 - B, 2 - S.
                // Для закрытия позиции выставляем противоположную.
                const order = await sdk.newOrder(figi, 0, Number(lots),
                    Number(direction) === 1 ? 'S' : 'B', robotStarted.robot.name,
                );

                if (typeof order === 'string') {
                    logger(1, order);

                    return res.status(404).end();
                }

                return res.json(order);
            } catch (err) {
                logger(0, err);
            }
        });

        app.get('/robots/start/:figi', async (req, res) => {
            try {
                if (robotStarted) {
                    return res.json(robotStarted);
                }

                const name = req.query.name;
                const backtest = Number(req.query.backtest);
                const { figi } = req.params;

                const robot = new bots[name](
                    req.query.accountId,
                    Number(req.query.adviser),
                    Number(req.query.backtest),
                    {
                        subscribes: {
                            // lastPrice: lastPriceSubscribe(figi),
                            // orderbook: orderBookSubscribe(figi),
                            // orders: ordersStream.tradesStream,
                        },

                        // getTradingSchedules: getTradingSchedules.bind(this, sdkObj.sdk),
                        cacheState,

                        postOrder,

                        getOrders,

                        // getOrderState,
                        cancelOrder,
                        getPortfolio: getFinamPositions,
                        getQuotationsAndOrderbook,

                        // getPositions,
                        // getOperations,
                    },
                    {
                        token: getSelectedToken(),
                        enums: {
                            // CandleInterval,
                            // InstrumentStatus,
                            // InstrumentIdType,
                            // SubscriptionInterval,
                            OrderDirection: {
                                ORDER_DIRECTION_BUY: 1,
                                ORDER_DIRECTION_SELL: 2,
                            },

                            OrderType: {
                                ORDER_TYPE_LIMIT: 1,
                                ORDER_TYPE_MARKET: 2,
                            },
                        },
                        isSandbox: false,
                        brokerId: 'FINAM',
                    },
                );

                if (bots[name]) {
                    const type = bots[name].type;

                    robotStarted = {
                        robot,
                        name,
                        type,
                    };

                    botLib.robotsStarted.push(robotStarted);

                    robot.start();

                    // saveStartedRobot(req.query.accountId, name);

                    let tickerInfo;
                    const splittedFigi = figi.split(',');

                    if (splittedFigi.length === 1) {
                        tickerInfo = await sdk.getInfoByFigi(figi);
                    } else {
                        tickerInfo = splittedFigi.map(async f => await sdk.getInfoByFigi(f)).filter(f => Boolean(f));
                    }

                    if (backtest) {
                        robot.setBacktestState(0, req.query.interval, figi, req.query.date, {
                            figi: splittedFigi.length === 1 ? figi : splittedFigi,
                            tickerInfo,
                            type,
                        });
                    } else {
                        robot.setCurrentState(undefined, undefined, undefined, undefined, {
                            figi: splittedFigi.length === 1 ? figi : splittedFigi,
                            tickerInfo,
                            type,
                        });
                    }
                }

                return res.json({
                    ...robotStarted,
                });
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

                const candles = await getCandlesToBacktest(sdkObj, figi, interval, date, step);

                // TODO: брать по времени свечи, а не шагу
                const orderbook = getCachedOrderBook(figi, date);

                if (!candles && !orderbook) {
                    return res.status(404).end();
                }

                const lastPrice = candles && candles[candles.length - 1] && candles[candles.length - 1].close;

                robotStarted.robot.setCurrentState(
                    sdk.priceToObject(lastPrice),
                    candles,
                    undefined,
                    orderbook,
                );

                //setTimeout(() => {
                return res.json(await robotStarted.robot.getPositions());

                //}, (robotStarted.robot.getParams['timer'] + 50));

                // robotStarted.robot.
            } catch (err) {
                logger(0, err);
            }
        });
    };

    const getRobot = () => {
        return robotStarted || allRobotsInProgress && allRobotsInProgress[0];
    };

    const clearRobot = () => {
        robotStarted = undefined;
        allRobotsInProgress && allRobotsInProgress[0] && allRobotsInProgress.pop();
    };

    const robotConnector = (sdkObj, botLib, isSandbox) => { // eslint-disable-line
        if (!sdkObj.sdk || !botLib) {
            return;
        }

        bots = botLib.bots;
        allRobotsInProgress = botLib.robotsStarted;

        app.get('/robots/start/:figi', async (req, res) => {
            let robotStarted = getRobot();

            try {
                if (robotStarted) {
                    return res.json(robotStarted);
                }

                robotStarted = await startRobot(sdkObj, botLib, isSandbox,
                    req.params.figi, req.query);

                return res.json(robotStarted);
            } catch (err) {
                logger(0, err);
            }
        });

        app.get('/robots/start', async (req, res) => {
            let robotStarted = getRobot();

            try {
                if (robotStarted) {
                    return res.json(robotStarted);
                }

                robotStarted = await startRobot(sdkObj, botLib, isSandbox, [], req.query);

                return res.json(robotStarted);
            } catch (err) {
                logger(0, err);
            }
        });

        app.get('/robots/cancelorder', async (req, res) => {
            const robotStarted = getRobot();

            try {
                const {
                    transactionid,
                } = req.query;

                if (robotStarted && robotStarted.robot) {
                    robotStarted.robot.cancelOrder(transactionid);

                    return res.json({});
                }

                return res.status(404).end();
            } catch (err) {
                logger(0, err);
            }
        });

        app.get('/robots/backtest/step/:step', async (req, res) => {
            const robotStarted = getRobot();

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

                const candles = await getCandlesToBacktest(sdkObj, figi, interval, date, step);

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
                    orderbook,
                );

                //setTimeout(() => {
                return res.json(await robotStarted.robot.getPositions());

                //}, (robotStarted.robot.getParams['timer'] + 50));

                // robotStarted.robot.
            } catch (err) {
                logger(0, err);
            }
        });
    };

    app.get('/robots/getnames', async (req, res) => {
        try {
            return res.json(Object.keys(bots).map(k => {
                return {
                    name: k,
                    type: bots[k].type,
                };
            }));
        } catch (err) {
            logger(0, err);
        }
    });

    app.get('/robots/status', async (req, res) => {
        const robotStarted = getRobot();

        if (robotStarted && robotStarted.robot) {
            const state = robotStarted.robot.getCurrentState();

            return res.json({
                ...(state.backtest ?
                    robotStarted.robot.getBacktestState() :
                    state),
                positions: await robotStarted.robot.getPositions(),
                orders: await robotStarted.robot.getOrders(),
                tickerInfo: robotStarted.robot.getTickerInfo(),
                type: robotStarted.type,
            });
        }

        return res.status(404).end();
    });

    /**
     * Получает список файлов с логами работы робота и сортирует их в порядке убывания даты создания.
     */
    const getLogsFiles = (bots, name, accountId, date, figi) => {
        return (bots[name].getLogFiles(name, accountId, figi, new Date(date).getTime()))
            .sort((a, b) => {
                return a > b ? -1 : a === b ? 0 : 1;
            });
    };

    app.get('/robots/logs/last/:figi', async (req, res) => {
        const {
            name,
            accountId,
            date,
        } = req.query;

        const { figi } = req.params;

        if (name && bots[name]) {
            const logs = getLogsFiles(bots, name, accountId, date, figi)
                .filter(l => Boolean(l)).slice(0, 2);
            const figiData = {};

            const answ = await logs.reduce(async (prev, l) => {
                const log = bots[name].getLogs(name, accountId, figi, l);

                if (!log || !log.length) {
                    return prev;
                }

                prev[new Date(l).toLocaleString('ru', config.dateOptions)] = log;

                await Promise.all(
                    log.map(async cur => {
                        if (cur.figi && !figiData[cur.figi]) {
                            figiData[cur.figi] = await getFigiData(cur.figi);
                        }
                    }),
                );

                return prev;
            }, {});

            return res.json([answ, figiData]);
        }

        return res.status(404).end();
    });

    app.get('/robots/logs/files/:figi', async (req, res) => {
        const {
            name,
            accountId,
            date,
        } = req.query;

        const { figi } = req.params;

        if (name && bots[name]) {
            const logs = await getLogsFiles(bots, name, accountId, date, figi);

            if (logs) {
                return res.json(logs);
            }
        }

        return res.status(404).end();
    });

    app.get('/robots/logs/:figi', async (req, res) => {
        const {
            name,
            accountId,
            date,
        } = req.query;

        const { figi } = req.params;

        if (name && bots[name]) {
            const logs = await (bots[name].getLogs(name, accountId, figi, Number(date)));

            if (logs) {
                return res.json(logs);
            }
        }

        return res.status(404).end();
    });

    /**
     * Возвращает настройки робота.
     */
    app.get('/robots/getsettings/:name', async (req, res) => {
        const { name } = req.params;
        const {
            accountId, figi,
        } = req.query;

        if (name && bots[name]) {
            const settings = await (bots[name].getSettings(name, accountId, figi));

            if (settings) {
                return res.json(settings);
            }
        }

        return res.status(404).end();
    });

    /**
     * Устанавливает настройки робота для онлайн и оффлайн режимов робота.
     */
    app.get('/robots/setsettings/:name', async (req, res) => {
        const { name } = req.params;
        const {
            isAdviser, takeProfit, stopLoss, lotsSize,
            su, sn, ru, rn, accountId, figi,
            volume,
        } = req.query;

        const newSettings = {
            isAdviser: Number(isAdviser), takeProfit, stopLoss, volume, lotsSize,
            su, sn, ru, rn,
        };

        Object.keys(req.query).forEach(name => {
            if (typeof newSettings[name] === 'undefined') {
                newSettings[name] = req.query[name];
            }
        });

        if (robotStarted && robotStarted.robot && robotStarted.name === name) {
            robotStarted.robot.setCurrentSettings(newSettings);

            return res.json({ ok: 1 });
        } else if (name && bots[name]) {
            bots[name].setSettings(name, newSettings, accountId, figi);

            return res.json({ ok: 1 });
        }

        return res.status(404).end();
    });

    app.get('/robots/stop', async (req, res) => {
        const robotStarted = getRobot();

        if (await robotStarted?.robot) {
            delStartedRobot(robotStarted.robot.accountId, robotStarted.robot.name);
            robotStarted.robot.stop();
            delete robotStarted.robot;
        }

        clearRobot();

        return res.json({});
    });

    app.get('/robots/debug', async (req, res) => {
        const robotStarted = getRobot();

        if (robotStarted && robotStarted.robot) {
            return res.json(robotStarted.robot);
        }

        return res.json({});
    });

    module.exports = {
        robotConnector,
        finamRobotConnector,
    };
} catch (error) {
    logger(0, error);
}
