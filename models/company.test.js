"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Company = require("./company.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);



const c1 = {
  handle: "c1",
  name: "C1",
  description: "Desc1",
  numEmployees: 1,
  logoUrl: "http://c1.img",
};
const c2 = {
  handle: "c2",
  name: "C2",
  description: "Desc2",
  numEmployees: 2,
  logoUrl: "http://c2.img",
};

const c3 = {
  handle: "c3",
  name: "C3",
  description: "Desc3",
  numEmployees: 3,
  logoUrl: "http://c3.img",
};

const j1 = {
  id: 1,
  title: "j1",
  salary: 100000,
  equity: "0",
  companyHandle: "c1"
};

/************************************** create */

describe("create", function () {
  const newCompany = {
    handle: "new",
    name: "New",
    description: "New Description",
    numEmployees: 1,
    logoUrl: "http://new.img",
  };

  test("works", async function () {
    let company = await Company.create(newCompany);
    expect(company).toEqual(newCompany);

    const result = await db.query(
      `SELECT handle, name, description, num_employees, logo_url
           FROM companies
           WHERE handle = 'new'`);
    expect(result.rows).toEqual([
      {
        handle: "new",
        name: "New",
        description: "New Description",
        num_employees: 1,
        logo_url: "http://new.img",
      },
    ]);
  });

  test("bad request with dupe", async function () {
    try {
      await Company.create(newCompany);
      await Company.create(newCompany);
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** findAll */

describe("findAll", function () {
  test("works: no filter", async function () {
    let companies = await Company.findAll();
    expect(companies).toEqual([c1, c2, c3]);
  });
});



/************************************** find */

describe("find", function () {
  test("works: no filter", async function () {
    let companies = await Company.find();
    expect(companies).toEqual([c1, c2, c3]);
  });


  test("works: filter name", async function () {
    let companies = await Company.find(
      {
        nameLike: "c1"
      }
    );
    expect(companies).toEqual([c1]);
  });


  test("works: filter minEmployees", async function () {
    let companies = await Company.find(
      {
        minEmployees: 2
      }
    );
    expect(companies).toEqual([c2, c3]);
  });


  test("works: filter maxEmployees", async function () {
    let companies = await Company.find(
      {
        maxEmployees: 1
      }
    );
    expect(companies).toEqual([c1]);
  });


  test("works: all filters", async function () {
    let companies = await Company.find(
      {
        name: "c",
        minEmployees: 1,
        maxEmployees: 1
      }
    );
    expect(companies).toEqual([c1]);
  });


  test("not works: maxEmployees < minEmployees", async function () {
    async function findCompanies() {
      await Company.find(
        {
          name: "c",
          minEmployees: 1,
          maxEmployees: 0
        }
      );
    }
    await expect(findCompanies())
      .rejects
      .toThrow(BadRequestError);
  });

  test("not works: invalid input of minEmployees or maxEmployees", async function () {

    await expect(Company.find({ minEmployees: 'aaa' }))
      .rejects
      .toThrow(BadRequestError);


    await expect(Company.find({ minEmployees: '-1' }))
      .rejects
      .toThrow(BadRequestError);


    await expect(Company.find({ maxEmployees: 'aaa' }))
      .rejects
      .toThrow(BadRequestError);


    await expect(Company.find({ maxEmployees: '-1' }))
      .rejects
      .toThrow(BadRequestError);
  });
});

/************************************** get */

describe("get", function () {
  test("works", async function () {
    let company = await Company.get("c1");
    expect(company).toEqual({
      ...c1,
      jobs: [
        j1
      ]
    });
  });

  test("not found if no such company", async function () {
    try {
      await Company.get("nope");
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/************************************** update */

describe("update", function () {
  const updateData = {
    name: "New",
    description: "New Description",
    numEmployees: 10,
    logoUrl: "http://new.img",
  };

  test("works", async function () {
    let company = await Company.update("c1", updateData);
    expect(company).toEqual({
      handle: "c1",
      ...updateData,
    });

    const result = await db.query(
      `SELECT handle, name, description, num_employees, logo_url
           FROM companies
           WHERE handle = 'c1'`);
    expect(result.rows).toEqual([{
      handle: "c1",
      name: "New",
      description: "New Description",
      num_employees: 10,
      logo_url: "http://new.img",
    }]);
  });

  test("works: null fields", async function () {
    const updateDataSetNulls = {
      name: "New",
      description: "New Description",
      numEmployees: null,
      logoUrl: null,
    };

    let company = await Company.update("c1", updateDataSetNulls);
    expect(company).toEqual({
      handle: "c1",
      ...updateDataSetNulls,
    });

    const result = await db.query(
      `SELECT handle, name, description, num_employees, logo_url
           FROM companies
           WHERE handle = 'c1'`);
    expect(result.rows).toEqual([{
      handle: "c1",
      name: "New",
      description: "New Description",
      num_employees: null,
      logo_url: null,
    }]);
  });

  test("not found if no such company", async function () {
    try {
      await Company.update("nope", updateData);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

  test("bad request with no data", async function () {
    try {
      await Company.update("c1", {});
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** remove */

describe("remove", function () {
  test("works", async function () {
    await Company.remove("c1");
    const res = await db.query(
      "SELECT handle FROM companies WHERE handle='c1'");
    expect(res.rows.length).toEqual(0);
  });

  test("not found if no such company", async function () {
    try {
      await Company.remove("nope");
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});
