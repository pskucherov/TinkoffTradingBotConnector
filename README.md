# TinkoffTradingBotConnector


## Требования
```
node >= 17
```


## Установка

```
npm i tinkofftradingbotconnector
```


## Описание

TinkoffTradingBotConnector связывает [sdk](https://www.npmjs.com/package/tinkoff-sdk-grpc-js), [opexviewer](https://www.npmjs.com/package/opexviewer) и [opexbot](https://www.npmjs.com/package/opexbot) между собой. Является составной частью [торговой системы](https://github.com/pskucherov/OpexBot).

Сохраняет настройки пользователя, кеширует информацию от брокера, пересылает сообщения между UI и роботом, предоставляет для робота коллбеки из SDK. Ведёт ежедневный журнал логов серверной и API части.
