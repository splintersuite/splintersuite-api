// user.stats = {
//     daily: {
//         amount: 324,
//         change: -0.0345,
//     },
//     weekly: {
//         amount: 3124,
//         change: 0.1045,
//     },
//     monthly: {
//         amount: 30124,
//         change: 0.1245,
//     },
// };

// weekly: [10, 31, 22, 35, 10, 2, 45];

const setToMonday = (date) => {
    var day = date.getDay() || 7;
    if (day !== 1) {
        date.setHours(-24 * (day - 1));
    }
    return date;
};

setToMonday(new Date());

// totalEarned: 6969;
const calcAggregatedEarnings = async ({ users_id }) => {
    const now = new Date();
    const yesterday = now.setDate(d.getDate() - 1);
    const firstOfTheMonth = new Date(
        `${now.getFullYear()}-${now.getMonth() + 1}-01`
    );
    const firstOfTheYear = new Date(`${now.getFullYear()}-01-01`);
    const ydayEarnings = await DailyEarnings.query()
        .where({ users_id })
        .whereBetween('timestamp', [yesterday, now]);
    const mtdEarnings = await DailyEarnings.query()
        .where({ users_id })
        .whereBetween('timestamp', [firstOfTheMonth, now]);
    const ytdEarnings = await DailyEarnings.query()
        .where({ users_id })
        .whereBetween('timestamp', [firstOfTheYear, now]);

    return { ydayEarnings, mtdEarnings, ytdEarnings };
};
