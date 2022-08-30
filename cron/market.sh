#!/bin/bash

set -fux
APP_DIR="/home/ubuntu/splintersuite-api"
E_XCD=86

cd $APP_DIR || {
  echo "cannot change to the app directory" >&2
  exit $E_XCD;
}

/home/ubuntu/.nvm/versions/node/v16.14.2/bin/node /home/ubuntu/splintersuite-api/src/scripts/market.js 

exit 0