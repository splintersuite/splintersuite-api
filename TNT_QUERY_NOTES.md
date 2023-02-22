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

TNT TODO:

we need to make it so that when there are unconfirmedTxs that were NEVER CONFIRMED, if after going back and patching we still can't find anything in their hive_tx_dates, we should just take the confirmed status initially

-- sidebar idea, why not just set the date back like 1 day or 12 hours from this time period?

TNT NOTE: it was 5:28 am when I stopped this, which means it was going on for 3.5 hours long, and still wasn't finished patching anything

{"level":30,"time":"2023-02-03T07:13:00.873Z","pid":20035,"hostname":"Trevors-Mac-mini.local","msg":"/services/rentalConfirmation/calculateEarliestTime: tamecards earliestTime: 1658772762000, confirmedTxs: 0, nonConfirmedTxs: 19"}
{"level":30,"time":"2023-02-03T07:13:00.873Z","pid":20035,"hostname":"Trevors-Mac-mini.local","msg":"/services/rentalConfirmation/getEarliestDateNeeded: tamecards earliestTime: 1658772762000, anyRentalsToConfirm: 27"}
{"level":30,"time":"2023-02-03T07:13:00.874Z","pid":20035,"hostname":"Trevors-Mac-mini.local","msg":"earliestTime: 1658772762000, date: Mon Jul 25 2022 14:12:42 GMT-0400 (Eastern Daylight Time)"}
{"level":30,"time":"2023-02-03T07:13:00.874Z","pid":20035,"hostname":"Trevors-Mac-mini.local","msg":"/services/hive/relistings/getTransactionHiveIDsByUser for user: tamecards, startingRecord: -1, iteration: 0"}
{"level":30,"time":"2023-02-03T07:13:12.327Z","pid":20035,"hostname":"Trevors-Mac-mini.local","msg":"/services/hive/relistings/getTransactionHiveIDsByUser for user: tamecards, startingRecord: 14120, iteration: 1"}
{"level":30,"time":"2023-02-03T07:13:24.392Z","pid":20035,"hostname":"Trevors-Mac-mini.local","msg":"/services/hive/relistings/getTransactionHiveIDsByUser for user: tamecards, startingRecord: 13120, iteration: 2"}
{"level":30,"time":"2023-02-03T07:13:36.473Z","pid":20035,"hostname":"Trevors-Mac-mini.local","msg":"/services/hive/relistings/getTransactionHiveIDsByUser for user: tamecards, startingRecord: 12120, iteration: 3"}
{"level":30,"time":"2023-02-03T07:13:48.544Z","pid":20035,"hostname":"Trevors-Mac-mini.local","msg":"/services/hive/relistings/getTransactionHiveIDsByUser for user: tamecards, startingRecord: 11120, iteration: 4"}
{"level":30,"time":"2023-02-03T07:14:01.145Z","pid":20035,"hostname":"Trevors-Mac-mini.local","msg":"/services/hive/relistings/getTransactionHiveIDsByUser for user: tamecards, startingRecord: 10120, iteration: 5"}
{"level":30,"time":"2023-02-03T07:14:13.318Z","pid":20035,"hostname":"Trevors-Mac-mini.local","msg":"/services/hive/relistings/getTransactionHiveIDsByUser for user: tamecards, startingRecord: 9120, iteration: 6"}
{"level":30,"time":"2023-02-03T07:14:25.451Z","pid":20035,"hostname":"Trevors-Mac-mini.local","msg":"/services/hive/relistings/getTransactionHiveIDsByUser for user: tamecards, startingRecord: 8120, iteration: 7"}
{"level":30,"time":"2023-02-03T07:14:38.048Z","pid":20035,"hostname":"Trevors-Mac-mini.local","msg":"/services/hive/relistings/getTransactionHiveIDsByUser for user: tamecards, startingRecord: 7120, iteration: 8"}
{"level":30,"time":"2023-02-03T07:14:50.664Z","pid":20035,"hostname":"Trevors-Mac-mini.local","msg":"/services/hive/relistings/getTransactionHiveIDsByUser for user: tamecards, startingRecord: 6120, iteration: 9"}
{"level":30,"time":"2023-02-03T07:15:03.238Z","pid":20035,"hostname":"Trevors-Mac-mini.local","msg":"/services/hive/relistings/getTransactionHiveIDsByUser for user: tamecards, startingRecord: 5120, iteration: 10"}
{"level":30,"time":"2023-02-03T07:15:15.836Z","pid":20035,"hostname":"Trevors-Mac-mini.local","msg":"/services/hive/relistings/getTransactionHiveIDsByUser for user: tamecards, startingRecord: 4120, iteration: 11"}
{"level":30,"time":"2023-02-03T07:15:18.413Z","pid":20035,"hostname":"Trevors-Mac-mini.local","msg":"/services/hive/relistings/getTransactionHiveIDsByUser: tamecards"}
{"level":30,"time":"2023-02-03T07:15:18.413Z","pid":20035,"hostname":"Trevors-Mac-mini.local","msg":"recentHiveIDs: 8642, tooOld: 2, lastRecord[0]: 3410"}
{"level":30,"time":"2023-02-03T07:15:18.413Z","pid":20035,"hostname":"Trevors-Mac-mini.local","msg":"/services/rentalConfirmation/patchRentalsWithRelistings tamecards"}
strict mode: missing type "number,string" for keyword "format" at "#/properties/rented_at" (strictTypes)
strict mode: missing type "number,string" for keyword "format" at "#/properties/next_rental_payment" (strictTypes)
strict mode: missing type "number,string" for keyword "format" at "#/properties/last_rental_payment" (strictTypes)
^C

# TODOs after confirmation

1. invoices now that confirmations are good to go

2. delete old data from userRentals (which imo happens after invoices are out)

3. delete users that never have any confirmed for us ever (give it a month and if they don't ever use it, then delete them from the database and wipe out all of their user Rental data and everything else)

4. make the rental data available in API format

5. WHEN DELETING, we must make sure in our getNonConfirmedTxs that we ALSO GET TRANSACTIONS THAT HAVE SOME DELETED USER RENTALS TO MAKE SURE WE ARENT COPYING A DUPE.

-   we should make a migration for hiveTxDate and make sure that we record the dateTime it was last confirmed, as well as the value for that recentlyConfirmed imo

curl -s --data '{"jsonrpc":"2.0", "method":"condenser_api.get_transaction", "params":["32a0ecd910907f67a58107973d3b2f9f0a4a0da6"], "id":1}' https://api.hive.blog/
