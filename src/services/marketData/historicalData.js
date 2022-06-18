import axios from 'axios';
import findCardLevel from '../calculateCardLevel.js';
import mathFncs from '../../util/math.js';
import MarketRentalPrices from '../../models/MarketRentalPrices.js';

const ALL_OPEN_TRADES = 'ALL_OPEN_TRADES';
const TRADES_DURING_PERIOD = 'TRADES_DURING_PERIOD';
const collectData = async ({
    card,
    now,
    twelveHoursAgo,
    twelveHoursAgoTime,
}) => {
    const activeTrades = await axios.get(
        `https://api2.splinterlands.com/market/active_rentals?card_detail_id=${card.id}`
    );

    if (!Array.isArray(activeTrades.data)) {
        throw new Error(
            `https://api2.splinterlands.com/market/active_rentals?card_detail_id=${card.id}
              not returning array`
        );
    }
    const trades = {};
    activeTrades.data.forEach((trade) => {
        const level = findCardLevel({
            id: card.card_detail_id,
            rarity: card.rarity,
            _xp: trade.xp,
            gold: trade.gold,
            edition: trade.edition,
            tier: trade.tier,
            alpha_xp: 0,
        });
        const levelString = `level-${String(level)}`;
        if (!(levelString in trades)) {
            trades[levelString] = {};
        }
        if (trade.gold && !('gold' in trades[levelString])) {
            trades[levelString]['gold'] = [];
        }

        if (!trade.gold && !('regular' in trades[levelString])) {
            trades[levelString]['regular'] = [];
        }

        const goldKey = trade.gold ? 'gold' : 'regular';
        trades[levelString][goldKey].push({
            rentalId: trade.rental_tx,
            price: Number(trade.buy_price),
            feePct: Number(trade.fee_percent),
            paymentCurrency: trade.payment_currency,
            rentalDate: trade.rental_date,
            rentalDays: trade.rental_days,
        });
    });

    // do math
    const uploadArr = [];
    for (const level of Object.keys(trades)) {
        for (const cardType of Object.keys(trades[level])) {
            // average of everything on loan...
            const twelveHoursArr = trades[level][cardType]
                .filter((trade) => {
                    return (
                        new Date(trade.rentalDate).getTime() >
                        twelveHoursAgoTime
                    );
                })
                .map(({ price }) => price);
            const allArr = trades[level][cardType].map(({ price }) => price);
            const stdDevAll = mathFncs.standardDeviation(allArr);
            const medianAll = mathFncs.median(allArr);
            const meanAll = mathFncs.mean(allArr);
            const lowAll = mathFncs.min(allArr);
            const highAll = mathFncs.max(allArr);

            const stdDevTwelve = mathFncs.standardDeviation(twelveHoursArr);
            const medianTwelve = mathFncs.median(twelveHoursArr);
            const meanTwelve = mathFncs.mean(twelveHoursArr);
            const lowTwelve = mathFncs.min(twelveHoursArr);
            const highTwelve = mathFncs.max(twelveHoursArr);

            uploadArr.push({
                created_at: now,
                card_detail_id: card.id,
                level: Number(level.split('-')[1]),
                avg: Number.isFinite(meanAll) ? meanAll : NaN,
                low: Number.isFinite(lowAll) ? lowAll : NaN,
                high: Number.isFinite(highAll) ? highAll : NaN,
                std_dev: Number.isFinite(stdDevAll) ? stdDevAll : NaN,
                median: Number.isFinite(medianAll) ? medianAll : NaN,
                is_gold: cardType === 'gold',
                price_currency: 'DEC',
                period_start_time: twelveHoursAgo,
                period_end_time: now,
                aggregaton_type: ALL_OPEN_TRADES,
            });
            uploadArr.push({
                created_at: now,
                card_detail_id: card.id,
                level: Number(level.split('-')[1]),
                avg: Number.isFinite(meanTwelve) ? meanTwelve : NaN,
                low: Number.isFinite(lowTwelve) ? lowTwelve : NaN,
                high: Number.isFinite(highTwelve) ? highTwelve : NaN,
                std_dev: Number.isFinite(stdDevTwelve) ? stdDevTwelve : NaN,
                median: Number.isFinite(medianTwelve) ? medianTwelve : NaN,
                is_gold: cardType === 'gold',
                price_currency: 'DEC',
                period_start_time: twelveHoursAgo,
                period_end_time: now,
                aggregaton_type: TRADES_DURING_PERIOD,
            });
        }
    }
    // upload to DB
    // rate limit this somehow
    if (uploadArr.length > 0) {
        await MarketRentalPrices.query().insert(uploadArr);
    }
};

export default { collectData };
