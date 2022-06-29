# Setup

```
// requires .env file
npm install
npm start
```

# DB

`https://cloud.digitalocean.com/databases/splintersuite?i=c68d38`

# setup db on local

$ psql
$ \i /Users/jackdealtrey/Documents/code/spl/splintersuite-api/init.sql (your path obv)
$ \q

$ node_modules/.bin/knex migrate:latest --esm
or if you have knex installed
$ knex migrate:latest

# running node index.js

node --experimental-specifier-resolution=node index.js
to handle for "type": "module", in package.json

# Cron Scripts

when you run something in the scripts page (ie like in a cron process)

you need to explicitly pass the environment variables

-- brawl script:

```
DB_CONNECTION=postgresql://user:AVNS_Zf4uLgrGjr4z8-VRsZW@splintersuite-do-user-2517044-0.b.db.ondigitalocean.com:25060/splintersuite-dev NODE_ENV=development PINO_LOG_LEVEL=debug node brawls.js

30 6 * * * DB_CONNECTION=postgresql://user:AVNS_Zf4uLgrGjr4z8-VRsZW@splintersuite-do-user-2517044-0.b.db.ondigitalocean.com:25060/splintersuite-staging NODE_ENV=production PINO_LOG_LEVEL=debug DEBUG=false /home/ubuntu/.nvm/versions/node/v16.14.2/bin/node /home/ubuntu/splintersuite-api/src/scripts/brawls.js >> /home/ubuntu/Brawl.log 2>&1

-- calculate earnings script:

DB_CONNECTION=postgresql://user:AVNS_Zf4uLgrGjr4z8-VRsZW@splintersuite-do-user-2517044-0.b.db.ondigitalocean.com:25060/splintersuite-dev NODE_ENV=development PINO_LOG_LEVEL=debug node earnings.js

0 */4 * * * DB_CONNECTION=postgresql://user:AVNS_Zf4uLgrGjr4z8-VRsZW@splintersuite-do-user-2517044-0.b.db.ondigitalocean.com:25060/splintersuite-staging NODE_ENV=production PINO_LOG_LEVEL=debug DEBUG=false /home/ubuntu/.nvm/versions/node/v16.14.2/bin/node /home/ubuntu/splintersuite-api/src/scripts/earnings.js >> /home/ubuntu/Earnings.log 2>&1

-- newSeasonData script:

DB_CONNECTION=postgresql://user:AVNS_Zf4uLgrGjr4z8-VRsZW@splintersuite-do-user-2517044-0.b.db.ondigitalocean.com:25060/splintersuite-dev NODE_ENV=development PINO_LOG_LEVEL=debug node seasons.js

0 7 * * * DB_CONNECTION=postgresql://user:AVNS_Zf4uLgrGjr4z8-VRsZW@splintersuite-do-user-2517044-0.b.db.ondigitalocean.com:25060/splintersuite-staging NODE_ENV=production PINO_LOG_LEVEL=debug DEBUG=false /home/ubuntu/.nvm/versions/node/v16.14.2/bin/node /home/ubuntu/splintersuite-api/src/scripts/seasons.js >> /home/ubuntu/Seasons.log 2>&1

-- Rentals/Historical Script:

DB_CONNECTION=postgresql://user:AVNS_Zf4uLgrGjr4z8-VRsZW@splintersuite-do-user-2517044-0.b.db.ondigitalocean.com:25060/splintersuite-dev NODE_ENV=development PINO_LOG_LEVEL=debug node market.js

30 */12 * * * DB_CONNECTION=postgresql://user:AVNS_Zf4uLgrGjr4z8-VRsZW@splintersuite-do-user-2517044-0.b.db.ondigitalocean.com:25060/splintersuite-staging NODE_ENV=production PINO_LOG_LEVEL=debug DEBUG=false /home/ubuntu/.nvm/versions/node/v16.14.2/bin/node /home/ubuntu/splintersuite-api/src/scripts/market.js >> /home/ubuntu/Market.log 2>&1

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

"id: 90, name: Brawl Cycle 90, start: 2022-06-18T07:00:00.000Z, end: 2022-06-23T08:00:00.000Z"}
```

Production Scripts:

```


DB_CONNECTION=postgresql://user:AVNS_Zf4uLgrGjr4z8-VRsZW@splintersuite-do-user-2517044-0.b.db.ondigitalocean.com:25060/splintersuite-production

ONE TIME SETUP CALL:

DB_CONNECTION=postgresql://user:AVNS_Zf4uLgrGjr4z8-VRsZW@splintersuite-do-user-2517044-0.b.db.ondigitalocean.com:25060/splintersuite-production NODE_ENV=production PINO_LOG_LEVEL=debug /home/ubuntu/.nvm/versions/node/v16.14.2/bin/node /home/ubuntu/splintersuite-api/src/scripts/tests/oldSeason.js

# Cron Scripts

-- brawl script:

30 6 * * * DB_CONNECTION=postgresql://user:AVNS_Zf4uLgrGjr4z8-VRsZW@splintersuite-do-user-2517044-0.b.db.ondigitalocean.com:25060/splintersuite-production NODE_ENV=production PINO_LOG_LEVEL=info DEBUG=false /home/ubuntu/.nvm/versions/node/v16.14.2/bin/node /home/ubuntu/splintersuite-api/src/scripts/brawls.js >> /home/ubuntu/Brawl.log 2>&1

-- earnings script:

0 */4 * * * DB_CONNECTION=postgresql://user:AVNS_Zf4uLgrGjr4z8-VRsZW@splintersuite-do-user-2517044-0.b.db.ondigitalocean.com:25060/splintersuite-production NODE_ENV=production PINO_LOG_LEVEL=debug DEBUG=false /home/ubuntu/.nvm/versions/node/v16.14.2/bin/node /home/ubuntu/splintersuite-api/src/scripts/earnings.js >> /home/ubuntu/Earnings.log 2>&1

-- newSeason script:

0 7 * * * DB_CONNECTION=postgresql://user:AVNS_Zf4uLgrGjr4z8-VRsZW@splintersuite-do-user-2517044-0.b.db.ondigitalocean.com:25060/splintersuite-production NODE_ENV=production PINO_LOG_LEVEL=debug DEBUG=false /home/ubuntu/.nvm/versions/node/v16.14.2/bin/node /home/ubuntu/splintersuite-api/src/scripts/seasons.js >> /home/ubuntu/Seasons.log 2>&1

-- ON 2ND DEDICATED SERVER, Market Data Script:

30 */12 * * * DB_CONNECTION=postgresql://user:AVNS_Zf4uLgrGjr4z8-VRsZW@splintersuite-do-user-2517044-0.b.db.ondigitalocean.com:25060/splintersuite-production PINO_LOG_LEVEL=debug DEBUG=false /home/ubuntu/.nvm/versions/node/v16.14.2/bin/node /home/ubuntu/splintersuite-api/src/scripts/market.js >> /home/ubuntu/Market.log 2>&1

```

# API Notes:

collection = https://api2.splinterlands.com/cards/collection/xdww
collection.market_created_date is when the listing is made.
activeRentals.rental_date is different than this date, and is when the listing is actually rented.
