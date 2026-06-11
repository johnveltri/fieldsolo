const path = require('path');

const { load } = require('@expo/env');

// Support accidental `expo start` from the monorepo root.
load(path.join(__dirname, 'apps/mobile-expo'));

module.exports = require('./apps/mobile-expo/app.config.js');
