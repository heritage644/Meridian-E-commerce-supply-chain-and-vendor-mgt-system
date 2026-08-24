const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { AppError } = require("../src/shared/errors");

describe("AppError", () => {
  it("stores status and details", () => {
    const err = new AppError("Nope", 403, { field: "role" });
    assert.equal(err.status, 403);
    assert.equal(err.details.field, "role");
  });
});
