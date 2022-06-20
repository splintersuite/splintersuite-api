const mathFncs = {
    max: function (array) {
        return Math.max.apply(null, array);
    },

    min: function (array) {
        return Math.min.apply(null, array);
    },

    range: function (array) {
        return mathFncs.max(array) - mathFncs.min(array);
    },

    midrange: function (array) {
        return mathFncs.range(array) / 2;
    },

    sum: function (array) {
        let num = 0;
        for (let i = 0, l = array.length; i < l; i++) num += array[i];
        return num;
    },

    mean: function (array) {
        return mathFncs.sum(array) / array.length;
    },

    median: function median(array) {
        const sorted = Array.from(array).sort((a, b) => a - b);
        const middle = Math.floor(sorted.length / 2);

        if (sorted.length % 2 === 0) {
            return (sorted[middle - 1] + sorted[middle]) / 2;
        }

        return sorted[middle];
    },

    modes: function (array) {
        if (!array.length) return [];
        const modeMap = {},
            maxCount = 1,
            modes = [array[0]];

        array.forEach(function (val) {
            if (!modeMap[val]) modeMap[val] = 1;
            else modeMap[val]++;

            if (modeMap[val] > maxCount) {
                modes = [val];
                maxCount = modeMap[val];
            } else if (modeMap[val] === maxCount) {
                modes.push(val);
                maxCount = modeMap[val];
            }
        });
        return modes;
    },

    constiance: function (array) {
        const mean = mathFncs.mean(array);
        return mathFncs.mean(
            array.map(function (num) {
                return Math.pow(num - mean, 2);
            })
        );
    },

    standardDeviation: function (array) {
        return Math.sqrt(mathFncs.constiance(array));
    },

    meanAbsoluteDeviation: function (array) {
        const mean = mathFncs.mean(array);
        return mathFncs.mean(
            array.map(function (num) {
                return Math.abs(num - mean);
            })
        );
    },

    zScores: function (array) {
        const mean = mathFncs.mean(array);
        const standardDeviation = mathFncs.standardDeviation(array);
        return array.map(function (num) {
            return (num - mean) / standardDeviation;
        });
    },
};

module.exports = mathFncs;
