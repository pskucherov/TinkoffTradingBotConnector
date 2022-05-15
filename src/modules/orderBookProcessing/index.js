const fs = require('fs');
const path = require('path');
const config = require('../../config');
const { logger } = require('../logger');

const demoOrderBookFile = path.resolve(__dirname, '../../../data/cachedorderbooks/FUTMGNT06220/06.05.2022.json');
const bufOrderBookFile = path.resolve(__dirname, '../../../data/cachedorderbooks/FUTMGNT06220/06.05.2022compressed.json');
const bufOrderBookFileStr = path.resolve(__dirname, '../../../data/cachedorderbooks/FUTMGNT06220/06.05.2022compressedstr.json');

try {
    const getOBFromFile = fileName => {
        const file = fs.readFileSync(fileName, 'utf8');

        return file && file.split('\r\n');
    };

    const orderBookCompressor = (filename, newFilename) => {
        const ob = getOBFromFile(filename);

        const newOrderBook = {};

        ob.forEach(s => {
            if (!s) {
                return;
            }

            const oneString = JSON.parse(s);

            if (!oneString[0] || !oneString[1]) {
                return;
            }

            const t = new Date(oneString[1].time);

            t.setMilliseconds(0);
            t.setSeconds(0);

            newOrderBook[t.getTime()] = {
                ...oneString[1],
                time: t.getTime(),
                figi: undefined,
                lastPrice: oneString[0],
            };
        });

        fs.writeFileSync(newFilename, JSON.stringify(newOrderBook));

        return newOrderBook;
    };

    // const orderBookCompressorStr = (filename, newFilename) => {
    //     const ob = getOBFromFile(filename);

    //     const newOrderBook = {};
    //     const newOrderBookStrTime = [];

    //     ob.forEach(s => {
    //         if (!s) {
    //             return;
    //         }

    //         const oneString = JSON.parse(s);
    //         const t = new Date(oneString.time);

    //         t.setMilliseconds(0);
    //         t.setSeconds(0);

    //         if (!newOrderBook[t.getTime()]) {
    //             newOrderBookStrTime.push(t.getTime());
    //         }

    //         newOrderBook[t.getTime()] = {
    //             ...oneString,
    //             time: t.getTime(),
    //             figi: undefined,
    //         };
    //     });

    //     fs.writeFileSync(newFilename, JSON.stringify(
    //         newOrderBookStrTime.map(time => newOrderBook[time]),
    //     ));
    // };

    // orderBookCompressor();
    // orderBookCompressorStr();

    module.exports = {
        getOBFromFile,

        // orderBookCompressorStr,
        orderBookCompressor,
    };
} catch (error) {
    logger(0, error);
}
