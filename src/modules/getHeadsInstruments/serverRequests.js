const { logger } = require('../logger');
const { app } = require('../server');

const { accountsRequest } = require('../accounts');
const { getFutures, getEtfs, getShares, getBlueChipsShares,
    getBlueChipsFutures, getFigiData, getTradingSchedules,
    getCandles,
    getCachedOrderBook,
    getLastPriceAndOrderBook,
    getSharesPage,
    getEtfsPage,
    getLastPriceAndOrderBook
} = require('./index');

const { getSelectedToken } = require('../tokens');


try {
    // Получение списка фьючерсов и акций, если их нет.
    // Устанавливает crud для аккаунтов.
    // Выполняется один раз при старте сервера после добавления токена.
    let prepared = false;
    const prepareServer = async sdk => {
        if (prepared) {
            return;
        }

        if (sdk.sdk) {
            prepared = true;

            // TODO: порефакторить в единый метод.
            const futures = await getFutures(sdk.sdk);

            futures && futures.updateDate && logger(0, 'Дата обновления списка фьючерсов: ' + futures.updateDate);

            const shares = await getShares(sdk.sdk);

            shares && shares.updateDate && logger(0, 'Дата обновления списка акций: ' + shares.updateDate);

            const etfs = await getEtfs(sdk.sdk);

            etfs && etfs.updateDate && logger(0, 'Дата обновления списка etf: ' + etfs.updateDate);

            // CRUD аккаунтов. Здесь вместо sdk передаём весь объект,
            // а содержимое берём каждый раз при запросе.
            accountsRequest(sdk);
        } else {
            logger(0, 'Укажите token для старта сервера.');
        }
    };

    const instrumentsRequest = sdkObj => {
        app.get('/bluechipsshares', (req, res) => {
            const { brokerId } = getSelectedToken(1);
            const { sdk } = sdkObj;

            try {
                return res.json(getBlueChipsShares(brokerId, sdk));
            } catch (error) {
                logger(0, error, res);
            }
        });

        app.get('/bluechipsfutures', (req, res) => {
            const { brokerId } = getSelectedToken(1);
            const { sdk } = sdkObj;

            try {
                return res
                    .json(getBlueChipsFutures(brokerId, sdk));
            } catch (error) {
                logger(0, error, res);
            }
        });

        app.get('/shares', (req, res) => {
            try {
                return res
                    .json(getSharesPage(sdk.sdk));
            } catch (error) {
                logger(0, error, res);
            }
        });

        app.get('/etfs', (req, res) => {
            try {
                return res
                    .json(getEtfsPage(sdk.sdk));
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
                const data = await getTradingSchedules(sdkObj.sdk, req.query.exchange, req.query.from, req.query.to);

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
                const candles = await getCandles(sdkObj.sdk, figi, req.query.interval, req.query.from, req.query.to);

                return res
                    .json(candles);
            } catch (error) {
                logger(0, error, res);
            }
        });

        app.get('/getlastpriceandorderbook/:figi', async (req, res) => {
            const figi = req.params.figi;

            try {
                return res
                    .json(await getLastPriceAndOrderBook(sdkObj.sdk, figi));
            } catch (error) {
                logger(0, error, res);
            }
        });

        app.get('/getcachedorderbook/:figi', async (req, res) => {
            try {
                const figi = req.params.figi;
                const time = req.query.time;
                const date = time ? Number(time) : new Date().getTime();

                // const bufOrderBookFile = path.resolve(__dirname, `../data/cachedorderbooks/${figi}/${figi}compressedstr.json`);

                // const isFileExists = fs.existsSync(filePath);
                // if (!isFileExists) {

                // }

                // const file = fs.readFileSync(bufOrderBookFile, 'utf8');

                // if (!file) {
                //     return res.status(404).end();
                // }

                // const data = JSON.parse(file);

                const data = getCachedOrderBook(figi, date);

                if (!data) {
                    return res.status(404).end();
                }

                return res
                    .json(data);
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
