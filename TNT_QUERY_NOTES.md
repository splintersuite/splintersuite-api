SELECT count(\*) FROM (SELECT(select distinct sell_trx_hive_id) from user_rentals ur group by sell_trx_hive_id having bool_and(confirmed is null)) AS xd ;

this gets us 24 results, which shows that imo there are only 24 rows of sell_trx_hive_ids that have ZERO nulls (we should check the confirmed is not null to confirm)

select count(\*) from (select sell_trx_hive_id, max(last_rental_payment) max_date from user_rentals ur group by sell_trx_hive_id having bool_and(confirmed is not null)) as xd ;

5,690 rows as a result, which shows there a of rows that are only showing up here if they are all confirmed (or their most recent max date is confirmed)

select count(\*) from hive_tx_date;
7612 rows, showing there are 7612 unique rows (confirmed by other queries as well)

TODO: we need to make it so that we get the max date( SELECT FROM where it is distinct in the first result of a sell_trx_hive_id, that is NOT NULL instead of null though)
