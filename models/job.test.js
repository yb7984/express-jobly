"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Job = require("./job.js");
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

/************************************** create */

describe("create", function () {
    const newJob = {
        title: "new job",
        salary: 100000,
        equity: 0,
        companyHandle: "c1"
    };

    test("works", async function () {
        let job = await Job.create(newJob);
        expect(job).toEqual({
            id: expect.any(Number),
            title: "new job",
            salary: 100000,
            equity: "0",
            companyHandle: "c1"
        });

        const result = await db.query(
            `SELECT id , title , salary , equity , company_handle
           FROM jobs WHERE id = $1` ,
            [job.id]);
        expect(result.rows).toEqual([
            {
                id: job.id,
                title: "new job",
                salary: 100000,
                equity: "0",
                company_handle: "c1"
            },
        ]);
    });

    test("bad request with company not exist", async function () {
        try {
            newJob.companyHandle = "none";

            await Job.create(newJob);

            fail();
        } catch (err) {
            expect(err instanceof BadRequestError).toBeTruthy();
        }
    });
});



/************************************** findAll */

describe("findAll", function () {
    test("works: no filter", async function () {
        let jobs = await Job.findAll();
        expect(jobs).toEqual([j1, j2, j3]);
    });
});


/************************************** find */

describe("find", function () {
    test("works: no filter", async function () {
        let jobs = await Job.find();
        expect(jobs).toEqual([j1, j2, j3]);
    });


    test("works: filter title", async function () {
        let jobs = await Job.find(
            {
                titleLike: "j1"
            }
        );

        expect(jobs).toEqual([j1]);
    });


    test("works: filter minSalary", async function () {
        let jobs = await Job.find(
            {
                minSalary: 200000
            }
        );
        expect(jobs).toEqual([j2, j3]);
    });


    test("works: filter hasEquity", async function () {
        let jobs = await Job.find(
            {
                hasEquity: true
            }
        );
        expect(jobs).toEqual([j2, j3]);

        jobs = await Job.find(
            {
                hasEquity: false
            }
        );
        expect(jobs).toEqual([j1, j2, j3]);
    });


    test("works: all filters", async function () {
        let jobs = await Job.find(
            {
                titleLike: "3" , 
                minSalary : 200000 , 
                hasEquity : true 
            }
        );
        expect(jobs).toEqual([j3]);
    });
});



/************************************** get */

describe("get", function () {
    test("works", async function () {
        let job = await Job.get(1);
        expect(job).toEqual({
            id: 1,
            title: "j1",
            salary: 100000,
            equity: "0",
            company: c1
        });
    });

    test("not found if no such job", async function () {
        try {
            await Job.get(0);
            fail();
        } catch (err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
});



/************************************** update */

describe("update", function () {
    const updateData = {
        title: "New",
        salary: 110000,
        equity: 0.1
    };

    test("works", async function () {
        let job = await Job.update(1, updateData);
        expect(job).toEqual({
            id: 1,
            title: "New",
            salary: 110000,
            equity: "0.1",
            companyHandle: "c1"
        });

        const result = await db.query(
            `SELECT id , title , salary , equity , company_handle
             FROM jobs
             WHERE id = 1`);
        expect(result.rows).toEqual([{
            id: 1,
            title: "New",
            salary: 110000,
            equity: "0.1",
            company_handle: "c1"
        }]);
    });


    test("not found if no such job", async function () {
        try {
            await Job.update(0, updateData);
            fail();
        } catch (err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });

    test("bad request with no data", async function () {
        try {
            await Job.update("c1", {});
            fail();
        } catch (err) {
            expect(err instanceof BadRequestError).toBeTruthy();
        }
    });
});



/************************************** remove */

describe("remove", function () {
    test("works", async function () {
        await Job.remove(1);
        const res = await db.query(
            "SELECT id FROM jobs WHERE id = 1");
        expect(res.rows.length).toEqual(0);
    });

    test("not found if no such job", async function () {
        try {
            await Job.remove(0);
            fail();
        } catch (err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });


});

