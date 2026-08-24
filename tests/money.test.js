const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { koboToNaira, slugify } = require("../src/utils/money");

describe("money utils", () => {
  it("converts kobo to naira", () => {
    assert.equal(koboToNaira(250000), 2500);
  });

  it("slugifies names", () => {
    assert.equal(slugify("Onitsha Textile Hub"), "onitsha-textile-hub");
  });
});
