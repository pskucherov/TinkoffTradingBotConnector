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
});

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
});

!(async function example() {
    const { marketDataStreamService, MarketDataStreamService,
        marketDataStream, SubscriptionAction, SubscriptionInterval, MarketDataRequest } = sdk;

    let keepCalling = true;

    setTimeout(function() {
        keepCalling = false;
    }, 5000000);

    const timer = time => new Promise(resolve => setTimeout(resolve, time));

    //генератор для последней цены инструмента
    // async function* createLastPriceRequest() {
    //   while (keepCalling) {
    //     await timer(1000);
    //     yield MarketDataRequest.fromPartial({
    //       subscribeLastPriceRequest: {
    //         subscriptionAction: SubscriptionAction.SUBSCRIPTION_ACTION_SUBSCRIBE,
    //         instruments: [{ figi: 'BBG000N9MNX3' }],
    //       },
    //     });
    //   }
    // }

    // //генератор для торгового статуса инструмента
    // async function* createSubscriptionInfoRequest() {
    //   while (keepCalling) {
    //     await timer(1000);
    //     yield MarketDataRequest.fromPartial({
    //       subscribeInfoRequest: {
    //         subscriptionAction: SubscriptionAction.SUBSCRIPTION_ACTION_SUBSCRIBE,
    //         instruments: [{ figi: 'BBG000N9MNX3' }],
    //       },
    //     });
    //   }
    // }

    // // генератор для получения обезличенных сделок
    // async function* createSubscriptionTradesRequest() {
    //   while (keepCalling) {
    //     await timer(1000);
    //     yield MarketDataRequest.fromPartial({
    //       subscribeTradesRequest: {
    //         subscriptionAction: SubscriptionAction.SUBSCRIPTION_ACTION_SUBSCRIBE,
    //         instruments: [{ figi: 'BBG000N9MNX3' }],
    //       },
    //     });
    //   }
    // }

    // //генератор подписка на стаканы
    // async function* createSubscriptionOrderBookRequest() {
    //   while (keepCalling) {
    //     await timer(1000);
    //     yield MarketDataRequest.fromPartial({
    //       subscribeOrderBookRequest: {
    //         subscriptionAction: SubscriptionAction.SUBSCRIPTION_ACTION_SUBSCRIBE,
    //         instruments: [{ figi: 'BBG000N9MNX3', depth: 5 }],
    //       },
    //     });
    //   }
    // }

    // //генератор подписки на свечи
    // async function* createSubscriptionCandleRequest() {
    //   while (keepCalling) {
    //     await timer(1000);
    //     yield MarketDataRequest.fromPartial({
    //       subscribeCandlesRequest: {
    //         subscriptionAction: SubscriptionAction.SUBSCRIPTION_ACTION_SUBSCRIBE,
    //         instruments: [{ figi: 'BBG000N9MNX3', interval: SubscriptionInterval.SUBSCRIPTION_INTERVAL_ONE_MINUTE }],
    //       },
    //     });
    //   }
    // }

    // const response = marketDataStream.marketDataStream(createSubscriptionInfoRequest());

    // for await (const num of response) {
    //   console.log(JSON.stringify(num));
    // }

    // async function* createSubscriptionOrderBookRequest() {
    //     while (keepCalling) {
    //       await timer(1000);
    //       yield MarketDataRequest.fromJSON({
    //         subscribeOrderBookRequest: {
    //           subscriptionAction: SubscriptionAction.SUBSCRIPTION_ACTION_SUBSCRIBE,
    //           instruments: [{ figi: 'FUTMGNT06220', depth: 10 }],
    //         },
    //       });
    //     }
    //   }

    //   const response = marketDataStream.marketDataStream(createSubscriptionOrderBookRequest());

    //   async function* createSubscriptionOrderBookRequest() {
    //     while (keepCalling) {
    //       await timer(50);
    //       yield MarketDataRequest.fromJSON({
    //         subscribeLastPriceRequest: {
    //           subscriptionAction: SubscriptionAction.SUBSCRIPTION_ACTION_SUBSCRIBE,
    //           instruments: [{ figi: 'FUTMGNT06220', interval: 1 }],
    //         },
    //       });
    //     }
    //   }

    //   const response = marketDataStream.marketDataStream(createSubscriptionOrderBookRequest());

    // for await (const num of response) {
    //     console.log(JSON.stringify(num));
    // }

    // console.log(marketDataStreamService, MarketDataStreamService, marketDataStream);
})();
