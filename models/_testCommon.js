const bcrypt = require('bcrypt');

const db = require('../db.js');
const { BCRYPT_WORK_FACTOR } = require('../config');

const testJobIds = [];

async function commonBeforeAll() {
	// noinspection SqlWithoutWhere
	await db.query('DELETE FROM companies');
	// noinspection SqlWithoutWhere
	await db.query('DELETE FROM users');

	await db.query(`
    INSERT INTO companies(handle, name, num_employees, description, logo_url)
    VALUES ('c1', 'C1', 1, 'Desc1', 'http://c1.img'),
           ('c2', 'C2', 2, 'Desc2', 'http://c2.img'),
           ('c3', 'C3', 3, 'Desc3', 'http://c3.img')`);

	const resultsJobs = await db.query(`
    INSERT INTO jobs (title, salary, equity, company_handle)
    VALUES ('Job1', 100, '0.1', 'c1'),
           ('Job2', 200, '0.2', 'c1'),
           ('Job3', 300, '0', 'c1'),
           ('Job4', NULL, NULL, 'c1')
    RETURNING id`);
	testJobIds.splice(0, 0, ...resultsJobs.rows.map((r) => r.id));

	await db.query(
		`
        INSERT INTO users(username,
                          password,
                          first_name,
                          last_name,
                          email)
        VALUES ('u1', $1, 'U1F', 'U1L', 'u1@email.com'),
               ('u2', $2, 'U2F', 'U2L', 'u2@email.com')
        RETURNING username`,
		[
			await bcrypt.hash('password1', BCRYPT_WORK_FACTOR),
			await bcrypt.hash('password2', BCRYPT_WORK_FACTOR),
		]
	);

	// seed application table
	await db.query(
		`
        INSERT INTO applications(username, job_id)
        VALUES ('u1', $1)`,
		[testJobIds[0]]
	);
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

module.exports = {
	commonBeforeAll,
	commonBeforeEach,
	commonAfterEach,
	commonAfterAll,
	testJobIds,
};
