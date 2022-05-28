'use strict';

const db = require('../db.js');
const User = require('../models/user');
const Company = require('../models/company');
const Job = require('../models/job');
const { createToken } = require('../helpers/tokens');

const testJobIds = [];

async function commonBeforeAll() {
	// noinspection SqlWithoutWhere
	await db.query('DELETE FROM users');
	// noinspection SqlWithoutWhere
	await db.query('DELETE FROM companies');

	await Company.create({
		handle: 'c1',
		name: 'C1',
		numEmployees: 1,
		description: 'Desc1',
		logoUrl: 'http://c1.img',
	});
	await Company.create({
		handle: 'c2',
		name: 'C2',
		numEmployees: 2,
		description: 'Desc2',
		logoUrl: 'http://c2.img',
	});
	await Company.create({
		handle: 'c3',
		name: 'C3',
		numEmployees: 3,
		description: 'Desc3',
		logoUrl: 'http://c3.img',
	});

	testJobIds[0] = (
		await Job.create({
			title: 'J1',
			salary: 1,
			equity: '0.1',
			companyHandle: 'c1',
		})
	).id;
	testJobIds[1] = (
		await Job.create({
			title: 'J2',
			salary: 2,
			equity: '0.2',
			companyHandle: 'c1',
		})
	).id;
	testJobIds[2] = (
		await Job.create({
			title: 'J3',
			salary: 3,
			/* equity null */ companyHandle: 'c1',
		})
	).id;

	await User.register({
		username: 'u1',
		firstName: 'U1F',
		lastName: 'U1L',
		email: 'user1@user.com',
		password: 'password1',
		isAdmin: false,
	});
	await User.register({
		username: 'u2',
		firstName: 'U2F',
		lastName: 'U2L',
		email: 'user2@user.com',
		password: 'password2',
		isAdmin: false,
	});
	await User.register({
		username: 'u3',
		firstName: 'U3F',
		lastName: 'U3L',
		email: 'user3@user.com',
		password: 'password3',
		isAdmin: false,
	});

	await User.applyToJob('u1', testJobIds[0]);
}

// BEGIN initiates a transaction block, that is, all statements after a BEGIN command will be executed in a single transaction until an explicit COMMIT or ROLLBACK is given.
// https://www.postgresql.org/docs/current/sql-begin.html
async function commonBeforeEach() {
	await db.query('BEGIN');
}

// The ROLLBACK command is the transactional command used to undo transactions that have not already been saved to the database.
// The ROLLBACK command can only be used to undo transactions since the last COMMIT or ROLLBACK command was issued.
// https://www.tutorialdba.com/p/postgresql-rollback.html
async function commonAfterEach() {
	await db.query('ROLLBACK');
}

async function commonAfterAll() {
	await db.end();
}

const u1Token = createToken({ username: 'u1', isAdmin: false });
const u2Token = createToken({ username: 'u2', isAdmin: false });
const adminToken = createToken({ username: 'admin', isAdmin: true });

module.exports = {
	commonBeforeAll,
	commonBeforeEach,
	commonAfterEach,
	commonAfterAll,
	u1Token,
	u2Token,
	adminToken,
	testJobIds,
};
