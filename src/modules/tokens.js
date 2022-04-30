const fs = require('fs');
const path = require('path');

const fileName = path.join(__dirname, '../../tokens/data.json');

/**
 * Выставляет маркер выбранного токена.
 *
 * @param {String} token
 */
const selectToken = token => {
    const file = fs.readFileSync(fileName, 'utf8');

    if (file.includes(token)) {
        const tokens = JSON.parse(file);

        for (const t of tokens) {
            if (t.token === token) {
                t.selected = true;
            } else if (t.selected) {
                delete t.selected;
            }
        }

        fs.writeFileSync(fileName, JSON.stringify(tokens));
    }
};

/**
 * Сохраняет токен в файл.
 * Если это первый токен, то ставит его выбранным.
 *
 * @param {Boolean} isSandbox
 * @param {String} token
 */
const saveToken = (isSandbox, token) => {
    const file = fs.readFileSync(fileName, 'utf8');

    if (!file.includes(token)) {
        const tokens = JSON.parse(file);

        tokens.push({ token: token, isSandbox });

        if (tokens.length === 1) {
            tokens[0].selected = true;
        }

        fs.writeFileSync(fileName, JSON.stringify(tokens));
    }
};

/**
 * Удаляет токен.
 *
 * @param {String} token
 */
const delToken = token => {
    const file = fs.readFileSync(fileName, 'utf8');

    if (file.includes(token)) {
        const tokens = JSON.parse(file).filter(t => t.token !== token);

        fs.writeFileSync(fileName, JSON.stringify(tokens));
    }
};

/**
 * Возвращает токены из файла.
 *
 * @param {String} token
 */
const getTokens = () => {
    return JSON.parse(fs.readFileSync(fileName, 'utf8'));
};

module.exports = {
    selectToken,
    saveToken,
    delToken,
    getTokens,
};
