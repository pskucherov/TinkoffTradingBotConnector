const config = require('./config');
const { logger } = require('./modules/logger');

try {
    const { createSdk } = require('tinkoff-sdk-grpc-js');

    const { app } = require('./modules/server');
    const { tokenRequest, getSelectedToken } = require('./modules/tokens');
    const { getFutures, getShares, getBlueChipsShares,
        getBlueChipsFutures, getFigiData, getTradingSchedules } = require('./modules/getHeadsInstruments');

    const token = getSelectedToken() || config.defaultToken;

    // TODO: изменить руками или в процессе создания робота.
    const appName = config.appName || 'pskucherov.tinkofftradingbot';
    let sdk;

    if (!token) {
        logger(0, 'Нет выбранного токена. Добавьте в src/config.js руками или через opexviewer.');
    } else {
        sdk = createSdk(token, appName);
    }

    // Ответ сервера, чтобы проверен что запущен.
    app.get('*/check', (req, res) => {
        return res
            .status(200)
            .json({ status: true });
    });

    // CRUD токенов.
    tokenRequest(createSdk, app);

    // Получение списка фьючерсов и акций, если их нет.
    (async () => {
        if (sdk) {
            const futures = await getFutures(sdk);

            futures && futures.updateDate && logger(0, 'Дата обновления списка фьючерсов: ' + futures.updateDate);

            const shares = await getShares(sdk);

            shares && shares.updateDate && logger(0, 'Дата обновления списка акций: ' + shares.updateDate);

            // const futureByFIGI = await sdk.instruments.futureBy({
            //     idType: sdk.InstrumentIdType.INSTRUMENT_ID_TYPE_FIGI,
            //     id: 'FUTMGNT03220',
            //   });

            // const candles = await sdk.instruments.tradingSchedules({
            //     exchange: 'MOEx',
            //     from: new Date(),
            //     to: new Date(),
            // });

            // const candles = await sdk.marketData.getCandles({
            //     figi: 'FUTMGNT06220',
            //     from: new Date('2022-04-25T00:00:00Z'),
            //     to: new Date('2022-04-25T24:00:00Z'),
            //     interval: sdk.CandleInterval.CANDLE_INTERVAL_5_MIN,
            // });
            // const fs = require('fs');
            // fs.writeFileSync('./mgnt.txt', JSON.stringify(candles));

            // console.log(JSON.stringify(candles));
        } else {
            logger(0, 'Укажите token для получения фьючерсов и акций.');
        }
    })();

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
                .json(getBlueChipsFutures(sdk));
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
            const data = await getTradingSchedules(sdk, req.query.exchange, req.query.from, req.query.to);

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

        const from = new Date();

        from.setHours(0, 0, 0, 0);

        const to = new Date();

        to.setHours(23, 59, 59, 999);

        try {
            const candles = await sdk.marketData.getCandles({
                figi,
                from,
                to,

                // from: req.query.from,
                // to: req.query.to,
                interval: 2,
            });

            // fs.writeFileSync('./mgnt.txt', JSON.stringify(candles));

            return res
                .json(candles);
        } catch (error) {
            logger(0, error, res);
        }
    });

    let a;
    const b = { b: 0 };

    app.get('/', async (req, res) => {
        try {

            // for (let i = 0; i <= 1000000; i++ ) {
            // b.b++;
            // res.write(JSON.stringify(b));
            // }
            // return;

            // if (a) {
            //     for await (const num of a) {
            //         //console.log(JSON.stringify(num));
            //         //res.write(JSON.stringify(num));
            //         res.write(JSON.stringify(num));
            //     }
            //     return;
            // };
            // const { marketDataStreamService, MarketDataStreamService, marketDataStream, SubscriptionAction, SubscriptionInterval, MarketDataRequest  } = sdk;

            // let keepCalling = true;

            // const timer = (time) => new Promise(resolve => setTimeout(resolve, time));

            // async function* createSubscriptionOrderBookRequest() {
            //     while (keepCalling) {
            //       await timer(50);
            //       yield MarketDataRequest.fromJSON({
            //         subscribeLastPriceRequest: {
            //           subscriptionAction: SubscriptionAction.SUBSCRIPTION_ACTION_SUBSCRIBE,
            //           instruments: [{ figi: 'FUTMGNT06220', interval: 1 }],
            //         },
            //       });
            //     }
            //   }

            //   const response = marketDataStream.marketDataStream(createSubscriptionOrderBookRequest());
            //   a = response;
            //      console.log('qwe');
            //     for await (const num of response) {
            //         //console.log(JSON.stringify(num));
            //         //res.write(JSON.stringify(num));
            //         res.write(JSON.stringify(num));
            //     }

            // // return res
            // //     .json(await checkToken(sdk));
        } catch (error) {
            logger(0, error, res);
        }
    });

    function checkToken(sdk) {
        return sdk.users.getAccounts();
    }
} catch (error) {
    logger(0, error);
}
