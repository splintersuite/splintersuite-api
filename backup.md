# steps that got us to backup our db from digital ocean and import it correctly locally
- 1)  PGPASSWORD="AVNS_Zf4uLgrGjr4z8-VRsZW" pg_dump -T knex_migrations -T knex_migrations_lock -h splintersuite-do-user-2517044-0.b.db.ondigitalocean.com -U user -p 25060 --data-only --no-owner splintersuite-production > dataonlybackup69.sql

- 2) node_modules/.bin/knex migrate:latest
  - TNT NOTE: when merging this into our RDS instance, we can actually just merge all of the merge files into one and not have to deal with any seperate files going forward

- 3)  psql -v ON_ERROR_STOP=1 -f dataonlybackup69.sql prodtest


AND THEN IT WORKS FINE :)


# Sources

https://gist.github.com/phortuin/2fe698b6c741fd84357cec84219c6667

https://www.codementor.io/@engineerapart/getting-started-with-postgresql-on-mac-osx-are8jcopb

https://www.postgresqltutorial.com/postgresql-administration/postgresql-backup-database/

https://stackoverflow.com/questions/40642359/ignoring-a-table-in-pg-dump-and-restore

https://snapshooter.com/learn/postgresql/pg_dump_pg_restore

https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Procedural.Importing.html

https://stackoverflow.com/questions/20427689/psql-invalid-command-n-while-restore-sql

https://www.postgresql.org/docs/current/backup-dump.html

https://www.postgresql.org/docs/current/app-pgdump.html

https://postgrespro.com/list/thread-id/1560840

https://aws.amazon.com/blogs/database/best-practices-for-migrating-postgresql-databases-to-amazon-rds-and-amazon-aurora/

https://simplebackups.com/blog/postgresql-pgdump-and-pgrestore-guide-examples/

https://postgrespro.ru/list/thread-id/1424397

https://stackoverflow.com/questions/2857989/using-pg-dump-to-only-get-insert-statements-from-one-table-within-database

https://docs.aws.amazon.com/dms/latest/sbs/chap-manageddatabases.postgresql-rds-postgresql-full-load-pd_dump.html

https://wiki.postgresql.org/wiki/Automated_Backup_on_Linux

https://pgbarman.org/downloads/

https://arctype.com/blog/backup-postgres-database/#:~:text=Backing%20up%20a%20PostgreSQL%20Database,-In%20PostgreSQL%2C%20you&text=To%20back%20up%20your%20database,account%2C%20and%20run%20the%20command.&text=The%20plain%2Dtext%20SQL%20file,its%20state%20when%20backed%20up.

https://www.enterprisedb.com/postgresql-database-backup-recovery-what-works-wal-pitr


https://dba.stackexchange.com/questions/36984/how-to-determine-if-a-postgres-database-needs-to-be-vaccumed

https://www.postgresql.org/docs/current/monitoring-stats.html#MONITORING-PG-STAT-DATABASE-VIEW

https://www.postgresql.org/docs/9.1/runtime-config-resource.html


https://www.craigkerstiens.com/2012/10/01/understanding-postgres-performance/


https://stackoverflow.com/questions/18907047/postgres-db-size-command


# Automated RDS backup to s3
https://gist.github.com/Murali91/8a767d4f39a921b78ee09a39e7461377

https://www.percona.com/blog/querying-archived-rds-data-directly-from-an-s3-bucket/

https://www.percona.com/blog/2013/08/12/want-to-archive-tables-use-pt-archiver/

https://gist.github.com/Murali91/8a767d4f39a921b78ee09a39e7461377

https://aws.amazon.com/blogs/database/archiving-data-from-relational-databases-to-amazon-glacier-via-aws-dms/



