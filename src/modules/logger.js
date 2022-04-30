/* eslint-disable no-console */
const fs = require('fs');
const config = require('../config');

/**
 * Логгер ошибок.
 * Логи ошибок пишутся отдельно для TinkoffApi и http сервера.
 *
 * @param {0|1} 0 - ошибка сервера, 1 - ошибка из api tinkoff.
 * @param {String} error
 * @param {*} res
 * @returns
 */
const logger = (type, error, res) => {
    console.log(error);

    if (!error) {
        error = 'Отсутствует текст ошибки!';
    }

    const logsFileName = type ? config.files.logsApi : config.files.logsServer;

    fs.writeFileSync(logsFileName, new Date().toLocaleString() + ': ' + error + '\r\n', { flag: 'a' });

    if (res) {
        return res
            .status(500)
            .json({ status: error.status, message: error.message, error: true });
    }
};

module.exports.logger = logger;
