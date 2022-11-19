const { logger } = require('../logger');

const getPortfolio = async (accountId, getSandboxPortfolio, isSandbox, operations) => {
    try {
        const command = isSandbox ? getSandboxPortfolio : operations.getPortfolio;

        // {"totalAmountShares":{"currency":"rub","units":2424,"nano":800000000},"totalAmountBonds":{"currency":"rub","units":0,"nano":0},"totalAmountEtf":{"currency":"rub","units":0,"nano":0},"totalAmountCurrencies":{"currency":"rub","units":9533,"nano":350000000},"totalAmountFutures":{"currency":"rub","units":0,"nano":0},"expectedYield":{"units":0,"nano":-340000000},"positions":[{"figi":"BBG004730N88","instrumentType":"share","quantity":{"units":20,"nano":0},"averagePositionPrice":{"currency":"rub","units":123,"nano":270000000},"expectedYield":{"units":-40,"nano":-600000000},"currentNkd":{"currency":"rub","units":0,"nano":0},"currentPrice":{"currency":"rub","units":121,"nano":240000000},"averagePositionPriceFifo":{"currency":"rub","units":123,"nano":270000000},"quantityLots":{"units":2,"nano":0}}]}
        return await command({ accountId });
    } catch (e) { logger(1, e) }
};

const getPositions = async (accountId, getSandboxPositions, isSandbox, operations) => {
    try {
        const command = isSandbox ? getSandboxPositions : operations.getPositions;

        // {"money":[{"currency":"rub","units":9533,"nano":350000000}],"blocked":[],"securities":[{"figi":"BBG004730N88","blocked":0,"balance":20}],"limitsLoadingInProgress":false,"futures":[]}
        return await command({ accountId });
    } catch (e) { logger(1, e) }
};

module.exports = {
    getPortfolio,
    getPositions,
};
