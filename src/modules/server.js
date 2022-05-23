/* eslint-disable no-console */
const express = require('express');
const cors = require('cors');
const app = express();

const http = require('http').Server(app);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const ip = '0.0.0.0';
const port = process.env.SERVERPORT || 8000;

http.listen(port, ip, () => {
    console.log(`we are listening on port ${port}`);
});

module.exports.app = app;
