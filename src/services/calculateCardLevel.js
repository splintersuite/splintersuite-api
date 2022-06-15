'use strict';

const XPProperty = {
    alpha_xp: [20, 100, 250, 1000],
    gold_xp: [250, 500, 1000, 2500],
    beta_xp: [15, 75, 175, 750],
    beta_gold_xp: [200, 400, 800, 2000],
};

const alphaCombineRates = [
    [1, 2, 4, 9, 19, 39, 79, 129, 229, 379],
    [1, 2, 4, 8, 16, 26, 46, 86],
    [1, 2, 4, 8, 16, 32],
    [1, 2, 4, 8],
];

const goldAlphaCombineRates = [
    [0, 0, 0, 1, 2, 4, 7, 11, 19, 31],
    [0, 0, 1, 2, 3, 5, 9, 17],
    [0, 0, 1, 2, 4, 8],
    [0, 1, 2, 3],
];

const betaCombineRates = [
    [1, 3, 5, 12, 25, 52, 105, 172, 305, 505],
    [1, 3, 5, 11, 21, 35, 61, 115],
    [1, 3, 6, 11, 23, 46],
    [1, 3, 5, 11],
];

const goldBetaCombineRates = [
    [0, 0, 0, 1, 2, 4, 8, 13, 23, 38],
    [0, 0, 1, 2, 4, 7, 12, 22],
    [0, 0, 1, 3, 5, 10],
    [0, 1, 2, 4],
];

const CombineRates = [
    [1, 5, 14, 30, 60, 100, 150, 220, 300, 400],
    [1, 5, 14, 25, 40, 60, 85, 115],
    [1, 4, 10, 20, 32, 46],
    [1, 3, 6, 11],
];

const CombineRatesGold = [
    [0, 0, 1, 2, 5, 9, 14, 20, 27, 38],
    [0, 1, 2, 4, 7, 11, 16, 22],
    [0, 1, 2, 4, 7, 10],
    [0, 1, 2, 4],
];

const findCardLevel = ({ id, rarity, _xp, gold, edition, tier, alpha_xp }) => {
    try {
        console.log(
            `findCardLevel start with id: ${id}, rarity: ${rarity}, _xp: ${_xp}, gold: ${gold}, edition: ${edition}, tier: ${tier}, alpha_xp: ${alpha_xp}`
        );
        let _alpha_xp = 0;
        if (alpha_xp != null) {
            _alpha_xp = alpha_xp;
        }

        let xp = _xp - _alpha_xp;
        if (xp <= 0) {
            xp = 1;
        }

        let xp_property = '';

        if (edition === 0 || (edition === 2 && id < 100)) {
            // if card is either an alpha or a promo that was around during alpha.
            xp_property = gold ? 'gold_xp' : 'alpha_xp';
        } else {
            xp_property = gold ? 'beta_gold_xp' : 'beta_xp';
        }

        const bcx_xp = XPProperty[xp_property][rarity - 1];
        // this will mean no matter what, we will at least have 1 bcx, this calc handles beta/alpha cards and their reward cards
        let bcx = Math.max(gold ? xp / bcx_xp : (xp + bcx_xp) / bcx_xp, 1);
        // rest of the algo is getting the rest of the cards levels

        if (edition === 4 || tier >= 4) {
            // since untamed, bcx has = xp
            bcx = xp;
        }

        if (_alpha_xp > 0) {
            bcx = bcx - 1;
        }

        const level = bcxToLevel({ bcx, rarity, gold, edition, id, tier });

        return level;
    } catch (err) {
        console.error(`findCardLevel error: ${err.message}`);
        throw err;
    }
};

const bcxToLevel = ({ bcx, rarity, gold, edition, id, tier }) => {
    try {
        console.log(`bcxToLevel start`);

        const combinationRates = getBcxLevelComboForEdition({
            rarity,
            gold,
            edition,
            id,
            tier,
        });
        let level;
        for (let i = 0; i < combinationRates.length; i++) {
            const bcxForNextHighestLevel =
                combinationRates[combinationRates.length - 1 - i];

            if (bcx >= bcxForNextHighestLevel) {
                // this means that we have enough bcx to be at this level or higher
                // since we are going from the highest first, this should automatically give us our answer and we are good
                console.log(
                    `we found a match for the level of the card! i is: ${i} and combinationRates length is ${combinationRates}`
                );
                level = combinationRates.length - i;
                break;
            }
        }
        console.log(`bcxToLevel returning level: ${level}`);
        return level;
    } catch (err) {
        console.error(`bcxToLevel error: ${err.message}`);
        throw err;
    }
};

const getBcxLevelComboForEdition = ({ rarity, gold, edition, id, tier }) => {
    try {
        console.log(`getBcxLevelComboForEdition start`);
        let combinationRates;
        if (edition === 4 || tier >= 4) {
            // if untamed or chaos legion, use the regular bcx caps for levels, also includes reward cards untamed and up
            combinationRates = gold
                ? CombineRatesGold[rarity - 1]
                : CombineRates[rarity - 1];
        } else if (edition === 0 || (edition === 2 && id < 100)) {
            // this is alpha + promo cards that fit under alpha cards
            combinationRates = gold
                ? goldAlphaCombineRates[rarity - 1]
                : alphaCombineRates[rarity - 1];
        } else {
            // this will include reward cards that aren't untamed and above (aka beta reward cards + promo cards from beta)
            combinationRates = gold
                ? goldBetaCombineRates[rarity - 1]
                : betaCombineRates[rarity - 1];
        }

        return combinationRates;
    } catch (err) {
        console.error(`getBcxLevelComboForEdition error: ${err.message}`);
        throw err;
    }
};

export default findCardLevel;
