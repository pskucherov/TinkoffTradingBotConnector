const fs = require('fs');
const config = require('../../config');
const fileName = config.files.futures;

const getFutures = sdk => {
    const file = fs.readFileSync(fileName, 'utf8');
    const f = JSON.parse(file);

    if (!f || !f.futures) {
        return f;
    }
};

module.exports = {
    getFutures,
};
