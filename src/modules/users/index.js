const bodyParser = require('body-parser');

const { logger } = require('../logger');
const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { check, validationResult } = require('express-validator');

const { app } = require('../server');
const auth = require('./auth');

const bcrypt = require('bcrypt');

const config = require('../../config');
const fileName = config.files.pin;
const fs = require('fs');

/**
 * Выставляет маркер выбранного токена.
 */
const getPin = () => {
    return fs.readFileSync(fileName, 'utf8').toString() || '';
};

const savePin = async pin => {
    const salt = await bcrypt.genSalt(3);
    const p = await bcrypt.hash(pin, salt);

    fs.writeFileSync(fileName, p);
};

const jwtSign = async (res, host) => {
    const payload = { auth: true };

    return jwt.sign(
        payload,
        'opexbot',
        {
            expiresIn: '7d',
        },
        (err, token) => {
            if (err) throw err;

            try {
                res.cookie('token', token, {
                    secure: true,
                    sameSite: 'none',
                    expires: new Date(Date.now() + (7 * 24 * 3600 * 1000)),
                });

                if (host) {
                    res.redirect(host);
                } else {
                    res.status(200).json({
                        token,
                    });
                }
            } catch (e) {
                console.error(e);
                if (host) {
                    res.redirect(host);
                } else {
                    res.status(500).json({
                        message: 'Server Error',
                    });
                }
            }
        },
    );
};

// TODO: 'добавить сюда авторизацию'.
app.post(
    '/savepin',
    [
        check('pin', 'Please Enter a Valid pin')
            .not()
            .isEmpty(),
    ],
    async (req, res) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({
                errors: errors.array(),
            });
        }

        const { pin } = req.body;

        await savePin(pin);

        return jwtSign(res);
    },
);

// app.post(
//     '/login',
//     [
//         check('pin', 'Please Enter a Valid pin')
//             .not()
//             .isEmpty(),
//     ],
//     async (req, res) => {
//         const errors = validationResult(req);

//         console.log('login', errors);
//         if (!errors.isEmpty()) {
//             return res.status(400).json({
//                 errors: errors.array(),
//             });
//         }

//         const { pin } = req.body;

//         console.log(req.body, getPin());
//         try {
//             const isMatch = await bcrypt.compare(pin, getPin());
//             console.log(isMatch);

//             if (!isMatch) {
//                 return res.status(400).json({
//                     message: 'Incorrect Pin!',
//                 });
//             }

//             return jwtSign(res);
//         } catch (e) {
//             console.error(e);
//             res.status(500).json({
//                 message: 'Server Error',
//             });
//         }
//     },
// );

app.get(
    '/login',
    [
        check('pin', 'Please Enter a Valid pin')
            .not()
            .isEmpty(),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        const { pin, origin, ret } = req.query;

        if (!errors.isEmpty()) {
            return res.redirect(ret);
        }

        try {
            const isMatch = await bcrypt.compare(pin, getPin());

            if (!isMatch) {
                return res.redirect(ret);
            }

            jwtSign(res, origin);
        } catch (e) {
            return res.redirect(ret);
        }
    },
);

app.get(
    '/logout',
    auth,
    async (req, res) => {
        const { origin } = req.query;

        res.clearCookie('token');

        return res.redirect(origin + '/login');
    },
);
