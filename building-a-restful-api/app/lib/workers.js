/**
 *
 * Worker-related tasks
 *
 */

// Dependencies
const path = require("path");
const fs = require("fs");
const _data = require("./data");
const https = require("https"); // For https checks
const http = require("http"); // For http checks
const helpers = require("./helpers");
const url = require("url");
const _logs = require("./logs");

const data = new Date();
const dateNow = `${
  data.getDate() > 9 ? data.getDate() : `0${data.getDate()}`
}/${data.getMonth()}/${data.getFullYear()} ${data.getHours()}:${
  data.getMinutes() > 9 ? data.getMinutes() : `0${data.getMinutes()}`
}:${data.getSeconds() > 9 ? data.getSeconds() : `0${data.getSeconds()}`}`;

// Instantiate the worker object
const workers = {};

// Sanity-check the check-data
workers.validateCheckData = function (originalCheckData) {
  const ACCEPTABLE_PROTOCOLS = ["https", "http"];
  const ACCEPTABLE_METHODS = ["get", "post", "put", "delete"];

  const messages = [];

  if (helpers.validators.isObject(originalCheckData)) {
    if (!helpers.validators.isString(originalCheckData.id, 20)) {
      console.log(originalCheckData.id.length);
      messages.push("Check's id length has to be at least 20 ");
    }

    if (!helpers.validators.isString(originalCheckData.userPhone, 10)) {
      messages.push("Check's user phone length has to be greather than 10");
    }

    if (
      !helpers.validators.isString(
        originalCheckData.protocol,
        0,
        ACCEPTABLE_PROTOCOLS
      )
    ) {
      messages.push(
        "Check's protocol is invalid. Acceptable's methods [" +
          ACCEPTABLE_PROTOCOLS.join(", ") +
          "]"
      );
    }

    if (!helpers.validators.isString(originalCheckData.url, 1, [])) {
      messages.push("Check's url is invalid");
    }

    if (
      !helpers.validators.isString(
        originalCheckData.method,
        1,
        ACCEPTABLE_METHODS
      )
    ) {
      messages.push("Method is invalid");
    }

    if (!helpers.validators.isArray(originalCheckData.successCodes)) {
      messages.push("success codes is invalid");
    }

    if (typeof originalCheckData.timeoutSeconds != "number") {
      messages.push("timeout seconds should be a number");
    }

    if (originalCheckData.timeoutSeconds % 1 !== 0) {
      messages.push("timeout seconds should be a integer");
    }

    // Set the keys that may not be set (if the workers have never seen this check before)
    originalCheckData.state = helpers.validators.isString(
      originalCheckData.state,
      0,
      ["up", "down"]
    )
      ? originalCheckData.state
      : "down";
    originalCheckData.lastChecked =
      typeof originalCheckData.lastChecked === "number" &&
      originalCheckData.lastChecked > 0
        ? originalCheckData.lastChecked
        : "";
  } else {
    messages.push("Check is invalid.");
  }

  // If all the checks pass, pass the data along to the next step in the process
  if (messages.length === 0) {
    workers.performCheck(originalCheckData);
  } else {
    console.log(`Errors: ${messages.join(", ")}`);
  }
};

