/**
 * Устанавливает утреннее время для бирж РФ.
 *
 * @param {Date|String|Number} from
 * @returns
 */
const getFromMorning = from => {
    const f = new Date(Number(from));

    f.setHours(5, 0, 0, 0);

    return f;
};

/**
 * Устанавливает вечернее время для бирж РФ.
 *
 * @param {Date|String|Number} to
 * @returns
 */
const getToEvening = to => {
    const t = new Date(Number(to));

    t.setHours(20, 59, 59, 999);

    return t;
};

module.exports = {
    getFromMorning,
    getToEvening,
};
