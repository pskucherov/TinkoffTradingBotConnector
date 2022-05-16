const path = require('path');

// Логи ошибок пишутся отдельно для TinkoffApi и http сервера.
const dateOptions = { year: 'numeric', month: 'numeric', day: 'numeric' };
const dateStr = new Date().toLocaleString('ru', dateOptions);

const logsServer = path.join(__dirname, `../logs/server/${dateStr}.txt`);
const logsApi = path.join(__dirname, `../logs/api/${dateStr}.txt`);

const tokens = path.join(__dirname, '../data/tokens.json');
const futures = path.join(__dirname, '../data/futures.json');
const shares = path.join(__dirname, '../data/shares.json');
const candlesCacheDir = path.join(__dirname, '../data/cachedcandles');
const orderbookCacheDir = path.join(__dirname, '../data/cachedorderbooks');

module.exports = {
    blueChips: [
        'FIVE', 'GAZP',
        'GMKN', 'LKOH',
        'MTSS', 'MGNT',
        'NVTK', 'PLZL',
        'POLY', 'ROSN',
        'SBER', 'SNGS',
        'TATN', 'YNDX',
    ],
    files: {
        tokens,
        futures,
        shares,
        logsServer,
        logsApi,
        candlesCacheDir,
        orderbookCacheDir,
    },
    defaultToken: '',
    appName: '',
    dateStr,
    dateOptions,
};
