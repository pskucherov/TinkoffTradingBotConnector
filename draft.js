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