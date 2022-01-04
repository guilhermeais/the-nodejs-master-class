/**
 * Unit Tests
 */

const helpers = require("../lib/helpers");
const assert = require("assert");
const logs = require("../lib/logs");

// Holder for tests
const unit = {};

// Assert that the getANumber function is returning a number
unit["helpers.getANumber should return number"] = function (done) {
  const value = helpers.getANumber();
  assert.equal(typeof value, "number");
  done();
};

// Assert that the getANumber function is returning a number
unit["helpers.getANumber should return 1"] = function (done) {
  const value = helpers.getANumber();
  assert.equal(value, 1);
  done();
};

// Logs.list should callback an array and a false error
unit["logs.list should callback a false error and an array of log names"] =
  function (done) {
    logs.list(true, (err, logFileNames) => {
      assert.equal(err, null);
      assert.ok(Array.isArray(logFileNames));
      assert.ok(logFileNames.length > 1);
      done();
    });
  };

// Logs.truncate should not throw if the logId doesnt exist
unit[
  "logs.truncate should not throw if the logId does not exist. It should callback an error instead"
] = function (done) {
  assert.doesNotThrow(() => {
    logs.truncate("I do not exist", (err) => {
      assert.ok(err);
      done();
    });
  }, TypeError);
};


// Export the tests to the runner
module.exports = unit;