// Perform the check, send the originalCheckData and the outcome of the check process, to the next step in the process
workers.performCheck = function (originalCheckData) {
  // Prepare the initial check outcome
  let checkOutcome = {
    error: null,
    responseCode: null,
  };

  // Mark that the outcome has not been sent yet
  let outcomeSent = false;

  // Parse the hostname and the path out of the original check data
  const parsedUrl = url.parse(
    `${originalCheckData.protol}://${originalCheckData.url}`,
    true
  );
  const hostname = parsedUrl.hostname;
  const path = parsedUrl.path; // Using path and not "pathaname" because we want the query string

  // Construct the request
  const TIMEOUT_SECONDS_TO_MILISECONDS =
    originalCheckData.timeoutSeconds * 1000;
  const requestDetails = {
    protocol: `${originalCheckData.protocol}:`,
    hostname,
    method: originalCheckData.method.toUpperCase(),
    path,
    timeout: TIMEOUT_SECONDS_TO_MILISECONDS,
  };

  // Instantiate the request object (using either the http or https module)
  const _moduleToUse = originalCheckData.protocol === "http" ? http : https;
  const req = _moduleToUse.request(requestDetails, (res) => {
    // Grab the status of the sent request
    const status = res.statusCode;

    // Update the checkoutcome and pass the data along
    checkOutcome.responseCode = status;
    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  // Bind to the error event so it doesn't get thrown
  req.on("error", (err) => {
    // Update the checkOutcome and pass the dat along
    checkOutcome.error = {
      error: true,
      value: err,
    };
    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });
  // Bind to the timeout event
  req.on("timeout", (err) => {
    // Update the checkOutcome and pass the dat along
    checkOutcome.error = {
      error: true,
      value: `timeout, ${err}`,
    };
    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  // End the request
  req.end();
};

// Process the check outcome, update the check data as needed, trigger and alert to user if needed
// Special logic for accomodating a check that has never been tested before (don't alert on that one)
workers.processCheckOutcome = function (originalCheckData, checkOutcome) {
  // Decide if the check is considered up or down
  const state =
    !checkOutcome.error &&
    checkOutcome.responseCode &&
    originalCheckData.successCodes.includes(checkOutcome.responseCode)
      ? "up"
      : "down";

  // Decide if an alert is warranted
  const alertWarranted =
    originalCheckData.lastChecked && originalCheckData.state !== state;

  // Update the check data
  const newCheckData = originalCheckData;
  newCheckData.state = state;
  newCheckData.lastChecked = Date.now();

  // Log the outcome
  workers.log(originalCheckData, checkOutcome, state, alertWarranted, data);

  // Save the updates
  _data.update("checks", newCheckData.id, newCheckData, (err) => {
    if (!err) {
      // Send the new check datat to the next phase in the process if needed
      if (alertWarranted) {
        workers.alertUserToStatusChange(newCheckData);
      } else {
        console.log("Check outcome has not changed, no alert needed");
      }
    } else {
      console.log("Error trying to sabe updates to one of the checks");
    }
  });
};

// Alert the user as to a change in their check status
workers.alertUserToStatusChange = function (newCheckData) {
  const msg = `Alert: Your check for ${newCheckData.method.toUpperCase()} ${
    newCheckData.protocol
  }://${newCheckData.url} is currently ${newCheckData.state} `;
  helpers.sendTwilioSMS(newCheckData.userPhone, "55", msg, (err) => {
    if (!err) {
      console.log(
        "Success: User was alerted to a status change in their check, via sms: ",
        msg
      );
    } else {
      console.log(
        "Error: Could not send sms alert to user who had a state change in their check"
      );
    }
  });
};

// Lookup all checks, get their data, send to a validator
workers.gatherAllChecks = function () {
  // Get all the cheks
  _data.list("checks", (err, checks) => {
    if (!err && Array.isArray(checks) && checks.length > 0) {
      checks.forEach((check) => {
        // Read in the check data
        _data.read("checks", check, (err, originalCheckData) => {
          if (!err && originalCheckData) {
            // Pass it to the check validator, and let that that funciton continue or log errors as needed
            workers.validateCheckData(originalCheckData);
          } else {
            console.log(`Error: Could not read check ${check} data`, dateNow);
          }
        });
      });
    } else {
      console.log("Error: Could not find any checks to process", dateNow);
    }
  });
};

// Timer to execute the worker-process once per minute
workers.loop = function () {
  const ONE_MINUTE = 1000 * 60;
  setInterval(() => {
    workers.gatherAllChecks();
  }, ONE_MINUTE);
};

workers.log = function (
  originalCheckData,
  checkOutcome,
  state,
  alertWarranted,
  timeOfCheck
) {
  // Form the log data
  const logData = {
    check: originalCheckData,
    outcome: checkOutcome,
    state,
    alert: alertWarranted,
    time: timeOfCheck,
  };

  // Convert data to a string
  const logString = JSON.stringify(logData);

  // Determine the name of the log file
  const logFileName = originalCheckData.id;

  // Append the log string to the file
  _logs.append(logFileName, logString, (err) => {
    if (!err) {
      console.log("Logging to file succeded");
    } else {
      console.log("Logging to file failed");
    }
  });
};

// Rotate (compress) the log files
workers.rotateLogs = function () {
  // Listing all the (non compressed) log files 
  _logs.list(false, (err, logs)=>{
    if (!err && Array.isArray(logs) && logs.length > 0) {
      logs.forEach(logName=>{
        // Compress the data to a different file
        const logId = logName.replace('.log', '')
        const newFileId = `${logId}-${Date.now()}`
        _logs.compress(logId,newFileId, (err)=>{
          if (!err) {
            // Truncate the log
            _logs.truncate(logId, (err)=>{
              if (!err) {
                console.log(`Success truncating logFile - ${logId}`);
                
              }else{
                console.log(`Error truncating logFile - ${logId}`);
              }
            })
          } else {
            console.log(`Error compressing one of the log files (file ${logId})`);
          }
        })
      })
    } else {
      console.log('Error: could not find any logs to rotate');
    }
  })
}

// Timer to execute the log-rotation process once per day
workers.logRotationLoop = function () {
  const ONE_DAY = 1000 * 60 * 60 * 24 
  setInterval(() => {
    workers.rotateLogs()
  }, ONE_DAY);
}

// Init script
workers.init = function () {
  // Execute all the checks immediately
  workers.gatherAllChecks();

  // Call the loop so the checks will execute later on
  workers.loop();

  // Compress all the logs immediately
  workers.rotateLogs()

  // Call the compression loop so logs will be compressed later on 
  workers.logRotationLoop()
};

// Export the module
module.exports = workers;
