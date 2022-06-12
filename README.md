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
