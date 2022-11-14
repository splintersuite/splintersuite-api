# Setup

```
// requires .env file
npm install
npm start
```

# DB

`https://cloud.digitalocean.com/databases/splintersuite?i=c68d38`

# Redis on mac (note this is for M1, instructions for non M1 mac also in the below link)

https://redis.io/docs/stack/get-started/install/mac-os/

redis-stack-server

# setup db on local

$ psql
$ \i /Users/jackdealtrey/Documents/code/spl/splintersuite-api/init.sql (your path obv)
$ \q

$ node_modules/.bin/knex migrate:latest --esm

node_modules/.bin/knex migrate:down 20220731054417_v2BotEarning.js

node_modules/.bin/knex migrate:list

or if you have knex installed
$ knex migrate:latest
https://stackoverflow.com/questions/40427903/knex-rollback-specific-migration

# previous season information from API :

-- oneTime/oldSeason.js script:

DB_CONNECTION=postgresql://user:AVNS_Zf4uLgrGjr4z8-VRsZW@splintersuite-do-user-2517044-0.b.db.ondigitalocean.com:25060/splintersuite-dev NODE_ENV=development PINO_LOG_LEVEL=debug node oldSeason.js

DB_CONNECTION=postgresql://user:AVNS_Zf4uLgrGjr4z8-VRsZW@splintersuite-do-user-2517044-0.b.db.ondigitalocean.com:25060/splintersuite-staging NODE_ENV=production PINO_LOG_LEVEL=debug /home/ubuntu/.nvm/versions/node/v16.14.2/bin/node /home/ubuntu/splintersuite-api/src/scripts/tests/oldSeason.js

// output of getSLSeasonAndBrawlData function:
// seasonData, brawlData:
// {
// id: 88,
// name: 'Splinterlands Season 74',
// ends: '2022-06-15T14:00:00.000Z'
// } {
// id: 89,
// name: 'Brawl Cycle 89',
// start: '2022-06-13T06:00:00.000Z',
// end: '2022-06-18T07:00:00.000Z'
// }

{
id: 89,
name: "Ranked Rewards Season 2",
ends: "2022-06-30T14:00:00.000Z",

"id: 90, name: Brawl Cycle 90, start: 2022-06-18T07:00:00.000Z, end: 2022-06-23T08:00:00.000Z"}

```

brawl_cycle: {
id: 92,
name: "Brawl Cycle 92",
start: "2022-06-28T09:00:00.000Z",
status: 1,
reset_block_num: null,
end: "2022-07-04T10:00:00.000Z"

season": {
"id": 90,
"name": "Ranked Rewards Season 3",
"ends": "2022-07-13T14:00:00.000Z",

Production Scripts:

```

ONE TIME SETUP CALL:

splintersuite-api/cron/oneTime/oldSeason.sh

# Cron Scripts

-- brawl script:

30 6 \* \* \* /home/ubuntu/splintersuite-api/cron/brawls.sh >> /home/ubuntu/cronLogs/Brawl.log 2>&1

-- earnings script:

0 _/4 _ \* \* /home/ubuntu/splintersuite-api/cron/earnings.sh >> /home/ubuntu/cronLogs/Earnings.log 2>&1

-- newSeason script:

0 7 \* \* \* /home/ubuntu/splintersuite-api/cron/seasons.sh >> /home/ubuntu/cronLogs/Seasons.log 2>&1

-- ON 2ND DEDICATED SERVER, Market Data Script:

30 _/12 _ \* \* /home/ubuntu/splintersuite-api/cron/market.js >> /home/ubuntu/cronLogs/Market.log 2>&1

```
STARTING:

pm2 start ecosystem.config.js --env production

https://stackoverflow.com/questions/44883269/what-is-the-difference-between-pm2-restart-and-pm2-reload
-   we should always use pm2 reload <app name> rather than restart, as detailed here
# API Notes:

collection = https://api2.splinterlands.com/cards/collection/xdww
collection.market_created_date is when the listing is made.
activeRentals.rental_date is different than this date, and is when the listing is actually rented.

# Extracting data from old db for earnings:

select ur._, url._ from user_rentals ur join user_rental_listings url on ur.user_rental_listing_id=url.id where ur.users_id='fd12e394-22ae-4062-9207-9da94958fb8e' ;
(users_id is for xdww users account)

pg_dump command:

# https://www.digitalocean.com/community/questions/how-to-download-database-backup

PGPASSWORD=DBPassword pg_dump -h splintersuite-do-user-2517044-0.b.db.ondigitalocean.com -U doadmin -p 25060 -Fc splintersuite-production > dbdump.pgsql

pg_restore -d 'use_your_connnectionURI' --jobs 4 use_your_dump_file

removing old postgresql downloads:

https://askubuntu.com/questions/32730/how-to-remove-postgres-from-my-installation#:~:text=One%20command%20to%20completely%20remove,postgresql%20and%20all%20it's%20compenents.

first run:

dpkg -l | grep postgres

this run sudo apt-get --purge remove postgresql postgresql-additional-Packages

-   these additional packages come from the output of the above dpkg -l | grep postgres command

sudo deluser postgres

-   deletes the postgres user

then to download postgres 14:

https://www.postgresql.org/download/linux/ubuntu/

# Create the file repository configuration:

sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'

# Import the repository signing key:

wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -

# Update the package lists:

sudo apt-get update

# Install the latest version of PostgreSQL.

# If you want a specific version, use 'postgresql-12' or similar instead of 'postgresql':

sudo apt-get -y install postgresql-14
```
