const path = require('path');
const chokidar = require('chokidar');
const configFile = path.join(__dirname, './config.js');

const config = require(configFile);
const { logger } = require('./modules/logger');
const { tokenRequest } = require('./modules/tokens');

const options = { year: 'numeric', month: 'numeric', day: 'numeric' };

// Логи ошибок пишутся отдельно для TinkoffApi и http сервера.
const logsServerFileName = path.join(__dirname, '../logs/server/' + new Date().toLocaleString(undefined, options) + '.txt');

// Ответ сервера, чтобы проверен что запущен.
app.get('*/check', (req, res) => {
    return res
        .status(200)
        .json({ status: true });
});

// CRUD токенов.
tokenRequest(createSdk, app, logsServerFileName);

app.get('/logs', async (req, res) => {
    const path = require('path');

    const options = { year: 'numeric', month: 'numeric', day: 'numeric' };
    const dateStr = new Date().toLocaleString(undefined, options);

    const fs = require('fs');
    
    const dataPath = path.join(__dirname, `../logs/server/${dateStr}.txt`);

    fs.readFile(dataPath, (err, data) => {
        if (err) {
            throw err;
        }

        res.send(data);
    });
});



app.get('/', async (req, res) => {
    try {
        const sdk = createSdk(req.query.token, req.query.appname);

        return res
            .json(await checkToken(sdk));
    } catch (error) {
        logger(logsServerFileName, error, res);
    }
});

function checkToken(sdk) {
    return sdk.users.getAccounts();
    const hmr = require('node-hmr');

try {
    const { createSdk } = require('tinkoff-sdk-grpc-js');

    const { app } = require('./modules/server');
    const { tokenRequest, getSelectedToken } = require('./modules/tokens');
    const { getFutures, getShares, getBlueChipsShares,
        getBlueChipsFutures, getFigiData, getTradingSchedules,
        getCandles } = require('./modules/getHeadsInstruments');

    let token;
    let tokenFromJson = getSelectedToken();

    // За изменение json файла наблюдаем отдельно,
    // т.к. hmr его не подтягивает.
    // TODO: сохранять токен из запроса без вотчинга файла.
    chokidar
        .watch([config.files.tokens])
        .on('all', () => {
            tokenFromJson = getSelectedToken();
            if (tokenFromJson) {
                token = tokenFromJson;
            }
        });

    // Следим за изменением конфига,
    // чтобы не перезагружать сервер.
    hmr(() => {
        token = tokenFromJson || config.defaultToken;
    }, { watchDir: '../', watchFilePatterns: [
        configFile,
    ] });

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

        try {
            const candles = await getCandles(figi, req.query.interval, req.query.from, req.query.to);

            return res
                .json(candles);
        } catch (error) {
            logger(0, error, res);
        }
    });

    // let a;
    // const b = { b: 0 };

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
   