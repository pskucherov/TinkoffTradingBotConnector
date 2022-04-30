const fs = require('fs');
const config = require('../../config');
const { logger } = require('../logger');

const getFuturesFromFile = () => {
    const fileName = config.files.futures;
    const file = fs.readFileSync(fileName, 'utf8');

    return file && JSON.parse(file);
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

module.exports = {
    getFutures,
    updateFutures,

    getShares,
    updateShares,
};
