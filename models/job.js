"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate, sqlForSearch } = require("../helpers/sql");

/** Related functions for jobs. */

class Job {
    /** Create a job (from data), update db, return new job data.
     *
     * data should be { title , salary , equity , companyHandle }
     *
     * Returns { id , title , salary , equity , companyHandle }
     *
     * Throws BadRequestError if company not in database.
     * */

    static async create({ title, salary, equity, companyHandle }) {
        const existCheck = await db.query(
            `SELECT handle FROM companies WHERE handle = $1`,
            [companyHandle]);

        if (!existCheck.rows[0])
            throw new BadRequestError(`Company not exists: ${companyHandle}`);

        const result = await db.query(
            `INSERT INTO jobs (title, salary, equity, company_handle)
           VALUES ($1, $2, $3, $4)
           RETURNING id, title, salary, equity, company_handle as "companyHandle"`,
            [title, salary, equity, companyHandle],
        );
        const job = result.rows[0];

        return job;
    }



    /** Find all jobs.
     *
     * Returns [{ id, title, salary, equity, companyHandle }, ...]
     * */

    static async findAll() {
        const jobsResult = await db.query(
            `SELECT id, title, salary, equity, company_handle as "companyHandle"
           FROM jobs
           ORDER BY title`);
        return jobsResult.rows;
    }

    /**
   * Find jobs with certain conditions.
   * @param {*} conditions conditions for search {title : "net" , minSalary : 1 , hasEquity : true}
   * @returns [{ id, title, salary, equity, companyHandle }, ...]
   */
    static async find(conditions = {}) {
        if (
            conditions === undefined || (
                conditions.titleLike === undefined &&
                conditions.minSalary === undefined &&
                conditions.hasEquity === undefined
            )
        ) {
            return Job.findAll();
        }

        const searches = [];

        if (conditions.titleLike != undefined && conditions.titleLike !== "") {
            searches.push({
                field: "title",
                operator: "ILIKE",
                value: conditions.titleLike
            });
        }

        let minSalary = -1;

        if (conditions.minSalary !== undefined) {
            searches.push({
                field: "salary",
                operator: ">=",
                value: conditions.minSalary
            });
        }

        if (conditions.hasEquity !== undefined && conditions.hasEquity === true) {
            searches.push({
                field: "equity",
                operator: "!=",
                value: 0
            });
        }

        let sqlWhere = sqlForSearch(searches);

        const jobsRes = await db.query(
            `SELECT id, title, salary, equity, company_handle as "companyHandle"
           FROM jobs 
           WHERE ${sqlWhere.wheres === "" ? "1 = 1" : sqlWhere.wheres}
           ORDER BY title` , sqlWhere.values);
        return jobsRes.rows;
    }



    /** Given a job id, return data about job.
     *
     * Returns { id , title , salary , equity , company }
     *   where company is { handle, name, description, numEmployees, logoUrl }
     *
     * Throws NotFoundError if not found.
     **/

    static async get(jobId) {
        const jobRes = await db.query(
            `SELECT id , 
                title , 
                salary , 
                equity , 
                handle,
                name,
                description,
                num_employees AS "numEmployees",
                logo_url AS "logoUrl"
           FROM jobs JOIN companies ON company_handle = handle
           WHERE id = $1`,
            [jobId]);

        if (jobRes.rows.length === 0) {
            throw new NotFoundError(`No job: ${jobId}`);
        }

        const { id, title, salary, equity } = jobRes.rows[0];
        const { handle, name, description, numEmployees, logoUrl } = jobRes.rows[0];

        const job = { id, title, salary, equity };
        job.company = { handle, name, description, numEmployees, logoUrl };

        return job;
    }


    /** Update job data with `data`.
     *
     * This is a "partial update" --- it's fine if data doesn't contain all the
     * fields; this only changes provided ones.
     *
     * Data can include: {title , salary , equity}
     *
     * Returns { id , title , salary , equity , companyHandle }
     *
     * Throws NotFoundError if not found.
     */

    static async update(jobId, data) {

        if (data.id !== undefined) {
            throw new BadRequestError('id can not be updated');
        }

        if (data.companyHandle !== undefined) {
            throw new BadRequestError('company_handle can not be updated');
        }

        const { setCols, values } = sqlForPartialUpdate(
            data,
            {
            });
        const idVarIdx = "$" + (values.length + 1);

        const querySql = `UPDATE jobs 
                      SET ${setCols} 
                      WHERE id = ${idVarIdx} 
                      RETURNING id , title , salary , equity , company_handle AS "companyHandle"`;
        const result = await db.query(querySql, [...values, jobId]);
        const job = result.rows[0];

        if (!job) throw new NotFoundError(`No job: ${jobId}`);

        return job;
    }



    /** Delete given job from database; returns undefined.
     *
     * Throws NotFoundError if job not found.
     **/

    static async remove(jobId) {
        const result = await db.query(
            `DELETE
           FROM jobs
           WHERE id = $1
           RETURNING id`,
            [jobId]);
        const job = result.rows[0];

        if (!job) throw new NotFoundError(`No job: ${jobId}`);
    }
}

module.exports = Job;