/**
 * Test runner
 */

// Dependencias
const helpers = require("../lib/helpers");
const assert = require("assert");

// Application logic for the test runner
const _app = {};

// Container for the tests
_app.tests = {
  unit: {},
};

// Assert that the getANumber function is returning a number
_app.tests.unit["helpers.getANumber should return number"] = function (done) {
  const value = helpers.getANumber();
  assert.equal(typeof value, "number");
  done();
};

// Assert that the getANumber function is returning a number
_app.tests.unit["helpers.getANumber should return 1"] = function (done) {
  const value = helpers.getANumber();
  assert.equal(value, 1);
  done();
};

// Assert that the getANumber function is returning a number
_app.tests.unit["helpers.getANumber should  return 2"] = function (done) {
  const value = helpers.getANumber();
  assert.equal(value, 2);
  done();
};

// Count all the tests
_app.countTests = function () {

  let counter = 0;
  for (const key in _app.tests) {
    if (Object.hasOwnProperty.call(_app.tests, key)) {
      const subTests = _app.tests[key];
      for (const testName in subTests) {
        if (Object.hasOwnProperty.call(subTests, testName)) {
          counter++;
        }
      }
    }
  }

  return counter;
};

// Run all the tests, collecting the errors and successes
_app.runTests = function () {
  const errors = [];
  const limit = _app.countTests();
  let successes = 0;
  let counter = 0;

  for (const key in _app.tests) {
    if (Object.hasOwnProperty.call(_app.tests, key)) {
      const subTests = _app.tests[key];
      for (const testName in subTests) {
      
        if (Object.hasOwnProperty.call(subTests, testName)) {
          (function () {
            let tmpTestName = testName;
            const testValue = subTests[testName];
            
            // Call the test
            counter++;
            try {
              testValue(() => {
                // If it calls back without throwin, then it succeded, so log it in green
                console.log(helpers.colors(tmpTestName).green);
              
                successes++;
                if (counter == limit) {
                  _app.produceTestReport(limit, successes, errors);
                }
              });
            } catch (e) {
              // If it throws, then it failed, so capture the error thrown and log it in red
              errors.push({
                name: testName,
                error: e,
              });
              console.log(helpers.colors(tmpTestName).red);
              if (counter == limit) {
                _app.produceTestReport(limit, successes, errors);
              }
            }
          })();
        }
      }
    }
  }
};

// Produce a test outcome report
_app.produceTestReport = function (limit = 0, successes = 0, errors = []) {
  console.log("\n--------------------BEGIN TEST REPORT--------------------\n");
  console.log("Total Tests: ", limit);
  console.log("Pass: ", successes);
  console.log("Fail: ", errors.length);
  console.log("");
  // If there are errors, print them in detail
  if (errors.length > 0) {
    console.log(
      "\n--------------------BEGIN ERROR DETAILS--------------------\n"
    );
    errors.forEach((error) => {
      console.log(helpers.colors(error.name).red);
      console.log(error.error);
    });
    console.log(
      "\n--------------------END ERROR DETAILS--------------------\n"
    );
  }
  console.log("\n--------------------END TEST REPORT--------------------\n");
};

// Run the tests
_app.runTests();
