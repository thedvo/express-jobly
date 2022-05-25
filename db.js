'use strict';
/** Postgres Database setup for jobly. */
const { Client } = require('pg');
const { getDatabaseUri } = require('./config');

let db;

if (process.env.NODE_ENV === 'production') {
	db = new Client({
		connectionString: getDatabaseUri(),
		ssl: {
			rejectUnauthorized: false,
		},
	});
} else {
	db = new Client({
		connectionString: getDatabaseUri(),
	});
}

// getDatabaseUri() is a function defined in config.js
// depending on specified node environment, the database will connect to the test or production

db.connect();

module.exports = db;
