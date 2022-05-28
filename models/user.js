'use strict';

const db = require('../db');
const bcrypt = require('bcrypt');
const { sqlForPartialUpdate } = require('../helpers/sql');
const {
	NotFoundError,
	BadRequestError,
	UnauthorizedError,
} = require('../expressError');

const { BCRYPT_WORK_FACTOR } = require('../config.js');

/** Related functions for users. */

class User {
	/** authenticate user with username, password.
	 *
	 * Returns { username, first_name, last_name, email, is_admin }
	 *
	 * Throws UnauthorizedError is user not found or wrong password.
	 **/

	static async authenticate(username, password) {
		// try to find the user first
		const result = await db.query(
			`SELECT username,
                  password,
                  first_name AS "firstName",
                  last_name AS "lastName",
                  email,
                  is_admin AS "isAdmin"
           FROM users
           WHERE username = $1`,
			[username]
		);

		const user = result.rows[0];

		if (user) {
			// compare hashed password to a new hash from password
			const isValid = await bcrypt.compare(password, user.password);
			if (isValid === true) {
				delete user.password;
				return user;
			}
		}

		throw new UnauthorizedError('Invalid username/password');
	}

	/** Register user with data.
	 *
	 * Returns { username, firstName, lastName, email, isAdmin }
	 *
	 * Throws BadRequestError on duplicates.
	 **/

	static async register({
		username,
		password,
		firstName,
		lastName,
		email,
		isAdmin,
	}) {
		const duplicateCheck = await db.query(
			`SELECT username
           FROM users
           WHERE username = $1`,
			[username]
		);

		if (duplicateCheck.rows[0]) {
			throw new BadRequestError(`Duplicate username: ${username}`);
		}

		const hashedPassword = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);

		const result = await db.query(
			`INSERT INTO users
           (username,
            password,
            first_name,
            last_name,
            email,
            is_admin)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING username, first_name AS "firstName", last_name AS "lastName", email, is_admin AS "isAdmin"`,
			[username, hashedPassword, firstName, lastName, email, isAdmin]
		);

		const user = result.rows[0];

		return user;
	}

	/** Find all users.
	 *
	 * Returns [{ username, first_name, last_name, email, is_admin }, ...]
	 **/

	static async findAll() {
		const result = await db.query(
			`SELECT username,
                  first_name AS "firstName",
                  last_name AS "lastName",
                  email,
                  is_admin AS "isAdmin"
           FROM users
           ORDER BY username`
		);

		return result.rows;
	}

	/** Given a username, return data about user.
	 *
	 * Returns { username, first_name, last_name, is_admin, jobs }
	 *   where jobs is { id, title, company_handle, company_name, state }
	 *
	 * Throws NotFoundError if user not found.
	 **/

	static async get(username) {
		const userRes = await db.query(
			`SELECT username,
                  first_name AS "firstName",
                  last_name AS "lastName",
                  email,
                  is_admin AS "isAdmin"
           FROM users
           WHERE username = $1`,
			[username]
		);

		const user = userRes.rows[0];

		if (!user) throw new NotFoundError(`No user: ${username}`);

		// make another query to Applications table
		// adds user's job applications to the query result object
		const userApplications = await db.query(
			`SELECT a.job_id
           FROM applications AS a
           WHERE a.username = $1`,
			[username]
		);

		user.applications = userApplications.rows.map((a) => a.job_id);
		return user;
	}

	/** STEP 5: Apply for job: update db, returns undefined.
	 *
	 * Accepts:
	 * - username: username applying for job
	 * - jobId: job id
	 **/
	static async applyToJob(username, jobId) {
		// first check if the job exists in the database
		const checkJob = await db.query(
			`SELECT id
           FROM jobs
           WHERE id = $1`,
			[jobId]
		);
		const job = checkJob.rows[0];

		if (!job) throw new NotFoundError(`No job: ${jobId}`);

		// check if the user exists in the database
		const checkUser = await db.query(
			`SELECT username
           FROM users
           WHERE username = $1`,
			[username]
		);
		const user = checkUser.rows[0];

		if (!user) throw new NotFoundError(`No username: ${username}`);

		// once user and job are valid, make a query to insert into the Applications table
		await db.query(
			`INSERT INTO applications (job_id, username)
           VALUES ($1, $2)`,
			[jobId, username]
		);
	}

	/** Update user data with `data`.
	 *
	 * This is a "partial update" --- it's fine if data doesn't contain
	 * all the fields; this only changes provided ones.
	 *
	 * Data can include:
	 *   { firstName, lastName, password, email, isAdmin }
	 *
	 * Returns { username, firstName, lastName, email, isAdmin }
	 *
	 * Throws NotFoundError if not found.
	 *
	 * WARNING: this function can set a new password or make a user an admin.
	 * Callers of this function must be certain they have validated inputs to this
	 * or a serious security risks are opened.
	 */
	// username is req.params.username from patch route
	// data is req.body from the patch route

	static async update(username, data) {
		// if you want to update your password
		if (data.password) {
			data.password = await bcrypt.hash(data.password, BCRYPT_WORK_FACTOR);
		}

		// this sets up the variables needed for the sql query
		// returns an object where we destructure out setCols, values
		// returns set columns string format for the query
		// return the updated values in an array
		const { setCols, values } = sqlForPartialUpdate(data, {
			firstName: 'first_name',
			lastName: 'last_name',
			isAdmin: 'is_admin',
		});

		// makes username the last element to be set in the query
		const usernameVarIdx = '$' + (values.length + 1);

		// sql query variable using setCols and usernameVarIdx
		const querySql = `UPDATE users 
                      SET ${setCols} 
                      WHERE username = ${usernameVarIdx} 
                      RETURNING username,
                                first_name AS "firstName",
                                last_name AS "lastName",
                                email,
                                is_admin AS "isAdmin"`;

		// updates the data by making a query
		// use spread operator on values array and add username at the end
		const result = await db.query(querySql, [...values, username]);

		// if everything works, should return a result
		const user = result.rows[0];

		// if not, then throw an error as the user is not found
		if (!user) throw new NotFoundError(`No user: ${username}`);

		delete user.password;
		return user;
	}

	/** Delete given user from database; returns undefined. */

	static async remove(username) {
		let result = await db.query(
			`DELETE
           FROM users
           WHERE username = $1
           RETURNING username`,
			[username]
		);
		const user = result.rows[0];

		if (!user) throw new NotFoundError(`No user: ${username}`);
	}
}

module.exports = User;
