'use strict';
const { setTimeout_safe } = require('./_helpers');
// https://github.com/ccxt/ccxt/blob/master/js/base/functions/time.js


const sleep = (ms) => {
  return new Promise(resolve => setTimeout_safe(resolve, ms));
}
module.exports = sleep;

// this is not blocking, it's leet.
// https://stackoverflow.com/questions/13448374/how-to-sleep-the-thread-in-node-js-without-affecting-other-threads


// setTimeout calls resolve after ms milliseconds and then the promise is resolved
/*function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

module.exports = sleep;



/* TNT TODO: change setTimeout as explained in this

*/
