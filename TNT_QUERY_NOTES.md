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
{"level":30,"time":"2023-01-26T01:05:04.875Z","pid":2178,"hostname":"Trevors-Mac-mini.local","msg":"/services/rentalConfirmation/getEarliestDateNeeded: xdww earliestTime: 1657120002000"}

{"level":30,"time":"2023-01-27T09:46:15.052Z","pid":77416,"hostname":"Trevors-Mac-mini.local","msg":"neverConfirmedSellTxs.rows.length: 313, neverConfirmedNullSellTxs.rows.length: 3, confirmedTxs: 101, anyRentalsToConfirm: 104, distinctNotNullRentalTxs: 411, distinctNullRentalTxs: 104, distinctRentalTxsUser: 414"}

looks like we added 3 null ones, and it finally confirmed our new query is working
