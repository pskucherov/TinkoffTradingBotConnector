class Common {
    constructor(adviser, figi) {
        // Если робот работает в режиме советника,
        // то он только обозначает предположения, но не делает сделки.
        this.adviser = Boolean(adviser);

        // Инструмент, которым будет торговать робот.
        this.figi = figi;
    }

    setControlsCallbacks() {
        // Метод покупки
        // Продажи
        // Выставления заявки
    }

    setCurrentState() {
        // Текущая цена
        // История свечей
        // История стакана
        // Существующие позиции
        // Существующие заявки

    }

    buy() {

    }

    sell() {

    }

    clearUnfulfilledOrders() {
        // Удалить неисполненные заявки
    }
}

module.exports.Common = Common;
