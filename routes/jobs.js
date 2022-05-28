'use strict';

/** Routes for jobs. */

const express = require('express');
const { BadRequestError } = require('../expressError');
const { ensureAdmin } = require('../middleware/auth');

const Job = require('../models/job');

// Schemas
const jsonschema = require('jsonschema');
const jobNewSchema = require('../schemas/jobNew.json');
const jobUpdateSchema = require('../schemas/jobUpdate.json');
const jobSearchSchema = require('../schemas/jobSearch.json');

const router = express.Router({ mergeParams: true });

// CREATE A JOB
// Authorization Required: Admin
// job should be { title, salary, equity, companyHandle }
// Returns { id, title, salary, equity, companyHandle }
router.post('/', ensureAdmin, async function (req, res, next) {
	try {
		const validator = jsonschema.validate(req.body, jobNewSchema);
		if (!validator.valid) {
			const errs = validator.errors.map((e) => e.stack);
			throw new BadRequestError(errs);
		}

		const job = await Job.create(req.body);
		return res.status(201).json({ job });
	} catch (err) {
		return next(err);
	}
});
// GET ALL JOBS
/*
// Authorization Required: None

Filter Options:
- minSalary
- hasEquity
- title
*/
router.get('/', async function (req, res, next) {
	const filters = req.query;
	// filters arrive as strings from querystring, convert filters to integer and boolean values
	if (filters.minSalary !== undefined) filters.minSalary = +filters.minSalary;
	// if hasEquity is true, set it to true, otherwise it is false.
	filters.hasEquity = filters.hasEquity ? true : false;

	// once filters are converted, compare the input against the search schema
	try {
		const validator = jsonschema.validate(filters, jobSearchSchema);
		if (!validator.valid) {
			const errs = validator.errors.map((e) => e.stack);
			throw new BadRequestError(errs);
		}
		// if validated, run the findAll method with filters object passed in
		const jobs = await Job.findAll(filters);
		return res.json({ jobs });
	} catch (e) {
		return next(e);
	}
});

// GET A JOB POSTING
// Authorization Required: Admin
// Returns { id, title, salary, equity, company } where company is { handle, name, description, numEmployees, logoUrl }
router.get('/:id', async function (req, res, next) {
	try {
		const job = await Job.get(req.params.id);
		return res.json({ job });
	} catch (e) {
		return next(e);
	}
});

// UPDATE JOB
// Authorization Required: Admin
//  Data can include: { title, salary, equity }
//  Returns { id, title, salary, equity, companyHandle }
router.patch('/:id', ensureAdmin, async function (req, res, next) {
	try {
		const validator = jsonschema.validate(req.body, jobUpdateSchema);
		if (!validator.valid) {
			const errs = validator.errors.map((e) => e.stack);
			throw new BadRequestError(errs);
		}

		const job = await Job.update(req.params.id, req.body);
		return res.json({ job });
	} catch (e) {
		return next(e);
	}
});

// DELETE JOB
// Authorization Required: Admin
router.delete('/:id', ensureAdmin, async function (req, res, next) {
	try {
		await Job.remove(req.params.id);
		return res.json({ deleted: +req.params.id });
	} catch (e) {
		return next(e);
	}
});

module.exports = router;
