const { BadRequestError } = require('../expressError');
const { sqlForPartialUpdate } = require('./sql');

// ---------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------
// Test with User Data
const jsToSqlUser = {
	firstName: 'first_name',
	lastName: 'last_name',
	isAdmin: 'is_admin',
};

const userData = {
	first_name: 'Dan',
	last_name: 'Vo',
	email: 'dan@gmail.com',
};

describe('partially update user', function () {
	test('returns object w/ user data used for SQL query', function () {
		const result = sqlForPartialUpdate(userData, jsToSqlUser);
		expect(result).toEqual({
			setCols: '"first_name"=$1, "last_name"=$2, "email"=$3',
			values: ['Dan', 'Vo', 'dan@gmail.com'],
		});
	});

	test('bad request if no data', async function () {
		try {
			const result = sqlForPartialUpdate({});
		} catch (err) {
			expect(err instanceof BadRequestError);
		}
	});
});

// ---------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------
// Test with Company Data

const jsToSqlCompany = {
	handle: 'handle',
	numEmployees: 'num_employees',
};

const companyData = {
	handle: 'apple',
	num_employees: '1000',
};

describe('partially update company', function () {
	test('returns object w/ company data used for SQL query', function () {
		const result = sqlForPartialUpdate(companyData, jsToSqlCompany);
		expect(result).toEqual({
			setCols: '"handle"=$1, "num_employees"=$2',
			values: ['apple', '1000'],
		});
	});
});
