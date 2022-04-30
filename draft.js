/* eslint-disable no-console */
const { createSdk } = require('tinkoff-sdk-grpc-js');
const sdk = createSdk('token');

(async () => {
    const candles = await sdk.marketData.getCandles({
        figi: 'BBG0047315Y7',
        from: new Date('2022-04-04T11:00:00Z'),
        to: new Date('2022-04-04T11:20:59Z'),
        interval: sdk.CandleInterval.CANDLE_INTERVAL_5_MIN,
    });

    console.log('Запрос исторических свечей по инструменту: ', candles);
})();

(async () => {
    const futures = await sdk.instruments.futures({
        instrumentStatus: sdk.InstrumentStatus.INSTRUMENT_STATUS_BASE,
    });

    const futureByFIGI = await sdk.instruments.futureBy({
        idType: sdk.InstrumentIdType.INSTRUMENT_ID_TYPE_FIGI,
        id: 'FUTSI0623000',
    });

    const futuresMargin = await sdk.instruments.getFuturesMargin({
        figi: 'FUTSI0623000',
    });

    console.log('Получения фьючерсов, допущенных к торговле через API: ', futures);
    console.log('Получение информации о фьючерсе по его FIGI: ', futureByFIGI);
    console.log('Получение размера гарантийного обеспечения по фьючерсу: ', futuresMargin);
})();
