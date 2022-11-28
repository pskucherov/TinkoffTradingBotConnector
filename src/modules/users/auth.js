const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
    const token = req.cookies?.token;

    if (req.path === '/login') {
        return next();
    }

    if (!token) return res.status(401).json({ message: 'Auth Error' });

    try {
        const decoded = jwt.verify(token, 'opexbot');

        if (!decoded || !decoded.auth) {
            return res.status(401).json({ message: 'Auth Error' });
        }

        next();
    } catch (e) {
        console.error(e);
        res.status(500).send({ message: 'Invalid pin' });
    }
};
