const path = require('path');

const { load } = require('@expo/env');

// Always load env from this app directory, even when Metro is started elsewhere.
load(path.join(__dirname));

/** @type {import('expo/config').ExpoConfig} */
module.exports = ({ config }) => ({
  ...require('./app.json').expo,
  ...config,
});
