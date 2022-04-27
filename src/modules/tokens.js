const fs = require('fs');
const path = require('path');

const fileName = path.join(__dirname, '../../tokens/data.json');



const saveToken = (isSandbox, token) => {
    const file = fs.readFileSync(fileName, 'utf8');

    if (!file.includes(token)) {
        const tokens = JSON.parse(file);
        tokens.push({ token: token, isSandbox });
        fs.writeFileSync(fileName, JSON.stringify(tokens));
    }
};

const delToken = (token) => {
    const file = fs.readFileSync(fileName, 'utf8');

    if (file.includes(token)) {
        const tokens = JSON.parse(file).filter(t => t.token !== token);
        fs.writeFileSync(fileName, JSON.stringify(tokens));
    }
};

const getTokens = () => {
    return JSON.parse(fs.readFileSync(fileName, 'utf8'));
};


module.exports = {
    saveToken,
    delToken,
    getTokens,
};