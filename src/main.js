const path = require('path');
const chokidar = require('chokidar');
const configFile = path.join(__dirname, './config.js');

let config = require(configFile);
const { logger, sdkLogger } = require('./modules/logger');
const hmr = require('node-hmr');
const { robotConnector } = require('./modules/robotConnector');

try {
    const tinkofftradingbot = (bots = {}) => {
        const { createSdk } = require('tinkoff-sdk-grpc-js');

        const { app } = require('./modules/server');
        const { tokenRequest, getSelectedToken } = require('./modules/tokens');
        const { prepareServer, instrumentsRequest } = require('./modules/getHeadsInstruments/serverRequests');

        // TODO: изменить руками или в процессе создания робота.
        let appName = config.appName || 'pskucherov.tinkofftradingbot';

        // Сохрянем sdk в объект для hmr, чтобы после смены токена ссылка на sdk сохранялась.
        const sdk = { sdk: undefined };
        let token;
        let tokenFromJson = getSelectedToken(1);

        // За изменение json файла наблюдаем отдельно,
        // т.к. hmr его не подтягивает.
        // TODO: сохранять токен из запроса без вотчинга файла.
        chokidar
            .watch([config.files.tokens])
            .on('all', () => {
                tokenFromJson = getSelectedToken(1);
                if (tokenFromJson) {
                    token = tokenFromJson.token;
                    sdk.sdk = createSdk(token, appName, sdkLogger);

                    prepareServer(sdk);
                    robotConnector(sdk, bots);
                }
            });

        // Следим за изменением конфига.
        hmr(() => {
            config = require(configFile);
            token = tokenFromJson && tokenFromJson.token || config.defaultToken;
            appName = config.appName || 'pskucherov.tinkofftradingbot';

            if (token) {
                sdk.sdk = createSdk(token, appName, sdkLogger);

                prepareServer(sdk);
                robotConnector(sdk, bots, tokenFromJson && tokenFromJson.isSandbox);
            }
        }, { watchFilePatterns: [
            configFile,
        ] });

        // Понадобится, если входной точкой будет этот репо, а не с ботами.
        // hmr(() => {
        //     bots.bots = require('tradingbot').bots;
        //     robotConnector(sdk, bots, tokenFromJson && tokenFromJson.isSandbox);
        // }, {
        //     watchDir: '../node_modules/tradingbot/',
        //     watchFilePatterns: ['**/*.js'],
        //     chokidar: {
        //         ignored: [
        //             '.git',
        //         ],
        //     },
        // });

        if (!token) {
            logger(0, 'Нет выбранного токена. Добавьте через opexviewer.');
        } else {
            sdk.sdk = createSdk(token, appName, sdkLogger);
        }

        // Отдаёт логи на клиент.
        require('./modules/logsRequest');

        // CRUD токенов.
        tokenRequest(createSdk);

        // CRUD инструментов.
        instrumentsRequest(sdk);
    };

    exports.connector = tinkofftradingbot;
} catch (error) {
    logger(0, error);
}
