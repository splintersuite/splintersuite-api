SELECT count(\*) FROM (SELECT(select distinct sell_trx_hive_id) from user_rentals ur group by sell_trx_hive_id having bool_and(confirmed is null)) AS xd ;

this gets us 24 results, which shows that imo there are only 24 rows of sell_trx_hive_ids that have ZERO nulls (we should check the confirmed is not null to confirm)

select count(\*) from (select sell_trx_hive_id, max(last_rental_payment) max_date from user_rentals ur group by sell_trx_hive_id having bool_and(confirmed is not null)) as xd ;

5,690 rows as a result, which shows there a of rows that are only showing up here if they are all confirmed (or their most recent max date is confirmed)

select count(\*) from hive_tx_date;
7612 rows, showing there are 7612 unique rows (confirmed by other queries as well)

TODO: we need to make it so that we get the max date( SELECT FROM where it is distinct in the first result of a sell_trx_hive_id, that is NOT NULL instead of null though)

{"level":30,"time":"2023-01-19T22:01:53.542Z","pid":11954,"hostname":"Trevors-Mac-mini.local","msg":"/services/rentalConfirmation/calculateEarliestTime: xdww earliestTime: 1657120002000"}
{"level":30,"time":"2023-01-19T22:01:53.542Z","pid":11954,"hostname":"Trevors-Mac-mini.local","msg":"/services/rentalConfirmation/getEarliestDateNeeded: xdww earliestTime: 1657120002000"}

{"level":30,"time":"2023-01-19T22:03:31.492Z","pid":12377,"hostname":"Trevors-Mac-mini.local","msg":"txDates: 2211, noTxFound: 0, minDateTime: 1660497828000, minDate: Sun Aug 14 2022 13:23:48 GMT-0400 (Eastern Daylight Time)"}

# NEW

{"level":30,"time":"2023-01-26T01:05:04.875Z","pid":2178,"hostname":"Trevors-Mac-mini.local","msg":"/services/rentalConfirmation/calculateEarliestTime: xdww earliestTime: 1657120002000"}
{"level":30,"time":"2023-01-26T01:05:04.875Z","pid":2178,"hostname":"Trevors-Mac-mini.local","msg":"/services/rentalConfirmation/getEarliestDateNeeded: xdww earliestTime: 1657120002000"} // Wed Jul 06 2022 11:06:42 GMT-0400 (Eastern Daylight Time)

{"level":30,"time":"2023-01-27T09:46:15.052Z","pid":77416,"hostname":"Trevors-Mac-mini.local","msg":"neverConfirmedSellTxs.rows.length: 313, neverConfirmedNullSellTxs.rows.length: 3, confirmedTxs: 101, anyRentalsToConfirm: 104, distinctNotNullRentalTxs: 411, distinctNullRentalTxs: 104, distinctRentalTxsUser: 414"}

looks like we added 3 null ones, and it finally confirmed our new query is working

{"level":30,"time":"2023-01-27T09:49:05.055Z","pid":78207,"hostname":"Trevors-Mac-mini.local","msg":"/services/rentalConfirmation/calculateEarliestTime: xdww earliestTime: 1672361166000, confirmedTxs: 101, nonConfirmedTxs: 0"}
{"level":30,"time":"2023-01-27T09:49:05.055Z","pid":78207,"hostname":"Trevors-Mac-mini.local","msg":"/services/rentalConfirmation/getEarliestDateNeeded: xdww earliestTime: 1672361166000, anyRentalsToConfirm: 104"} // Thu Dec 29 2022 19:46:06 GMT-0500 (Eastern Standard Time)

# TNT NOTE: looks like this confirmation is way less of a big deal than before!

TNT ISSUES: we might want to make the entire updating confirmations a transaction imo, cuz if we fuck up updating it will falsly classify everything imo

{"level":30,"time":"2023-01-28T06:50:10.220Z","pid":72431,"hostname":"Trevors-Mac-mini.local","msg":"/services/rentalConfirmation/patchRentalsBySplintersuite: brain71, numPatched: 2, rentalsStillNotConfirmed: 47, rentalsIdsStillNotConfirmed: 3"}

{"level":30,"time":"2023-01-28T09:29:51.735Z","pid":12958,"hostname":"Trevors-Mac-mini.local","msg":"/services/rentalConfirmation/patchRentalsBySplintersuite: xdww, numPatched: 109, rentalsStillNotConfirmed: 947, rentalsIdsStillNotConfirmed: 50"}

