// res.data.rateLimits[{
//   rateLimitType: 'REQUEST_WEIGHT',
//   interval: 'MINUTE',
//   intervalNum: 1,
//   limit: 1200
// },
// {
//   rateLimitType: 'ORDERS',
//   interval: 'SECOND',
//   intervalNum: 10,
//   limit: 50
// },
// {
//   rateLimitType: 'ORDERS',
//   interval: 'DAY',
//   intervalNum: 1,
//   limit: 160000
// }]
// period is in milliseconds.  It must be in milliseconds
const exchangeLimits = {
    SPLINTERLANDS: {
        // 1 minute
        period: 60 * 1000, // in milliseconds.  This api limits in any 60 second time interval
        maxWeight: 800, // in the respective api weight's terms
        // reduced to 500 from 1000... though the limit should be 1200
        resetWait: 60 * 1000 * 5,
    },
};

// resetWait is how long to wait until all of our weight is reset, should technically = period but we make it longer for other apis besides coinbase for safety, and shorter for coinbase because
// we don't want to wait an hour
export default exchangeLimits;
