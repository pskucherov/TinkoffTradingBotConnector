const path = require('path');
const chokidar = require('chokidar');
const configFile = path.join(__dirname, './config.js');

let config = require(configFile);
const { logger, sdkLogger } = require('./modules/logger');
const hmr = require('node-hmr');

try {
    const { createSdk } = require('tinkoff-sdk-grpc-js');

    const { app } = require('./modules/server');
    const { tokenRequest, getSelectedToken } = require('./modules/tokens');
    const { accountsRequest } = require('./modules/accounts');
    const { getFutures, getShares, getBlueChipsShares,
        getBlueChipsFutures, getFigiData, getTradingSchedules,
        getCandles } = require('./modules/getHeadsInstruments');

    // TODO: изменить руками или в процессе создания робота.
    const appName = config.appName || 'pskucherov.tinkofftradingbot';

    // Сохрянем sdk в объект для hmr, чтобы после смены токена ссылка на sdk сохранялась.
    const sdk = { sdk: undefined };
    let token;
    let tokenFromJson = getSelectedToken();

    // Получение списка фьючерсов и акций, если их нет.
    // Устанавливает crud для аккаунтов.
    // Выполняется один раз при старте сервера после добавления токена.
    let prepared = false;
    const prepareServer = async () => {
        if (prepared) {
            return;
        }

        if (sdk.sdk) {
            prepared = true;

            const futures = await getFutures(sdk.sdk);

            futures && futures.updateDate && logger(0, 'Дата обновления списка фьючерсов: ' + futures.updateDate);

            const shares = await getShares(sdk.sdk);

            shares && shares.updateDate && logger(0, 'Дата обновления списка акций: ' + shares.updateDate);

            // CRUD аккаунтов. Здесь вместо sdk передаём весь объект,
            // а содержимое берём каждый раз при запросе.
            accountsRequest(sdk, app);
        } else {
            logger(0, 'Укажите token для старта сервера.');
        }
    };

    // За изменение json файла наблюдаем отдельно,
    // т.к. hmr его не подтягивает.
    // TODO: сохранять токен из запроса без вотчинга файла.
    chokidar
        .watch([config.files.tokens])
        .on('all', () => {
            tokenFromJson = getSelectedToken();
            if (tokenFromJson) {
                token = tokenFromJson;
                sdk.sdk = createSdk(token, appName, sdkLogger);

                prepareServer();
            }
        });

    // Следим за изменением конфига.
    hmr(() => {
        config = require(configFile);
        token = tokenFromJson || config.defaultToken;
        if (token) {
            sdk.sdk = createSdk(token, appName, sdkLogger);

            prepareServer();
        }
    }, { watchFilePatterns: [
        configFile,
    ] });

    if (!token) {
        logger(0, 'Нет выбранного токена. Добавьте в src/config.js руками или через opexviewer.');
    } else {
        sdk.sdk = createSdk(token, appName, sdkLogger);
    }

    // Ответ сервера, чтобы проверен что запущен.
    app.get('*/check', (req, res) => {
        return res
            .status(200)
            .json({ status: true });
    });

    // CRUD токенов.
    tokenRequest(createSdk, app);

    app.get('/bluechipsshares', (req, res) => {
        try {
            return res
                .json(getBlueChipsShares());
        } catch (error) {
            logger(0, error, res);
        }
    });

    app.get('/bluechipsfutures', (req, res) => {
        try {
            return res
                .json(getBlueChipsFutures(sdk.sdk));
        } catch (error) {
            logger(0, error, res);
        }
    });

    app.get('/figi/:figi', (req, res) => {
        const figi = req.params.figi;

        try {
            const data = getFigiData(figi);

            if (!data) {
                return res.status(404).end();
            }

            return res
                .json(data);
        } catch (error) {
            logger(0, error, res);
        }
    });

    app.get('/tradingschedules', async (req, res) => {
        try {
            const data = await getTradingSchedules(sdk.sdk, req.query.exchange, req.query.from, req.query.to);

            if (!data) {
                return res.status(404).end();
            }

            return res.json(data);
        } catch (error) {
            logger(0, error, res);
        }
    });

    app.get('/getcandles/:figi', async (req, res) => {
        const figi = req.params.figi;

        try {
            const candles = await getCandles(sdk.sdk, figi, req.query.interval, req.query.from, req.query.to);

            return res
                .json(candles);
        } catch (error) {
            logger(0, error, res);
        }
    });

    app.get('/order', async (req, res) => {
        const figi = req.params.figi;

        try {
            const { orders, users, ordersStream, tradesStream, SubscriptionAction, TradesStreamRequest } = sdk;

            const keepCalling = true;
            const timer = time => new Promise(resolve => setTimeout(resolve, time));

            // async function* createSubscOrders() {
            //        while (keepCalling) {
            //         await timer(100);
            //         yield TradesStreamRequest.fromPartial({
            //             orderTrades: {
            //                 accounts: ['']
            //             },
            //         });
            //        }
            //   }

            //   let response1 = ordersStream.tradesStream(createSubscOrders());
            //   (async () => {
            //       for await (const num of response1) {
            //           console.log(JSON.stringify(num));
            //       }
            //   })();

            const ordersResponse = await orders.getOrders({
                accountId: '',
            });

            // console.log(JSON.stringify(ordersResponse));

            // console.log(JSON.stringify(await orders.getOrderState({
            //     accountId: '',
            //     orderId: '31257187915',
            // })));

            // console.log(JSON.stringify(await orders.cancelOrder({
            //     accountId: '',
            //     orderId: '31257187915',
            // })));

            // const setOrder = await orders.postOrder({
            //     accountId: '',
            //     figi: 'BBG006L8G4H1',
            //     quantity: 1,
            //     price: { units: 1673, nano: 0 },
            //     direction: 1, // OrderDirection.ORDER_DIRECTION_BUY,
            //     orderType: 2, // OrderType.ORDER_TYPE_LIMIT,
            //     orderId: 'abc-fsdfdsfsdf-2',
            //   });

            //   console.log('Выставление заявки: ', setOrder);
            //   console.log(JSON.stringify(setOrder));
        } catch (error) {
            logger(0, error, res);
        }
    });

    // let prevPrice;
    // let response1;
    // let response3;
    // app.get('/:figi', async (req, res) => {
    //     const figi = req.params.figi;
    //     try {

    //         const { users, marketDataStream, SubscriptionAction, MarketDataRequest  } = sdk;

    //         let keepCalling = true;

    //         const timer = (time) => new Promise(resolve => setTimeout(resolve, time));

    //         async function* createSubscriptionOrderBookRequest1() {
    //             // const f = async () => {
    //             //    while (keepCalling) {
    //             //     await timer(100);
    //                 yield MarketDataRequest.fromJSON({
    //                     subscribeLastPriceRequest: {
    //                     subscriptionAction: SubscriptionAction.SUBSCRIPTION_ACTION_SUBSCRIBE,
    //                     instruments: [{ figi }],
    //                     },
    //                 });

    //             // }  process.nextTick(f);
    //             // }
    //           }

    //           console.log(SubscriptionAction.SUBSCRIPTION_ACTION_UNSUBSCRIBE);

    //           async function* createUnsubscriptionOrderBookRequest1() {
    //             yield MarketDataRequest.fromJSON({
    //                 subscribeLastPriceRequest: {
    //                     subscriptionAction: SubscriptionAction.SUBSCRIPTION_ACTION_UNSUBSCRIBE,
    //                     instruments: [{ figi }],
    //                 },
    //             });
    //           }

    //           async function* createSubsInfo() {
    //             yield MarketDataRequest.fromJSON({
    //                 subscribeInfoRequest: {
    //                     subscriptionAction: SubscriptionAction.SUBSCRIPTION_ACTION_SUBSCRIBE,
    //                     instruments: [{ figi }],
    //                 },
    //             });
    //           }

    //            response1 || (response1 = marketDataStream.marketDataStream(createSubscriptionOrderBookRequest1()));
    //            response3 || (response3 = marketDataStream.marketDataStream(createSubsInfo()));

    //            req.on("close", async function() {
    //             console.log('close');
    //             keepCalling = false;
    //             const f = async () => {
    //                     for await (const num of marketDataStream.marketDataStream(createUnsubscriptionOrderBookRequest1()));
    //                     setInterval(async () => {
    //                         console.log('int')
    //                         for await (const l of marketDataStream.marketDataStream(createSubsInfo())) {
    //                             console.log('response33');
    //                             const z = () => {
    //                             console.log(JSON.stringify(l));
    //                             }
    //                             process.nextTick(z);
    //                         }
    //                     }, 1000);

    //                 // response1 = undefined;
    //             }
    //             process.nextTick(f);
    //         });

    //         req.on("end", function() {
    //             console.log('end');
    //             marketDataStream.marketDataStream(createUnsubscriptionOrderBookRequest1())
    //             response1 = undefined;
    //         });

    //         setInterval(async () => {
    //             console.log('interval');
    //             response1 = marketDataStream.marketDataStream(createSubscriptionOrderBookRequest1());

    //             console.log(JSON.stringify(await users.getUserTariff({})));

    //             for await (const num of response1) {
    //                 console.log(JSON.stringify(num));

    //                 const f = () => {
    //                     if (num.lastPrice) {

    //                     const currentUnicPrice = num.lastPrice.price.units + num.lastPrice.price.nano;
    //                     console.log('lastprice', currentUnicPrice, prevPrice);
    //                     if (prevPrice !== currentUnicPrice) {
    //                         console.log(JSON.stringify(num));
    //                        prevPrice = currentUnicPrice;
    //                         console.log(num.lastPrice);
    //                         res.write(JSON.stringify(num.lastPrice));
    //                     }
    //                 }
    //             }

    //                 for await (const num of response3) {
    //                     console.log('response31');
    //                     const f = () => {
    //                        console.log(JSON.stringify(num));
    //                     }
    //                     process.nextTick(f);
    //                 }

    //                 process.nextTick(f);
    //             }
    //         }, 1000);

    //     } catch (error) {
    //         logger(0, error, res);
    //     }
    // });

    // let response2;

    // app.get('/subscribecandles/:figi', async (req, res) => {
    //     const figi = req.params.figi;
    //     try {

    //         const { marketDataStream, SubscriptionAction, MarketDataRequest  } = sdk;

    //         let keepCalling = true;

    //         const timer = (time) => new Promise(resolve => setTimeout(resolve, time));

    //         async function* createSubscriptionCandlesRequest() {
    //             console.log([{ figi, interval: req.query.interval }]);
    //             // const f = async () => {
    //             while (keepCalling) {
    //                 await timer(100);
    //                 yield MarketDataRequest.fromJSON({
    //                     subscribeCandlesRequest: {
    //                         subscriptionAction: SubscriptionAction.SUBSCRIPTION_ACTION_SUBSCRIBE,
    //                         instruments: [{ figi, interval: 1
    //                             // Number(req.query.interval)
    //                          }],
    //                     },
    //                 });
    //             }
    //             // }
    //             // process.nextTick(f);
    //         }

    //         async function* createUnsubscriptionCandlesRequest() {
    //             yield MarketDataRequest.fromJSON({
    //                 subscribeCandlesRequest: {
    //                     subscriptionAction: SubscriptionAction.SUBSCRIPTION_ACTION_UNSUBSCRIBE,
    //                     instruments: [{ figi, interval: 1
    //                         // Number(req.query.interval)
    //                         }],
    //                 },
    //             });
    //         }

    //         req.on("close", function() {
    //             console.log('close 2');
    //             marketDataStream.marketDataStream(createUnsubscriptionCandlesRequest());
    //             response2 = undefined;
    //         });

    //         req.on("end", function() {
    //             console.log('end 2');
    //             marketDataStream.marketDataStream(createUnsubscriptionCandlesRequest())
    //             response2 = undefined;
    //         });

    //             response2 || (response2 = marketDataStream.marketDataStream(createSubscriptionCandlesRequest()));
    //             for await (const num of response2) {
    //                 const f = () => {
    //                 if (num.candle) {
    //                     console.log('candle')
    //                     console.log(JSON.stringify(num));
    //                     res.write(JSON.stringify(num.candle));
    //                 }
    //             }
    //             process.nextTick(f);
    //             }

    //     } catch (error) {
    //         logger(0, error, res);
    //     }
    // });
} catch (error) {
    logger(0, error);
}
