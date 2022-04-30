const fs = require('fs');
const config = require('../../config');

/**
 *
 * @param {*} sdk
 * @param {String} fileName
 * @returns
 */
const updateFutures = async (sdk, fileName) => {
    const futures = await sdk.instruments.futures({
        instrumentStatus: sdk.InstrumentStatus.INSTRUMENT_STATUS_BASE,
    });

    const data = {
        updateDate: config.dateStr,
        futures,
    };

    fs.writeFileSync(fileName, JSON.stringify(data));

    return data;
};

/**
 * Получение списка фьючерсов.
 *
 * @param {String} sdk
 * @returns
 */
const getFutures = async sdk => {
    const fileName = config.files.futures;
    const file = fs.readFileSync(fileName, 'utf8');
    const f = file && JSON.parse(file);

    if (!f || !f.futures || !f.futures.length) {
        return await updateFutures(sdk, fileName);
    }

    return f;
};

module.exports = {
    getFutures,
};
