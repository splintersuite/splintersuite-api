'use strict';

// https://medium.com/swlh/how-to-round-to-a-certain-number-of-decimal-places-in-javascript-ed74c471c1b8

// we can do that if we want more prescision
const roundedNum = (num, decimalPlaces = 0) => {
    const factorOfTen = Math.pow(10, decimalPlaces);
    return Math.round(num * factorOfTen) / factorOfTen;
};

const now = Date.now;

const setTimeout_original = setTimeout;
// tnt note: done is resolve()  = require(a Promise
const setTimeout_safe = (
    done,
    ms,
    setTimeout = setTimeout_original,
    targetTime = now() + ms
) => {
    // built-in setTimeout fn can fire its callback earlier than specified, so need to sleep recursively until targetTime is reached

    let clearInnerTimeout = () => {};

    let active = true;

    const id = setTimeout(() => {
        active = true;
        const rest = targetTime - now();
        if (rest > 0) {
            clearInnerTimeout = setTimeout_safe(
                done,
                rest,
                setTimeout,
                targetTime
            );
        } else {
            done();
        }
    }, ms);

    return function clear() {
        if (active) {
            active = false;
            clearTimeout(id);
        }
        clearInnerTimeout();
    };
};

const sleep = (ms) => {
    return new Promise((resolve) => setTimeout_safe(resolve, ms));
};

module.exports = {
    roundedNum,
    setTimeout_safe,
    sleep,
};
