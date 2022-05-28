'use strict';

const db = require('../db');
const { BadRequestError, NotFoundError } = require('../expressError');
const { sqlForPartialUpdate } = require('../helpers/sql');

/** Related functions for companies. */

class Company {
	/** Create a company (from data), update db, return new company data.
	 *
	 * data should be { handle, name, description, numEmployees, logoUrl }
	 *
	 * Returns { handle, name, description, numEmployees, logoUrl }
	 *
	 * Throws BadRequestError if company already in database.
	 * */

	static async create({ handle, name, description, numEmployees, logoUrl }) {
		const duplicateCheck = await db.query(
			`SELECT handle
           FROM companies
           WHERE handle = $1`,
			[handle]
		);

		if (duplicateCheck.rows[0])
			throw new BadRequestError(`Duplicate company: ${handle}`);

		const result = await db.query(
			`INSERT INTO companies
           (handle, name, description, num_employees, logo_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
			[handle, name, description, numEmployees, logoUrl]
		);
		const company = result.rows[0];

		return company;
	}

	/** Find all companies.
	 *
	 * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
	 * */

	static async findAll(filters = {}) {
		let query = `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies`;
		// WHERE expressions
		// will be used to collect all of the WHERE expressions from the inputted filters in the query string.
		// once done collecting, JOIN these array elements with ' AND ' separating them
		let whereExpressions = [];
		// query values passed in
		let queryValues = [];

		// destructure the valid query values from the req.query object
		const { minEmployees, maxEmployees, name } = filters;

		// For each possible search term, add to whereExpressions array and queryValues array to generate the correct query

		// if minEmployees is greater than the maxEmployees, throw error
		if (minEmployees > maxEmployees) {
			throw new BadRequestError(
				"Min employees can't be greater than max employees"
			);
		}

		if (minEmployees !== undefined) {
			queryValues.push(minEmployees);
			whereExpressions.push(`num_employees >= $${queryValues.length}`);
		}

		if (maxEmployees !== undefined) {
			queryValues.push(maxEmployees);
			whereExpressions.push(`num_employees <= $${queryValues.length}`);
		}

		if (name) {
			// Finds any values that have 'name' in any position
			queryValues.push(`%${name}%`);
			whereExpressions.push(`name ILIKE $${queryValues.length}`);
			// https://www.geeksforgeeks.org/postgresql-ilike-operator/
		}

		// join the whereExpressions array separating each element with "AND"
		// concatenate that with the query set above and "WHERE"
		if (whereExpressions.length > 0) {
			query += ' WHERE ' + whereExpressions.join(' AND ');
		}

		// once all variables are set, make the query and return the result
		query += ' ORDER BY name';
		const companiesRes = await db.query(query, queryValues);
		return companiesRes.rows;
	}

	/** Given a company handle, return data about company.
	 *
	 * Returns { handle, name, description, numEmployees, logoUrl, jobs }
	 *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
	 *
	 * Throws NotFoundError if not found.
	 **/

	static async get(handle) {
		const companyRes = await db.query(
			`SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           WHERE handle = $1`,
			[handle]
		);

		const company = companyRes.rows[0];

		if (!company) throw new NotFoundError(`No company: ${handle}`);

		// PART 4 - Show jobs for a company
		const jobsRes = await db.query(
			`SELECT id, title, salary, equity
           FROM jobs
           WHERE company_handle = $1
           ORDER BY id`,
			[handle]
		);

		// adds the query result for the jobs to the company object
		company.jobs = jobsRes.rows;

		return company;
	}

	/** Update company data with `data`.
	 *
	 * This is a "partial update" --- it's fine if data doesn't contain all the
	 * fields; this only changes provided ones.
	 *
	 * Data can include: {name, description, numEmployees, logoUrl}
	 *
	 * Returns {handle, name, description, numEmployees, logoUrl}
	 *
	 * Throws NotFoundError if not found.
	 */

	static async update(handle, data) {
		const { setCols, values } = sqlForPartialUpdate(data, {
			numEmployees: 'num_employees',
			logoUrl: 'logo_url',
		});
		const handleVarIdx = '$' + (values.length + 1);

		const querySql = `UPDATE companies 
                      SET ${setCols} 
                      WHERE handle = ${handleVarIdx} 
                      RETURNING handle, 
                                name, 
                                description, 
                                num_employees AS "numEmployees", 
                                logo_url AS "logoUrl"`;
		const result = await db.query(querySql, [...values, handle]);
		const company = result.rows[0];

		if (!company) throw new NotFoundError(`No company: ${handle}`);

		return company;
	}

	/** Delete given company from database; returns undefined.
	 *
	 * Throws NotFoundError if company not found.
	 **/

	static async remove(handle) {
		const result = await db.query(
			`DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
			[handle]
		);
		const company = result.rows[0];

		if (!company) throw new NotFoundError(`No company: ${handle}`);
	}
}

module.exports = Company;
