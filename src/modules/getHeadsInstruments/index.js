const fs = require('fs');
const path = require('path');
const config = require('../../config');
const { logger } = require('../logger');
const { orderBookCompressor } = require('../orderBookProcessing');
const { mkDirByPathSync } = require('../utils');

try {
    const getFuturesFromFile = () => {
        const fileName = config.files.futures;
        const file = fs.readFileSync(fileName, 'utf8');

        return file && JSON.parse(file);
    };

    /**
     * TODO: объёдинить с другими аналогичными методами в один.
     *
     * @returns
     */
    const getEtfsFromFile = () => {
        const fileName = config.files.etfs;

        if (fs.existsSync(fileName)) {
            const file = fs.readFileSync(fileName, 'utf8');

            return file && JSON.parse(file);
        }
    };

    /**
     * Обновление списка фьючерсов.
     *
     * @param {*} sdk
     * @returns
     */
    const updateFutures = async sdk => {
        const f = getFuturesFromFile();

        if (f && f.updateDate && f.updateDate === config.dateStr) {
            logger(0, `Фьючерсы взяты из кэша ${config.dateStr} без обновления.`);

            return f;
        }

        const futures = await sdk.instruments.futures({
            instrumentStatus: sdk.InstrumentStatus.INSTRUMENT_STATUS_BASE,
        });

        const data = {
            updateDate: config.dateStr,
            futures,
        };

        fs.writeFileSync(config.files.futures, JSON.stringify(data));

        return data;
    };

    /**
     * Обновление списка etfs.
     *
     * @param {*} sdk
     * @returns
     */
    const updateEtfs = async sdk => {
        const f = getEtfsFromFile();

        if (f && f.updateDate && f.updateDate === config.dateStr) {
            logger(0, `ETF взяты из кэша ${config.dateStr} без обновления.`);

            return f;
        }

        const etfs = await sdk.instruments.etfs({
            instrumentStatus: sdk.InstrumentStatus.INSTRUMENT_STATUS_BASE,
        });

        const data = {
            updateDate: config.dateStr,
            etfs,
        };

        fs.writeFileSync(config.files.etfs, JSON.stringify(data));

        return data;
    };

    /**
     * Получение списка фьючерсов.
     *
     * @param {String} sdk
     * @returns
     */
    const getFutures = async sdk => {
        const f = getFuturesFromFile();

        if (!f || !f.futures || !f.futures.length) {
            return await updateFutures(sdk);
        }

        return f;
    };

    /**
     * Получение списка фьючерсов.
     *
     * @param {String} sdk
     * @returns
     */
    const getEtfs = async sdk => {
        const f = getEtfsFromFile();

        if (!f || !f.etfs || !f.etfs.length) {
            return await updateEtfs(sdk);
        }

        return f;
    };

    /**
     *
     * @returns
     */
    const getSharesFromFile = () => {
        const fileName = config.files.shares;
        const file = fs.readFileSync(fileName, 'utf8');

        return file && JSON.parse(file);
    };

    /**
     * Обновление списка акций.
     *
     * @param {*} sdk
     * @returns
     */
    const updateShares = async sdk => {
        const f = getSharesFromFile();

        if (f && f.updateDate && f.updateDate === config.dateStr) {
            logger(0, `Акции взяты из кэша ${config.dateStr} без обновления.`);

            return f;
        }

        const shares = await sdk.instruments.shares({
            instrumentStatus: sdk.InstrumentStatus.INSTRUMENT_STATUS_BASE,
        });

        const data = {
            updateDate: config.dateStr,
            shares,
        };

        fs.writeFileSync(config.files.shares, JSON.stringify(data));

        return data;
    };

    /**
     * Получение списка акций.
     *
     * @param {String} sdk
     * @returns
     */
    const getShares = async sdk => {
        const f = getSharesFromFile();

        if (!f || !f.Shares || !f.Shares.length) {
            return await updateShares(sdk);
        }

        return f;
    };

    const filterData = (data, filter = 'figi,ticker,lot,name,buyAvailableFlag,sellAvailableFlag') => {
        const params = filter.split(',');
        const retData = {};

        for (const name of params) {
            if (data[name]) {
                retData[name] = data[name];
            }
        }

        return retData;
    };

    const getBlueChipsShares = () => {
        const shares = getSharesFromFile();
        const blueChips = [];

        if (shares && shares.shares && shares.shares.instruments) {
            const i = shares.shares.instruments;

            for (const share of i) {
                if (config.blueChips.includes(share.ticker)) {
                    blueChips.push(filterData(share));

                    if (blueChips.length === config.blueChips.length) {
                        break;
                    }
                }
            }
        }

        return {
            updatedDate: shares.updateDate,
            instruments: blueChips,
        };
    };

    const getBlueChipsFutures = () => {
        const futures = getFuturesFromFile();
        const blueChips = [];

        if (futures && futures.futures && futures.futures.instruments) {
            const i = futures.futures.instruments;

            for (const future of i) {
                if (config.blueChips.includes(future.basicAsset)) {
                    blueChips.push(filterData(future));
                }
            }
        }

        return {
            updatedDate: futures.updateDate,
            instruments: blueChips,
        };
    };

    const getEtfsPage = () => {
        const ets = getEtfsFromFile();

        return {
            updatedDate: ets.updateDate,
            instruments: ets.etfs.instruments,
        };
    };

    /**
     * Получить инструмент из массива данных.
     *
     * @param {*} instruments
     * @param {*} figi
     * @returns
     */
    const getInstrument = (instruments, figi) => {
        for (const i of instruments) {
            if (i.figi === figi) {
                return i;
            }
        }
    };

    /**
     * Получить расписание торгов.
     *
     * @param {*} sdk
     * @param {String[]} exchange
     * @param {String} from
     * @param {String} to
     * @returns
     */
    const getTradingSchedules = async (sdk, exchange, from, to) => {
        from = new Date(Number(from));
        to = new Date(Number(to));

        return await sdk.instruments.tradingSchedules({
            exchange,
            from,
            to,
        });
    };

    const getRobotStateCachePath = (figi, date, compressed) => {
        const dir = mkDirByPathSync(path.join(config.files.orderbookCacheDir, figi));

        if (dir) {
            const localDate = new Date(Number(date)).toLocaleString('ru', config.dateOptions);

            return path.join(dir, `${localDate}` + (compressed ? 'compressed' : '') + '.json');
        }
    };

    const getCacheCandlesPath = (figi, interval, from, to) => {
        const dir = mkDirByPathSync(path.join(config.files.candlesCacheDir, figi, interval));

        if (dir) {
            return path.join(dir, `${from.getTime()}-${to.getTime()}.json`);
        }
    };

    const getCandlesFromCache = filePath => {
        try {
            const data = fs.readFileSync(filePath);

            return data && JSON.parse(data);
        } catch (err) {
            logger(0, err);
        }
    };

    const setCandlesToCache = (filePath, data) => {
        try {
            fs.writeFile(filePath, JSON.stringify(data), err => {
                if (err) {
                    logger(0, err);
                }
            });
        } catch (err) {
            logger(0, err);
        }
    };

    /**
     * Получить свечи инструмента.
     * Пытается взять из кэша, если не получается, то сохраняет их туда.
     * Кэширование включено только для предыдущих дат.
     * Для текущего дня данные всегда без кэша
     *
     * @param {*} sdk
     * @param {String} figi
     * @param {Number} interval
     * @param {String} from
     * @param {?String} to
     * @returns
     */
    const getCandles = async (sdk, figi, interval, from, to) => {
        const { marketData } = sdk.sdk || sdk;

        let candles;

        from = new Date(Number(from));
        to = new Date(Number(to));

        // Сейчас все свечи запрашиваются по дням.
        // Если надо будет по часам, то здесь надо переделывать.
        const useCache = to < new Date();
        let filePath = useCache && getCacheCandlesPath(figi, interval, from, to);

        if (useCache && filePath && fs.existsSync(filePath)) {
            filePath = getCacheCandlesPath(figi, interval, from, to);
            candles = getCandlesFromCache(filePath);

            if (candles) {
                return candles;
            }
        }

        candles = await marketData.getCandles({
            figi,
            from,
            to,
            interval,
        });

        if (useCache && filePath) {
            setCandlesToCache(filePath, candles);
        }

        return candles;
    };

    const getLastPriceAndOrderBook = async (sdk, figi) => {
        const { marketData } = sdk.sdk || sdk;

        const lastPrice = await marketData.getLastPrices({ figi: [figi] });

        const orderBook = await marketData.getOrderBook({
            figi,
            depth: 50,
        });

        return [lastPrice, orderBook];
    };

    /**
     * Получить инструмент, найдя его в сущестующих данных.
     * TODO: в идеале брать по ключу и не перебирать весь json каждый раз.
     *
     * @param {*} figi
     * @returns
     */
    const getFigiData = figi => {
        const { futures } = getFuturesFromFile();

        if (futures && futures.instruments) {
            const f = getInstrument(futures.instruments, figi);

            if (f) {
                return f;
            }
        }

        const { shares } = getSharesFromFile();

        if (shares && shares.instruments) {
            const s = getInstrument(shares.instruments, figi);

            if (s) {
                return s;
            }
        }

        const { etfs } = getEtfsFromFile();

        if (etfs && etfs.instruments) {
            const e = getInstrument(etfs.instruments, figi);

            if (e) {
                return e;
            }
        }
    };

    // Стакан может браться только из закэшированных данных.
    const getCachedOrderBook = (figi, date) => {
        const localDate = new Date(Number(date)).toLocaleString('ru', config.dateOptions);
        const nowDate = new Date().toLocaleString('ru', config.dateOptions);
        let obFileCache;

        const obFileOrig = getRobotStateCachePath(figi, date); // path.resolve(config.files.orderbookCacheDir, figi, localDate + '.json');
        const obFile = getRobotStateCachePath(figi, date, 1); // path.resolve(config.files.orderbookCacheDir, figi, localDate + '.json');
        // const obFile = path.resolve(config.files.orderbookCacheDir, figi, localDate + 'compressedstr.json');

        if (fs.existsSync(obFileOrig) && (localDate === nowDate || !fs.existsSync(obFile))) {
            obFileCache = orderBookCompressor(obFileOrig, obFile);
        }

        if (!obFileCache && fs.existsSync(obFile)) {
            obFileCache = fs.readFileSync(obFile);
            obFileCache && (obFileCache = JSON.parse(obFileCache));
        }

        const key = new Date(Number(date));

        key.setMilliseconds(0);
        key.setSeconds(0);

        if (obFileCache) {
            return obFileCache[key.getTime()];
        }
    };

    module.exports = {
        getFutures,
        getEtfs,
        getShares,
        updateShares,

        getBlueChipsShares,
        getBlueChipsFutures,
        getEtfsPage,

        getFigiData,
        getCandles,

        getTradingSchedules,
        getCachedOrderBook,

        getLastPriceAndOrderBook,
        getRobotStateCachePath,
    };
} catch (error) {
    logger(0, error);
}
