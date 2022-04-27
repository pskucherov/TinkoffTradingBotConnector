const fs = require('fs');
const logger = (logsFileName, error, res) => {
    fs.writeFileSync(logsFileName, new Date().toLocaleString() + ': ' + error + '\r\n', { flag: 'a' });

    console.log(error);

    if (res) {
        return res
            .status(500)
            .json({ status: error.status, message: error.message, error: true });
    }
};

module.exports.logger = logger;