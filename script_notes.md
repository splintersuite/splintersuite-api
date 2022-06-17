when you run something in the scripts page (ie like in a cron process)

you need to explicitly pass the environment variables

DB_CONNECTION=postgresql://user:AVNS_Zf4uLgrGjr4z8-VRsZW@splintersuite-do-user-2517044-0.b.db.ondigitalocean.com:25060/tnt-splintersuite-dev NODE_ENV=development node endOfSeasonAndBrawl.js
