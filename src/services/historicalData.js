import axios from 'axios';
import findCardLevel from './calculateCardLevel.js';
import mathFncs from '../util/math.js';
import MarketRentalPrices from '../models/MarketRentalPrices.js';

const ALL_OPEN_TRADES = 'ALL_OPEN_TRADES';
const TRADES_DURING_PERIOD = 'TRADES_DURING_PERIOD';
const collectData = async () => {
    const cards = await getCardDetail();

    const now = new Date();
    for (const card of cards) {
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
            if (trade.payment_currency === 'DEC') {
                trades[levelString][goldKey].push({
                    rentalId: trade.rental_tx,
                    price: Number(trade.buy_price),
                    feePct: Number(trade.fee_percent),
                    paymentCurrency: trade.payment_currency,
                    rentalDate: trade.rental_date,
                    rentalDays: trade.rental_days,
                    isInLastTwelveHours:
                        Math.abs(now - trade.rental_date) / 360000 < 12,
                });
            }
        });

        // do math
        const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
        const twelveHoursAgoTime = twelveHoursAgo.getTime();
        const uploadArr = [];
        for (const level of Object.keys(trades)) {
            for (const type of Object.keys(trades[level])) {
                // average of everything on loan...
                const twelveHoursArr = trades[level][type]
                    .filter((trade) => {
                        new Date(trade.rental_date).getTime() >
                            twelveHoursAgoTime;
                    })
                    .map(({ price }) => price);
                const allArr = trades[level][type].map(({ price }) => price);
                uploadArr.push({
                    created_at: now,
                    card_detail_id: card.id,
                    level: Number(level.split('-')[1]),
                    avg: mathFncs.mean(allArr),
                    min: mathFncs.min(allArr),
                    max: mathFncs.max(allArr),
                    stdDev: mathFncs.standardDeviation(allArr),
                    median: mathFncs.median(allArr),
                    is_gold_yn: type === 'gold' ? 'Y' : 'N',
                    price_currency: 'DEC',
                    period_start_time: twelveHoursAgo,
                    period_end_time: now,
                    aggregaton_type: ALL_OPEN_TRADES,
                });
                uploadArr.push({
                    created_at: now,
                    card_detail_id: card.id,
                    level: Number(level.split('-')[1]),
                    avg: mathFncs.mean(twelveHoursArr),
                    min: mathFncs.min(twelveHoursArr),
                    max: mathFncs.max(twelveHoursArr),
                    stdDev: mathFncs.standardDeviation(twelveHoursArr),
                    median: mathFncs.median(twelveHoursArr),
                    is_gold_yn: type === 'gold' ? 'Y' : 'N',
                    price_currency: 'DEC',
                    period_start_time: twelveHoursAgo,
                    period_end_time: now,
                    aggregaton_type: TRADES_DURING_PERIOD,
                });
                console.log({
                    created_at: now,
                    card_detail_id: card.card_detail_id,
                    level: Number(level.split('-')[1]),
                    avg: mathFncs.mean(allArr),
                    min: mathFncs.min(allArr),
                    max: mathFncs.max(allArr),
                    stdDev: mathFncs.standardDeviation(allArr),
                    median: mathFncs.median(allArr),
                    is_gold_yn: type === 'gold' ? 'Y' : 'N',
                    price_currency: 'DEC',
                    period_start_time: twelveHoursAgo,
                    period_end_time: now,
                    aggregaton_type: ALL_OPEN_TRADES,
                });
                console.log({
                    created_at: now,
                    card_detail_id: card.card_detail_id,
                    level,
                    avg: mathFncs.mean(twelveHoursArr),
                    min: mathFncs.min(twelveHoursArr),
                    max: mathFncs.max(twelveHoursArr),
                    stdDev: mathFncs.standardDeviation(twelveHoursArr),
                    median: mathFncs.median(twelveHoursArr),
                    is_gold_yn: type === 'gold' ? 'Y' : 'N',
                    price_currency: 'DEC',
                    period_start_time: twelveHoursAgo,
                    period_end_time: now,
                    aggregaton_type: TRADES_DURING_PERIOD,
                });
            }
        }
        await MarketRentalPrices.query().insert(uploadArr);
        process.exit();
        // upload to DB
    }
};

const getCardDetail = async () => {
    const cards = await axios.get(
        'https://api2.splinterlands.com/cards/get_details'
    );
    return cards.data;
};

collectData();

export default { collectData, getCardDetail };
