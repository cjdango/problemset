'use strict';

const lib = require('./lib/lib');
const events = require('events');


const doAsync = async items => {
  for (const item of items) {
    if (!Array.isArray(item)) {
      await lib.asyncOp(item);
    } else {
      await Promise.all(item.map(element => lib.asyncOp(element)));
    }
  }
};

