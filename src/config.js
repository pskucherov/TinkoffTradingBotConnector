const path = require('path');

// Логи ошибок пишутся отдельно для TinkoffApi и http сервера.
const options = { year: 'numeric', month: 'numeric', day: 'numeric' };
const dateStr = new Date().toLocaleString(undefined, options);

const logsServer = path.join(__dirname, `../logs/server/${dateStr}.txt`);
const logsApi = path.join(__dirname, `../logs/api/${dateStr}.txt`);

const tokens = path.join(__dirname, '../data/tokens.json');
const futures = path.join(__dirname, '../data/futures.json');
const shares = path.join(__dirname, '../data/shares.json');

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
    },
    defaultToken: '',
    appName: '',
    dateStr,
};
