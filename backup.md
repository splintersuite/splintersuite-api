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
