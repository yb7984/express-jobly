"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  u2Token
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


const j2 = {
  id: 2,
  title: "j2",
  salary: 200000,
  equity: "0.1",
  companyHandle: "c2"
};

const j3 = {
  id: 3,
  title: "j3",
  salary: 300000,
  equity: "0.2",
  companyHandle: "c3"
};


/************************************** POST /companies */

describe("POST /companies", function () {
  const newCompany = {
    handle: "new",
    name: "New",
    logoUrl: "http://new.img",
    description: "DescNew",
    numEmployees: 10,
  };

  test("ok for users", async function () {
    const resp = await request(app)
      .post("/companies")
      .send(newCompany)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      company: newCompany,
    });
  });

  test("bad request with missing data", async function () {
    const resp = await request(app)
      .post("/companies")
      .send({
        handle: "new",
        numEmployees: 10,
      })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request with invalid data", async function () {
    const resp = await request(app)
      .post("/companies")
      .send({
        ...newCompany,
        logoUrl: "not-a-url",
      })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("unauthorized for not login", async function () {
    const resp = await request(app)
      .post("/companies")
      .send(newCompany);
    expect(resp.statusCode).toEqual(401);
  });


  test("unauthorized for login not admin", async function () {
    const resp = await request(app)
      .post("/companies")
      .send(newCompany)
      .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(401);
  });
});

/************************************** GET /companies */

describe("GET /companies", function () {
  test("ok for anon", async function () {
    //no condition
    let resp = await request(app).get("/companies");
    expect(resp.body).toEqual({
      companies: [c1, c2, c3],
    });


    //search with name
    resp = await request(app).get("/companies?nameLike=c1");
    expect(resp.body).toEqual({
      companies: [c1],
    });


    //search with minEmployees
    resp = await request(app).get("/companies?minEmployees=2");
    expect(resp.body).toEqual({
      companies: [c2, c3],
    });


    //search with maxEmployees
    resp = await request(app).get("/companies?maxEmployees=1");
    expect(resp.body).toEqual({
      companies: [c1],
    });


    //search with all available conditions but with empty input
    resp = await request(app).get("/companies?nameLike=&minEmployees=&maxEmployees=");
    expect(resp.body).toEqual({
      companies: [c1, c2, c3],
    });

    //search with all available conditions
    resp = await request(app).get("/companies?nameLike=c&minEmployees=2&maxEmployees=2");
    expect(resp.body).toEqual({
      companies: [c2],
    });


    //search with invalid inputs
    resp = await request(app).get("/companies?minEmployees=aa");
    expect(resp.status).toBe(400);

    resp = await request(app).get("/companies?maxEmployees=aa");
    expect(resp.status).toBe(400);

    resp = await request(app).get("/companies?minEmployees=2&maxEmployees=1");
    expect(resp.status).toBe(400);

    //search with invalid conditions, ignore it.
    resp = await request(app).get("/companies?description=ccs");
    expect(resp.body).toEqual({
      companies: [c1, c2, c3],
    });
  });

  test("fails: test next() handler", async function () {
    // there's no normal failure event which will cause this route to fail ---
    // thus making it hard to test that the error-handler works with it. This
    // should cause an error, all right :)
    await db.query("DROP TABLE companies CASCADE");
    const resp = await request(app)
      .get("/companies")
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(500);
  });
});

/************************************** GET /companies/:handle */

describe("GET /companies/:handle", function () {
  test("works for anon", async function () {
    const resp = await request(app).get(`/companies/c1`);
    expect(resp.body).toEqual({
      company: {
        ...c1,
        jobs: [j1]
      },
    });
  });

  test("works for anon: company w/o jobs", async function () {
    const resp = await request(app).get(`/companies/c2`);
    expect(resp.body).toEqual({
      company: {
        ...c2,
        jobs: [j2]
      },
    });
  });

  test("not found for no such company", async function () {
    const resp = await request(app).get(`/companies/nope`);
    expect(resp.statusCode).toEqual(404);
  });
});

/************************************** PATCH /companies/:handle */

describe("PATCH /companies/:handle", function () {
  test("works for users", async function () {
    const resp = await request(app)
      .patch(`/companies/c1`)
      .send({
        name: "C1-new",
      })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.body).toEqual({
      company: {
        handle: "c1",
        name: "C1-new",
        description: "Desc1",
        numEmployees: 1,
        logoUrl: "http://c1.img",
      },
    });
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
      .patch(`/companies/c1`)
      .send({
        name: "C1-new",
      });
    expect(resp.statusCode).toEqual(401);
  });

  test("unauthorized for login not admin", async function () {
    const resp = await request(app)
      .patch(`/companies/c1`)
      .send({
        name: "C1-new",
      })
      .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found on no such company", async function () {
    const resp = await request(app)
      .patch(`/companies/nope`)
      .send({
        name: "new nope",
      })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("bad request on handle change attempt", async function () {
    const resp = await request(app)
      .patch(`/companies/c1`)
      .send({
        handle: "c1-new",
      })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request on invalid data", async function () {
    const resp = await request(app)
      .patch(`/companies/c1`)
      .send({
        logoUrl: "not-a-url",
      })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** DELETE /companies/:handle */

describe("DELETE /companies/:handle", function () {
  test("works for users", async function () {
    const resp = await request(app)
      .delete(`/companies/c1`)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.body).toEqual({ deleted: "c1" });
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
      .delete(`/companies/c1`);
    expect(resp.statusCode).toEqual(401);
  });


  test("unauth for login not admin", async function () {
    const resp = await request(app)
      .delete(`/companies/c1`)
      .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found for no such company", async function () {
    const resp = await request(app)
      .delete(`/companies/nope`)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(404);
  });
});