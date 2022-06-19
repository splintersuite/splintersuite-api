when you run something in the scripts page (ie like in a cron process)

you need to explicitly pass the environment variables

DB_CONNECTION=postgresql://user:AVNS_Zf4uLgrGjr4z8-VRsZW@splintersuite-do-user-2517044-0.b.db.ondigitalocean.com:25060/tnt-splintersuite-dev NODE_ENV=development node endOfSeasonAndBrawl.js

DB_CONNECTION=postgresql://user:AVNS_Zf4uLgrGjr4z8-VRsZW@splintersuite-do-user-2517044-0.b.db.ondigitalocean.com:25060/splintersuite-dev NODE_ENV=development node endOfSeasonAndBrawl.js

cron:

35 4 \* \* \* DB_CONNECTION=postgresql://user:AVNS_Zf4uLgrGjr4z8-VRsZW@splintersuite-do-user-2517044-0.b.db.ondigitalocean.com:25060/splintersuite-dev NODE_ENV=development /home/ubuntu/.nvm/versions/node/v16.14.2/bin/node /home/ubuntu/splintersuite-api/src/scripts/endOfSeasonAndBrawl.js >> /home/ubuntu/cronlog.txt 2>&1
that runs at 4:35 am (UTC time which is 4 hours ahead of EST) everyday (with no \ before \*)