# Full order of confirmation

1234 npm run userRentals - await rentalConfirmation.confirmRentalsForUsers(); (services/rentalConfirmation)
1235 npm run hiveDates - await hiveDates.updateHiveTxDates(); const hiveDates = require('../services/hive/dates');
1238 npm run rentalConfirmation - await rentalConfirmation.confirmRentalsForUsers(); const rentalConfirmation = require('../services/rentalConfirmation');

{"level":30,"time":"2023-01-29T23:49:41.770Z","pid":6536,"hostname":"Trevors-Mac-mini.local","msg":"/services/rentalConfirmation/confirmRentalsForUsers: timeSummary: {\"xdww\":{\"minsLong\":0.2643,\"numPatched\":172},\"tamerent\":{\"minsLong\":0.0003333333333333333},\"mihrk\":{\"minsLong\":0.10596666666666667,\"numPatched\":3},\"adandrentals\":{\"minsLong\":0.11495,\"numPatched\":14},\"tamecards\":{\"minsLong\":114.02293333333333,\"numPatched\":3640},\"bebeomega\":{\"minsLong\":0.0016166666666666666},\"cyguy\":{\"minsLong\":0.90285,\"numPatched\":55},\"idmr500\":{\"minsLong\":4.651516666666667,\"numPatched\":4692},\"gank\":{\"minsLong\":0.23088333333333333,\"numPatched\":280},\"testing\":{\"minsLong\":0.00013333333333333334},\"[object Object]\":{\"minsLong\":0.00011666666666666667},\"suitedemo\":{\"minsLong\":0.00021666666666666666},\"superslayer0040\":{\"minsLong\":0.2664166666666667,\"numPatched\":5},\"knightsagesales\":{\"minsLong\":0.4083333333333333,\"numPatched\":264},\"molins\":{\"minsLong\":0.35646666666666665,\"numPatched\":185},\"macavic\":{\"minsLong\":0.12291666666666666,\"numPatched\":45},\"carciotti03\":{\"minsLong\":0.00018333333333333334},\"cryptonad\":{\"minsLong\":0.0016833333333333333},\"crypto-archivio\":{\"minsLong\":0.00018333333333333334},\"marcklord\":{\"minsLong\":0.00018333333333333334},\"hackinhukk\":{\"minsLong\":0.11518333333333333,\"numPatched\":6},\"redips\":{\"minsLong\":0.00016666666666666666},\"serbboy8\":{\"minsLong\":0.0002666666666666667},\"fitzabombr\":{\"minsLong\":0.00018333333333333334},\"jeenger\":{\"minsLong\":0.1372,\"numPatched\":20},\"dominator30\":{\"minsLong\":0.00015},\"mmft328\":{\"minsLong\":0.12768333333333334,\"numPatched\":29},\"moenke\":{\"minsLong\":0.00045},\"moenki\":{\"minsLong\":0.14746666666666666,\"numPatched\":270},\"chigginn\":{\"minsLong\":0.00023333333333333333},\"giotrix\":{\"minsLong\":0.11953333333333334,\"numPatched\":217},\"porquito.cards\":{\"minsLong\":0.14968333333333333,\"numPatched\":206},\"reality-variance\":{\"minsLong\":0.13256666666666667,\"numPatched\":409},\"carcio\":{\"minsLong\":0.10043333333333333,\"numPatched\":32},\"redenough\":{\"minsLong\":0.0005833333333333334},\"hurax-rent\":{\"minsLong\":0.15836666666666666,\"numPatched\":295},\"pura51\":{\"minsLong\":0.0002},\"jagged\":{\"minsLong\":0.292,\"numPatched\":91},\"brain71\":{\"minsLong\":0.12758333333333333,\"numPatched\":87},\"totalMinsLong\":123.71341666666666}"}

WE ARE USING HIVE_TRX_Id rather than the sell_trx_id so thats why a lot of the stuff isn't getting patched properly

FOR NEVER CONFIRMED TRANSACTIONS, WE JUST NEED TO LOOK UP THE CREATED_AT_DATE OF THE HIVE_TX_DATE AND THEN CAN USE THE confirmed of it yes/no to make our determination (TNT NOTE: we need to add in the hiveTxDate adding whether it was made by splintersuite or not at initialization, first write a script to add it to everyone and then alter current script so the future ones can always be adding that initially imo)
