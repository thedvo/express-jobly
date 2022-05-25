const { BadRequestError } = require('../expressError');

// sets up the variables needed for a SQL query to update

// dataToUpdate = the updated data from req.body
// jsToSql = column name variables in an object. used for translating camelcase variables to snake case

function sqlForPartialUpdate(dataToUpdate, jsToSql) {
	// takes the key values of the object with column names
	const keys = Object.keys(dataToUpdate);
	if (keys.length === 0) throw new BadRequestError('No data');
	// if the object is empty, throw an error

	// {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
	const cols = keys.map(
		(colName, idx) => `"${jsToSql[colName] || colName}"=$${idx + 1}`
	);
	// for each key value, set it to equal it's index + 1
	// ['"first_name"=$1', '"age"=$2'];

	return {
		// join the array into a single string with elements separated by comma. We will use this string to write the SQL query (SET)
		setCols: cols.join(', '),
		values: Object.values(dataToUpdate),
		// returns the values from req.body object in an array
	};
}

module.exports = { sqlForPartialUpdate };
