'use strict';

// https://github.com/ccxt/ccxt/blob/master/js/base/functions/time.js
const now = Date.now;

const setTimeout_original = setTimeout;
// tnt note: done is resolve() from a Promise
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

export default setTimeout_safe;
