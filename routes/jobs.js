"use strict";

/** Routes for jobs. */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError } = require("../expressError");
const { ensureLoggedIn, ensureAdminLoggedIn } = require("../middleware/auth");
const Job = require("../models/job");

const jobSearchSchema = require("../schemas/jobSearch.json");
const jobNewSchema = require("../schemas/jobNew.json");
const jobUpdateSchema = require("../schemas/jobUpdate.json");

const router = new express.Router();


/** POST / { job } =>  { job }
 *
 * job should be { title , salary , equity , companyHandle }
 *
 * Returns { id , title , salary , equity , companyHandle }
 *
 * Authorization required: login as admin
 */

router.post("/", ensureAdminLoggedIn, async function (req, res, next) {
    try {
        const validator = jsonschema.validate(req.body, jobNewSchema);
        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }

        const job = await Job.create(req.body);
        return res.status(201).json({ job });
    } catch (err) {
        return next(err);
    }
});



/** GET /  =>
 *   { jobs: [ { id , title , salary , equity , companyHandle }, ...] }
 *
 * Can filter on provided search filters:
 * - minSalary
 * - hasEquity
 * - titleLike (will find case-insensitive, partial matches)
 *
 * Authorization required: none
 */

router.get("/", async function (req, res, next) {
    try {


        const validator = jsonschema.validate(req.query, jobSearchSchema);

        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }

        const searches = { ...req.query };

        if (searches.minSalary !== undefined) {
            searches.minSalary = parseInt(searches.minSalary);
        }

        if (searches.hasEquity != undefined) {
            searches.hasEquity = searches.hasEquity === "true" ? true : false;
        }
        const jobs = await Job.find(searches);

        return res.json({ jobs });
    } catch (err) {
        console.log(err);
        return next(err);
    }
});



/** GET /[id]  =>  { job }
 *
 *  Job is { id , title , salary , equity , company }
 *   where company is { handle, name, description, numEmployees, logoUrl }
 *
 * Authorization required: none
 */

router.get("/:id", async function (req, res, next) {
    try {
        const job = await Job.get(req.params.id);
        return res.json({ job });
    } catch (err) {
        return next(err);
    }
});



/** PATCH /[id] { fld1, fld2, ... } => { job }
 *
 * Patches job data.
 *
 * fields can be: {title , salary , equity}
 *
 * Returns { id , title , salary , equity , companyHandle }
 *
 * Authorization required: login as admin
 */

router.patch("/:id", ensureAdminLoggedIn, async function (req, res, next) {
    try {
        const validator = jsonschema.validate(req.body, jobUpdateSchema);
        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }

        const job = await Job.update(req.params.id, req.body);
        return res.json({ job });
    } catch (err) {
        return next(err);
    }
});



/** DELETE /[id]  =>  { deleted: id }
 *
 * Authorization: login as admin
 */

router.delete("/:id", ensureAdminLoggedIn, async function (req, res, next) {
    try {
        await Job.remove(req.params.id);
        return res.json({ deleted: req.params.id });
    } catch (err) {
        return next(err);
    }
});

module.exports = router;