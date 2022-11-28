const { verify } = require('jsonwebtoken');
const { parse } = require('cookie');

module.exports = function (req, next) {
    try {

        const { token } = parse(req.handshake?.headers?.cookie);

        if (!token) {
            return;
        }

        const decoded = verify(token, 'opexbot');

        if (!decoded || !decoded.auth) {
            return;
        }

        next();
    } catch (e) {
        console.error(e);
    }
};
