/* eslint-disable no-console */
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const auth = require('./users/auth');
const app = express();

const http = require('http').Server(app);

app.use(cors({
    origin: (o, next) => { next(null, o) },
    credentials: true,
    optionsSuccessStatus: 200,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(cookieParser('opexcookie'));
app.use(auth);

const io = require('socket.io')(http, {
    path: '/api/socket',
    cors: '*',
});

const ip = '0.0.0.0';
const port = process.env.SERVERPORT || 8000;

http.listen(port, ip, () => {
    console.log(`we are listening on port ${port}`);
});

module.exports = {
    app,
    io,
};
