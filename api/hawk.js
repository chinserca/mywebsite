'use strict';
const blob = require('@vercel/blob');
const { createStore } = require('../server/hawk-store.cjs');
const { createHandler } = require('../server/hawk-handler.cjs');
module.exports = createHandler({ store: createStore(blob) });
