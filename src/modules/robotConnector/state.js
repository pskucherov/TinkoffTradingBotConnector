const fs = require('fs');

const { logger } = require('../logger');
const config = require('../../config');
const stateFile = config.files.robotsState;

/**
 * Получить содержимое файла с запущенными роботами.
 *
 * @returns
 */
const getData = () => {
    try {
        return JSON.parse(fs.readFileSync(stateFile).toString());
    } catch (e) {
        return {};
    }
};

/**
 * Получить содержимое файла с запущенными роботами.
 *
 * @returns
 */
const saveData = data => {
    try {
        fs.writeFileSync(stateFile, JSON.stringify(data));
    } catch (err) {
        logger(0, err);
    }
};

const saveStartedRobot = (accountId, robotName, isSandbox, figi, params) => {
    try {
        const currentState = getData();

        currentState[accountId] || (currentState[accountId] = {});
        currentState[accountId][robotName] = {
            figi,
            params,
            isSandbox,
        };

        saveData(currentState);
    } catch (err) {
        logger(0, err);
    }
};

const delStartedRobot = (accountId, robotName) => {
    try {
        const currentState = getData();

        if (currentState[accountId] && currentState[accountId][robotName]) {
            currentState[accountId][robotName] = false;
            saveData(currentState);
        }
    } catch (err) {
        logger(0, err);
    }
};

module.exports = {
    saveStartedRobot,
    delStartedRobot,

    getData,
};
