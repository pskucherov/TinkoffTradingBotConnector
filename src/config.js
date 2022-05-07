const path = require('path');

// Логи ошибок пишутся отдельно для TinkoffApi и http сервера.
const dateOptions = { year: 'numeric', month: 'numeric', day: 'numeric' };
const dateStr = new Date().toLocaleString(undefined, dateOptions);

const logsServer = path.join(__dirname, `../logs/server/${dateStr}.txt`);
const logsApi = path.join(__dirname, `../logs/api/${dateStr}.txt`);

const tokens = path.join(__dirname, '../data/tokens.json');
const futures = path.join(__dirname, '../data/futures.json');
const shares = path.join(__dirname, '../data/shares.json');
const candlesCacheDir = path.join(__dirname, '../data/cachedcandles');

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
    },
    defaultToken: 't.UDHjZdjfs0d3go22w7gbF08CIhVe4zdrrW-L4CbhqeM2zbvxNzcJzkV_jX3ZrvcyfuChz5-B9R5dloLpmv-evA',
    appName: '',
    dateStr,
};
