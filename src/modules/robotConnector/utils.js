const { getRobotStateCachePath } = require('../getHeadsInstruments');
const { logger } = require('../logger');

const fs = require('fs');

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

module.exports = {
    cacheState,
};
