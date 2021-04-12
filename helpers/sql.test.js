const { sqlForPartialUpdate, sqlForSearch } = require('./sql');
const { BadRequestError } = require("../expressError");

describe("sqlForPartialUpdate", function () {
    test("works", function () {
        let result = sqlForPartialUpdate(
            { firstName: 'Aliya', age: 32 },
            { firstName: 'first_name' });
        expect(result).toEqual({
            setCols: '"first_name"=$1, "age"=$2',
            values: ['Aliya', 32]
        });
    });


    test("works with no jsToSql", function () {
        let result = sqlForPartialUpdate(
            { firstName: 'Aliya', age: 32 },
            null);
        expect(result).toEqual({
            setCols: '"firstName"=$1, "age"=$2',
            values: ['Aliya', 32]
        });
    });


    test("not works: with no data input", function () {
        function sqlForNoUpdate() {
            sqlForPartialUpdate({}, {});
        }
        expect(sqlForNoUpdate).toThrow(BadRequestError);
        expect(sqlForNoUpdate).toThrow("No data");

        function sqlForNoUpdateNull() {
            sqlForPartialUpdate(null, {});
        }

        expect(sqlForNoUpdateNull).toThrow(BadRequestError);
        expect(sqlForNoUpdateNull).toThrow("No data");
    });
});

describe("sqlForSearch", function () {
    test("works : 1 condition", function () {
        let result = sqlForSearch([
            { field: "name", operator: "=", value: "first" }
        ]);
        expect(result).toEqual({
            wheres: '"name" = $1',
            values: ["first"]
        });
    });

    test("works : more than 1 condition", function () {
        let result = sqlForSearch([
            { field: "name", operator: "=", value: "first" },
            { field: "title", operator: "like", value: "term" }
        ]);
        expect(result).toEqual({
            wheres: '"name" = $1 AND "title" LIKE $2',
            values: ["first", "%term%"]
        });
    });


    test("works : no condition", function () {
        let result = sqlForSearch();
        expect(result).toEqual({
            wheres: '',
            values: []
        });

        result = sqlForSearch([]);
        expect(result).toEqual({
            wheres: '',
            values: []
        });
    });
});