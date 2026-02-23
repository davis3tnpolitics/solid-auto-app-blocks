const path = require("path");
const { pathToFileURL } = require("url");

let paginate;
let createPaginatedResponse;

beforeAll(async () => {
  const paginationModulePath = path.resolve(
    __dirname,
    "../../../../packages/nest-helpers/src/pagination.ts"
  );
  const paginationModule = await import(pathToFileURL(paginationModulePath).href);
  paginate = paginationModule.paginate;
  createPaginatedResponse = paginationModule.createPaginatedResponse;
});

describe("pagination defaults and parsing", () => {
  it("uses defaults when no query params are provided", () => {
    expect(paginate()).toEqual({
      pageNumber: 1,
      pageSize: 25,
      offset: 0,
      limit: 25,
    });
  });

  it("supports page/pageSize aliases and numeric coercion", () => {
    expect(
      paginate({
        page: "3",
        limit: "10",
      })
    ).toEqual({
      pageNumber: 3,
      pageSize: 10,
      offset: 20,
      limit: 10,
    });
  });

  it("derives page number from explicit offset when page is omitted", () => {
    expect(
      paginate({
        offset: "40",
        pageSize: "20",
      })
    ).toEqual({
      pageNumber: 3,
      pageSize: 20,
      offset: 40,
      limit: 20,
    });
  });

  it("clamps page size to configured maximum", () => {
    expect(
      paginate(
        {
          pageSize: "500",
        },
        {
          maxPageSize: 100,
        }
      )
    ).toEqual({
      pageNumber: 1,
      pageSize: 100,
      offset: 0,
      limit: 100,
    });
  });

  it("builds metadata+data paginated responses", () => {
    expect(
      createPaginatedResponse(
        [{ id: "u_1" }, { id: "u_2" }],
        7,
        {
          pageNumber: 2,
          pageSize: 5,
        }
      )
    ).toEqual({
      metadata: {
        pageSize: 5,
        count: 7,
        pageCount: 2,
        pageNumber: 2,
      },
      data: {
        items: [{ id: "u_1" }, { id: "u_2" }],
      },
    });
  });
});
