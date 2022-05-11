const path = require('path');
const { logger } = require('../logger');

const { accountsRequest } = require('../accounts');
const { getFutures, getShares, getBlueChipsShares,
    getBlueChipsFutures, getFigiData, getTradingSchedules,
    getCandles } = require('./index');

try {
    // Получение списка фьючерсов и акций, если их нет.
    // Устанавливает crud для аккаунтов.
    // Выполняется один раз при старте сервера после добавления токена.
    let prepared = false;
    const prepareServer = async (sdk, app) => {
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

    const instrumentsRequest = (sdk, app) => {
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

        app.get('/getcachedorderbook/:figi', async (req, res) => {
            try {
                const figi = req.params.figi;
                const time = req.query.time;
                const bufOrderBookFile = path.resolve(__dirname, `../data/cachedorderbooks/${figi}/buf.json`);

                const fs = require('fs');
                const file = fs.readFileSync(bufOrderBookFile, 'utf8');

                if (!file) {
                    return res.status(404).end();
                }

                const data = JSON.parse(file);

                if (!time) {
                    return res
                        .json(data);
                }

                if (!data[time]) {
                    return res.status(404).end();
                }

                return res
                    .json(data[time]);
            } catch (error) {
                logger(0, error, res);
            }
        });
    };

    module.exports = {
        prepareServer,
        instrumentsRequest,
    };
} catch (error) {
    logger(0, error);
}
