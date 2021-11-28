/**
 * Helpers for various tasks
 */

// Dependencies
const crypto = require("crypto");
const config = require("./config");
const queryString = require("querystring");
const https = require("https");

// Container for all the helpers
const helpers = {};

// Create a SHA256 hash
helpers.hash = function (str) {
  if (typeof str === "string" && str.length > 0) {
    const hash = crypto
      .createHmac("sha256", config.hashingSecret)
      .update(str)
      .digest("hex");
    return hash;
  } else {
    return "";
  }
};

// Parse a JSON to an object in all cases, without throwing
helpers.parseJsonToObject = function (str) {
  try {
    const obj = JSON.parse(str);
    return obj;
  } catch (error) {
    return {};
  }
};

// Create a string of random alphanumeric characters, of a given length
helpers.createRandomString = function (strLength) {
  const _strLength =
    typeof strLength === "number" && strLength > 0 ? strLength : null;
  if (_strLength) {
    // Define all the possible characters that could go into a string
    const possibleCharacters = "abcdefghijklmnopqrstuvwxyz0123456789";

    // Start the final string
    let str = "";

    for (let i = 0; i < strLength; i++) {
      // Get a random character from the possibleCharacters string
      let randomCharacter = possibleCharacters.charAt(
        Math.floor(Math.random() * possibleCharacters.length)
      );
      // Append this charcter to the final string
      str += randomCharacter;
    }

    return str;
  } else {
    return "";
  }
};

// Send an SMS message via Twilio
helpers.sendTwilioSMS = function (phone, coutryNumber = "55", msg, callback) {
  // validate parameters
  const messages = [];
  if (typeof phone != "string" || phone.trim() == "" || phone.length < 10) {
    messages.push("phone is invalid (phone length should be greater than 10)");
  }
  if (typeof coutryNumber != "string" || coutryNumber.trim() == "") {
    messages.push("contry number is invalid (coutry number is required)");
  }

  if (typeof msg != "string" || msg.trim() == "" || msg.length >= 1600) {
    messages.push(
      "message is invalid (message is required, max length of message is 1600)"
    );
  }

  if (messages.length === 0) {
    // Configure the request payload
    const TO_PHONE = `+${coutryNumber}${phone}` 
    console.log(TO_PHONE);
    const payload = {
      From: config.twilio.fromPhone,
      To: TO_PHONE,
      Body: msg,
    };

    // Stringify the payload
    const stringPayload = queryString.stringify(payload);

    // Configure the request details
    const requestDetails = {
      protocol: "https:",
      hostname: "api.twilio.com",
      method: "POST",
      path: `/2010-04-01/Accounts/${config.twilio.accountSid}/Messages.json`,
      auth: `${config.twilio.accountSid}:${config.twilio.authToken}`,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(stringPayload),
      },
    };

    // Instantiate the request object
    const req = https.request(requestDetails, (res) => {
      // Grab the status of the sent request
   
      const status = res.statusCode;
      // Callback successfully if the requet went through
      if (status == 200 || status == 201) {
        callback(null);
      } else {
     

        res.on("data", chunk=> callback(JSON.parse(chunk.toString())))
      
        
      }
    });

    // Bind to the error event so it doesn't get thrown
    req.on("error", (e) => {
      callback(e);
    });

    // Add the payload
    req.write(stringPayload);

    // End the request
    req.end();
  } else {
    callback(404, {
      Error: `Given parameters were missing or invalid. ${messages.join(", ")}`,
    });
  }
};

// Export the module
module.exports = helpers;
