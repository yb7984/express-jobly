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

/************************************** POST /jobs */

describe("POST /jobs", function () {
    const newJob = {
        title: "new",
        salary: 1000000,
        equity: 0,
        companyHandle: "c1"
    };

    test("ok for users login as admin", async function () {
        const resp = await request(app)
            .post("/jobs")
            .send(newJob)
            .set("authorization", `Bearer ${u1Token}`);

        console.log(resp.body);
        expect(resp.statusCode).toEqual(201);
        expect(resp.body).toEqual({
            job: {
                id: expect.any(Number),
                title: "new",
                salary: 1000000,
                equity: "0",
                companyHandle: "c1"
            },
        });
    });

    test("bad request with missing data", async function () {
        const resp = await request(app)
            .post("/jobs")
            .send({
                title: "",
                salary: 10,
            })
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.statusCode).toEqual(400);
    });

    test("bad request with invalid data", async function () {
        const resp = await request(app)
            .post("/jobs")
            .send({
                ...newJob,
                salary: -1,
            })
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.statusCode).toEqual(400);
    });

    test("unauthorized for not login", async function () {
        const resp = await request(app)
            .post("/jobs")
            .send(newJob);
        expect(resp.statusCode).toEqual(401);
    });


    test("unauthorized for login not admin", async function () {
        const resp = await request(app)
            .post("/jobs")
            .send(newJob)
            .set("authorization", `Bearer ${u2Token}`);
        expect(resp.statusCode).toEqual(401);
    });
});



/************************************** GET /jobs */

describe("GET /jobs", function () {
    test("ok for anon", async function () {
        //no condition
        let resp = await request(app).get("/jobs");
        expect(resp.body).toEqual({
            jobs: [j1, j2, j3],
        });


        //search with title
        resp = await request(app).get("/jobs?titleLike=1");
        expect(resp.body).toEqual({
            jobs: [j1],
        });


        //search with minSalary
        resp = await request(app).get("/jobs?minSalary=200000");
        expect(resp.body).toEqual({
            jobs: [j2, j3],
        });


        //search with hasEquity
        resp = await request(app).get("/jobs?hasEquity=true");
        expect(resp.body).toEqual({
            jobs: [j2, j3],
        });

        resp = await request(app).get("/jobs?hasEquity=false");
        expect(resp.body).toEqual({
            jobs: [j1, j2, j3],
        });

        //search with titleLike with empty input
        resp = await request(app).get("/jobs?titleLike=");
        expect(resp.body).toEqual({
            jobs: [j1, j2, j3],
        });

        //search with all available conditions
        resp = await request(app).get("/jobs?titleLike=2&minSalary=200000&hasEquity=true");
        expect(resp.body).toEqual({
            jobs: [j2],
        });

        //search with invalid inputs
        resp = await request(app).get("/jobs?minSalary=aa");
        expect(resp.status).toBe(400);

        //search with invalid conditions, throw error.
        resp = await request(app).get("/jobs?description=ccs");
        expect(resp.status).toBe(400);
    });
});



/************************************** GET /jobs/:id */

describe("GET /jobs/:id", function () {
    test("works for anon", async function () {
        const resp = await request(app).get(`/jobs/1`);
        expect(resp.body).toEqual({
            job: {
                id: 1,
                title: "j1",
                salary: 100000,
                equity: "0",
                company: c1
            },
        });
    });

    test("not found for no such job", async function () {
        const resp = await request(app).get(`/jobs/0`);
        expect(resp.statusCode).toEqual(404);
    });
});



/************************************** PATCH /jobs/:handle */

describe("PATCH /jobs/:id", function () {
    test("works for users login as admin", async function () {
        const resp = await request(app)
            .patch(`/jobs/1`)
            .send({
                title: "j1-new",
            })
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.body).toEqual({
            job: {
                ...j1,
                title: "j1-new"
            },
        });
    });

    test("unauth for anon", async function () {
        const resp = await request(app)
            .patch(`/jobs/1`)
            .send({
                title: "j1-new",
            });
        expect(resp.statusCode).toEqual(401);
    });

    test("unauthorized for login not admin", async function () {
        const resp = await request(app)
            .patch(`/jobs/1`)
            .send({
                title: "j1-new",
            })
            .set("authorization", `Bearer ${u2Token}`);
        expect(resp.statusCode).toEqual(401);
    });

    test("not found on no such job", async function () {
        const resp = await request(app)
            .patch(`/jobs/0`)
            .send({
                title: "j1-new",
            })
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.statusCode).toEqual(404);
    });

    test("bad request on companyHandle change attempt", async function () {
        const resp = await request(app)
            .patch(`/jobs/1`)
            .send({
                companyHandle: "c2",
            })
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.statusCode).toEqual(400);
    });

    test("bad request on invalid data", async function () {
        const resp = await request(app)
            .patch(`/jobs/1`)
            .send({
                salary: "aaa"
            })
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.statusCode).toEqual(400);
    });
});



/************************************** DELETE /jobs/:id */

describe("DELETE /jobs/:id", function () {
    test("works for users login as admin", async function () {
        const resp = await request(app)
            .delete(`/jobs/1`)
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.body).toEqual({ deleted: "1" });
    });

    test("unauth for anon", async function () {
        const resp = await request(app)
            .delete(`/jobs/1`);
        expect(resp.statusCode).toEqual(401);
    });


    test("unauth for login not admin", async function () {
        const resp = await request(app)
            .delete(`/jobs/1`)
            .set("authorization", `Bearer ${u2Token}`);
        expect(resp.statusCode).toEqual(401);
    });

    test("not found for no such job", async function () {
        const resp = await request(app)
            .delete(`/jobs/0`)
            .set("authorization", `Bearer ${u1Token}`);
        expect(resp.statusCode).toEqual(404);
    });
});
