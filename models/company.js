"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate, sqlForSearch } = require("../helpers/sql");

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
      [handle]);

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(
      `INSERT INTO companies
           (handle, name, description, num_employees, logo_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
      [
        handle,
        name,
        description,
        numEmployees,
        logoUrl,
      ],
    );
    const company = result.rows[0];

    return company;
  }

  /** Find all companies.
   *
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * */

  static async findAll() {
    const companiesRes = await db.query(
      `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           ORDER BY name`);
    return companiesRes.rows;
  }


  /**
   * Find companies with certain conditions.
   * @param {*} conditions conditions for search {name : "net" , minEmployees : 1 , maxEmployees : 100 , ...}
   * @returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   */
  static async find(conditions = {}) {
    if (
      conditions === undefined || (
        conditions.nameLike === undefined &&
        conditions.minEmployees === undefined &&
        conditions.maxEmployees === undefined
      )
    ) {
      return Company.findAll();
    }

    const searches = [];

    if (conditions.nameLike != undefined && conditions.nameLike !== "") {
      searches.push({
        field: "name",
        operator: "ILIKE",
        value: conditions.nameLike
      });
    }

    let minEmployees = -1;
    let maxEmployees = -1;

    if (conditions.minEmployees !== undefined &&
      conditions.minEmployees !== "") {
      if (isNaN(parseInt(conditions.minEmployees))) {
        throw new BadRequestError("minEmployees must be an integer");
      }

      minEmployees = parseInt(conditions.minEmployees);

      if (minEmployees < 0) {
        throw new BadRequestError("minEmployees must be no less than 0");
      }

      searches.push({
        field: "num_employees",
        operator: ">=",
        value: minEmployees
      });
    }

    if (conditions.maxEmployees !== undefined &&
      conditions.maxEmployees !== "") {
      if (isNaN(parseInt(conditions.maxEmployees))) {
        throw new BadRequestError("maxEmployees must be an integer");
      }

      maxEmployees = parseInt(conditions.maxEmployees);

      if (maxEmployees < 0) {
        throw new BadRequestError("maxEmployees must be no less than 0");
      }

      if (maxEmployees < minEmployees) {
        throw new BadRequestError("maxEmployees must be no less than minEmployees");
      }

      searches.push({
        field: "num_employees",
        operator: "<=",
        value: maxEmployees
      });
    }


    let sqlWhere = sqlForSearch(searches);

    const companiesRes = await db.query(
      `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies 
           WHERE ${sqlWhere.wheres === "" ? "1 = 1" : sqlWhere.wheres}
           ORDER BY name` , sqlWhere.values);
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
                  logo_url AS "logoUrl" , 
                  id , 
                  title , 
                  salary , 
                  equity , 
                  company_handle as "companyHandle"
           FROM companies JOIN jobs ON handle = company_handle
           WHERE handle = $1`,
      [handle]);

    if (companyRes.rows.length === 0) {
      throw new NotFoundError(`No company: ${handle}`);
    }
    const { name, description, numEmployees, logoUrl } = companyRes.rows[0];
    const company = { handle, name, description, numEmployees, logoUrl };

    company.jobs = companyRes.rows.map(r => {
      const { id, title, salary, equity, companyHandle } = r;

      return { id, title, salary, equity, companyHandle };
    });

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
    const { setCols, values } = sqlForPartialUpdate(
      data,
      {
        numEmployees: "num_employees",
        logoUrl: "logo_url",
      });
    const handleVarIdx = "$" + (values.length + 1);

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
      [handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }
}


module.exports = Company;
