/**
 * Request handlers
 */

// Dependencies
const config = require("./config");
const _data = require("./data");
const helpers = require("./helpers");

// Define the handlers
const handlers = {};
/**
 * HTML Handlers
 * @param {{method: String}} data
 * @param {Function<>} callback
 */

// Index handler
handlers.index = function (
  data,
  callback = (statusCode = 500, str = "", type = "html") => {}
) {
  // Reject any request that isn't a GET

  if (data.method === "get") {
    // Prepare data for interpolation
    const templateData = {
      "head.title": "Uptime Monitoring - Made Simple",
      "head.description":
        "We offer free, simple uptime monitoring for HTTP/HTTPS sites of all kinds. When your site goes down, we'll send you a text to let you know",
      // "body.title": "Hello templated world",
      "body.class": "index",
    };

    // Read in a template as a string
    helpers.getTemplate("index", templateData, (err, str) => {
      if (!err && str) {
        // Add the universal header and footer
        helpers.addUniversalTemplates(str, templateData, (err, fullStr) => {
          if (!err && fullStr) {
            // Return that page as HTML
            callback(200, fullStr, "html");
          } else {
            callback(500, undefined, "html");
          }
        });
      } else {
        callback(500, undefined, "html");
      }
    });
  } else {
    // Return that the method isn't allowed
    callback(405, undefined, "html");
  }
};

// Favicon
handlers.favicon = function (data, callback) {
  // Reject any request that isn't a GET

  if (data.method === "get") {
    // Read in the favicon's data
    helpers.getStaticAsset("favicon.ico", (err, data) => {
      if (!err && data) {
        // Callback the data
        callback(200, data, "favicon");
      } else {
        callback(500);
      }
    });
  } else {
    callback(405);
  }
};

// Publi assets
handlers.public = function (data, callback) {
  // Reject any request that isn't a GET

  if (data.method === "get") {
    // Get the filename being requested
    const trimmedAssetName = data.trimmedPath.replace("public/", "").trim();
    if (trimmedAssetName.length > 0) {
      // Read in the asset's data
      helpers.getStaticAsset(trimmedAssetName, (err, data) => {
        if (!err && data) {
          // Determine the content type (default to plain text)

          const POSSIBLES_CONTENT_TYPES = [
            "css",
            "png",
            "jpeg",
            "jpg",
            "ico",
            "js",
          ];

          let contentType = POSSIBLES_CONTENT_TYPES.find(
            (type) => trimmedAssetName.indexOf(`.${type}`) > -1
          );
          contentType = contentType
            ? contentType === "ico"
              ? "favicon"
              : contentType
            : "plain";
          // console.log("handlers.public -> content type ->", contentType);

          // Callback the data
          callback(200, data, contentType);
        } else {
          callback(404);
        }
      });
    } else {
      callback(404);
    }
  } else {
    callback(405);
  }
};

/**
 * JSON API Handlers
 */

/**
 *
 * @param {{method: Function}} data
 * @param {Function} callback
 */

// Users
handlers.users = function (data, callback) {
  const accetableMethods = ["post", "get", "put", "delete"];
  if (accetableMethods.includes(data.method)) {
    handlers._users[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for the users submethods
handlers._users = {};

// Users - post
// Required data: firstName, lastName, phone, password, tosAgreement
// Optional data: none
handlers._users.post = function (data, callback) {
  // Check that all required fields are filled out
  const firstName =
    typeof data?.payload?.firstName === "string" &&
    data?.payload?.firstName.trim().length > 0
      ? data.payload.firstName.trim()
      : "";

  const lastName =
    typeof data?.payload?.lastName == "string" &&
    data?.payload?.lastName.trim().length > 0
      ? data.payload.lastName.trim()
      : "";

  const phone =
    typeof data?.payload?.phone == "string" &&
    data?.payload?.phone.trim().length >= 10
      ? data.payload.phone.trim()
      : "";

  const password =
    typeof data?.payload?.password == "string" &&
    data?.payload?.password.trim().length > 0
      ? data.payload.password.trim()
      : "";

  const tosAgreement =
    typeof data?.payload?.tosAgreement == "boolean"
      ? data.payload.tosAgreement
      : false;

  if (firstName && lastName && phone && password && tosAgreement) {
    // Make sure that the user doesn't already exist
    _data.read("users", phone, (err, data) => {
      if (err) {
        // Hash the password
        const hashedPassword = helpers.hash(password);

        // Create the user object
        if (!hashedPassword) {
          callback(500, { Error: "Could not hash the user's password." });
          return;
        }
        const userObject = {
          firstName,
          lastName,
          phone,
          hashedPassword,
          tosAgreement,
        };

        // Store the users
        _data.create("users", phone, userObject, (err) => {
          if (!err) {
            callback(201, userObject);
          } else {
            callback(500, { Error: "Could not create the new user." });
          }
        });
      } else {
        // User already exists
        callback(400, {
          Error: "A user with that phone number already exists.",
        });
      }
    });
  } else {
    callback(400, { Error: "Missing required fields" });
  }
};

// Users - get
// Required data: phone
// Optinal data: none
handlers._users.get = function (data, callback) {
  // Check that the phone number is valid
  const phone =
    typeof data.queryStringObject.phone === "string" &&
    data.queryStringObject.phone.trim() >= 10
      ? data.queryStringObject.phone
      : "";

  if (phone) {
    // Get the token from the headers
    const token = data.headers.token;

    // Verify that the given token is valid for the phone number
    handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
      if (tokenIsValid) {
        // Lookup the user
        _data.read("users", phone, (err, data) => {
          if (!err && data) {
            // Remove the hashed password from the user object before returning it to the requester
            delete data.hashedPassword;
            callback(200, data);
          } else {
            callback(404, { Error: "User not found." });
          }
        });
      } else {
        callback(403, { Error: "User not allowed, verify your token." });
      }
    });
  } else {
    callback(400, { Error: "Missing required field." });
  }
};

// Users - put
// Required data: phone
// Optional data: firstName, lastName, password (at leat one must be specified)
handlers._users.put = function (data, callback) {
  // Check for the required field
  const phone =
    typeof data.payload.phone === "string" && data.payload.phone.trim() >= 10
      ? data.payload.phone
      : "";

  // Check for the optional fields
  const firstName =
    typeof data?.payload?.firstName === "string" &&
    data?.payload?.firstName.trim().length > 0
      ? data.payload.firstName.trim()
      : "";

  const lastName =
    typeof data?.payload?.lastName == "string" &&
    data?.payload?.lastName.trim().length > 0
      ? data.payload.lastName.trim()
      : "";

  const password =
    typeof data?.payload?.password == "string" &&
    data?.payload?.password.trim().length > 0
      ? data.payload.password.trim()
      : "";

  // Error if the phone is invalid
  if (phone) {
    if (firstName || lastName || password) {
      // Get the token from the headers
      const token = data.headers.token;

      // Verify that the given token is valid for the phone number
      handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
        if (tokenIsValid) {
          // Lookup the user
          _data.read("users", phone, (err, userData) => {
            if (!err && userData) {
              // Update the fields necessary
              if (firstName) {
                userData.firstName = firstName;
              }
              if (lastName) {
                userData.lastName = lastName;
              }
              if (password) {
                userData.hashedPassword = helpers.hash(password);
              }

              // Store the new updates

              _data.update("users", phone, userData, (err) => {
                if (!err) {
                  callback(200, userData);
                } else {
                  console.log(err);
                  callback(500, { Error: "Could not update the user" });
                }
              });
            } else {
              callback(400, { Error: "The specified user does not exist" });
            }
          });
        } else {
          callback(403, { Error: "User not allowed, verify your token." });
        }
      });
    } else {
      callback(400, { Error: "Missing fields to update." });
    }
  } else {
    callback(400, { Error: "Missing required field." });
  }
};

// Users - delete
// Required field: phone

handlers._users.delete = function (data, callback) {
  // Check that the phone number is valid
  const phone =
    typeof data.queryStringObject.phone === "string" &&
    data.queryStringObject.phone.trim() >= 10
      ? data.queryStringObject.phone
      : "";

  if (phone) {
    const { token } = data.headers;
    if (!token) return callback(403, { Error: "missing token" });
    handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
      if (tokenIsValid) {
        // Lookup the user
        _data.read("users", phone, (err, data) => {
          if (!err && data) {
            _data.delete("users", phone, (err) => {
              if (!err) {
                const messages = [];
                messages.push("User was deleted.");
                // Delete each of the checks associated with the user
                if (Array.isArray(data.checks) && data.checks.length > 0) {
                  // Loop through the checks
                  data.checks.forEach((checkId) => {
                    _data.delete("checks", checkId, (err) => {
                      if (!err) {
                        messages.push(`Check ${checkId} was deleted`);
                      } else {
                        messages.push(`Error on delete the check ${checkId}`);
                      }
                      callback(200, messages);
                    });
                  });
                } else {
                  messages.push("User has no checks to delete");
                  callback(200, messages);
                }
              } else {
                callback(500, { Error: "Could not delete the specified user" });
              }
            });
          } else {
            callback(404, { Error: "Could not find the specified user." });
          }
        });
      } else {
        callback(403, { Error: "User not allowed, verify your token." });
      }
    });
  } else {
    callback(400, { Error: "Missing required field." });
  }
};

// Tokens
handlers.tokens = function (data, callback) {
  const accetableMethods = ["post", "get", "put", "delete"];
  if (accetableMethods.includes(data.method)) {
    handlers._tokens[data.method](data, callback);
  } else {
    callback(405);
  }
};

// container for all the tokens submethods
handlers._tokens = {};

// Tokens - post
// Required data: phone, password
// optional data: none
handlers._tokens.post = function (data, callback) {
  const phone =
    typeof data?.payload?.phone == "string" &&
    data?.payload?.phone.trim().length >= 10
      ? data.payload.phone.trim()
      : "";

  const password =
    typeof data?.payload?.password == "string" &&
    data?.payload?.password.trim().length > 0
      ? data.payload.password.trim()
      : "";

  if (phone && password) {
    // Lookup the user who matches that phone number
    _data.read("users", phone, (err, userData) => {
      if (!err && userData) {
        // Hash the sent password, and compare it to the password stored in the user object
        const hashedPassword = helpers.hash(password);
        if (hashedPassword === userData.hashedPassword) {
          // if valid, create a new token with a radom name. Set expiration date 1 hour in the future
          const tokenId = helpers.createRandomString(20);
          const expiries = Date.now() + 1000 * 60 * 60;
          const tokenObject = {
            phone,
            id: tokenId,
            expiries,
          };

          // Store the token
          _data.create("tokens", tokenId, tokenObject, (err) => {
            if (!err) {
              callback(201, tokenObject);
            } else {
              callback(500, { Error: "Could not create the new token" });
            }
          });
        } else {
          callback(400, {
            Error:
              "Phone or Password did not match the specified user's stored",
          });
        }
      } else {
        callback(400, { Error: "Could not find the specified user" });
      }
    });
  } else {
    callback(400, { Error: "Missing required field(s)" });
  }
};

// Tokens - get
// Required data: id
// Optional data: none
handlers._tokens.get = function (data, callback) {
  // Check that the id is valid
  const id =
    typeof data.queryStringObject.id === "string" &&
    data.queryStringObject.id.trim().length === 20
      ? data.queryStringObject.id
      : "";

  if (id) {
    // Lookup the token
    _data.read("tokens", id, (err, tokenData) => {
      if (!err && tokenData) {
        callback(200, tokenData);
      } else {
        callback(404, { Error: "Token not found." });
      }
    });
  } else {
    callback(400, { Error: "Missing required field." });
  }
};

// Tokens - put
// Required data: id, extend
// Option data: none
handlers._tokens.put = function (data, callback) {
  const id =
    typeof data?.payload?.id == "string" &&
    data?.payload?.id.trim().length == 20
      ? data.payload.id.trim()
      : "";
  const extend = !!data?.payload?.extend || false;

  if (id && extend) {
    // Lookup the token
    _data.read("tokens", id, (err, tokenData) => {
      if (!err && tokenData) {
        // Check to make sure the token isn't already expired
        if (tokenData.expiries > Date.now()) {
          // Set the expiration an hour from now
          const ONE_HOUR = 1000 * 60 * 60;
          tokenData.expiries = Date.now() + ONE_HOUR;

          // Store the new updates
          _data.update("tokens", id, tokenData, (err) => {
            if (!err) {
              callback(200, { newExpiries: tokenData.expiries });
            } else {
              callback(500, {
                Error: "Could not update the token's expiration",
              });
            }
          });
        } else {
          callback(400, {
            Error: "The token has already expired, and cannot be extended",
          });
        }
      } else {
        callback(400, { Error: "Specified token does not exist" });
      }
    });
  } else {
    callback(400, {
      Error: "Missing required field(s) or field(s) are invalid",
    });
  }
};

// Tokens - delete
// Required data: id
// Optional data: none
handlers._tokens.delete = function (data, callback) {
  const id =
    typeof data.queryStringObject.id === "string" &&
    data.queryStringObject.id.trim().length === 20
      ? data.queryStringObject.id
      : "";

  if (id) {
    // Lookup the user
    _data.read("tokens", id, (err, data) => {
      if (!err && data) {
        _data.delete("tokens", id, (err) => {
          if (!err) {
            callback(200);
          } else {
            callback(500, { Error: "Could not delete the specified token" });
          }
        });
      } else {
        callback(404, { Error: "Could not find the specified token." });
      }
    });
  } else {
    callback(400, { Error: "Missing required field." });
  }
};

// Verify if a given token id is currently valid for a given user
handlers._tokens.verifyToken = function (id, phone, callback) {
  // Lookup the token
  _data.read("tokens", id, (err, tokenData) => {
    if (!err && tokenData) {
      // Check that the token is for the given user and has not expired
      if (tokenData.phone === phone && tokenData.expiries > Date.now()) {
        callback(true);
      } else {
        callback(false);
      }
    } else {
      callback(false);
    }
  });
};

// Checks
handlers.checks = function (data, callback) {
  const accetableMethods = ["post", "get", "put", "delete"];
  if (accetableMethods.includes(data.method)) {
    handlers._checks[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for all the checks methods
handlers._checks = {};

// Checks - post
// Required data: protocol, url, method, successCodes,timeoutSeconds
// Optional data: none
handlers._checks.post = function (data, callback) {
  const errors = [];
  // Validate inputs
  const { protocol, url, method, successCodes, timeoutSeconds } = data.payload;

  const ALLOWED_PROTOCOLS = ["https", "http"];
  const ALLOWED_METHODS = ["post", "get", "put", "delete"];

  if (
    typeof protocol === "string" &&
    !ALLOWED_PROTOCOLS.includes(protocol.toLowerCase())
  ) {
    errors.push(
      `The protocol ${protocol} is not allowed. Allowed protocols: [${ALLOWED_PROTOCOLS.join(
        ", "
      )}]`
    );
  }

  if (!url) {
    errors.push("invalid URL");
  }

  if (
    typeof method === "string" &&
    !ALLOWED_METHODS.includes(method.toLowerCase())
  ) {
    errors.push(
      `The method ${method} is not allowed. Allowed methods: [${ALLOWED_METHODS.join(
        ", "
      )}]`
    );
  }

  if (!Array.isArray(successCodes) || successCodes.length <= 0) {
    errors.push(`Invalid success codes.`);
  }

  if (typeof timeoutSeconds != "number") {
    errors.push(`Timeout seconds should be a number.`);
  }
  if (!(timeoutSeconds >= 1 && timeoutSeconds <= 5)) {
    errors.push(`Timeout seconds should be between 1 to 5.`);
  }
  if (timeoutSeconds % 1 !== 0) {
    errors.push(`Timeout seconds should be a whole number.`);
  }

  if (errors.length > 0) {
    callback(404, { Error: errors });
  } else {
    // Get the token from the headers
    const { token } = data.headers;
    // Lookup the user by reading the token
    if (token) {
      _data.read("tokens", token, (err, tokenData) => {
        if (!err && tokenData) {
          const userPhone = tokenData.phone;
          // Lookup the user data
          _data.read("users", userPhone, (err, userData) => {
            if (!err && userData) {
              const userChecks = userData.checks || [];
              // Verify that the user has less than the number of max-checks-per-user
              if (userChecks.length < config.maxChecks) {
                // Create a random id for the check
                const checkId = helpers.createRandomString(20);

                // Create the check object, and include the user's phone
                const checkObject = {
                  id: checkId,
                  userPhone,
                  protocol,
                  url,
                  method,
                  successCodes,
                  timeoutSeconds,
                };

                // Save the object
                _data.create("checks", checkId, checkObject, (err) => {
                  if (!err) {
                    // Add the check id to the user's object
                    userData.checks = userChecks;
                    userData.checks.push(checkId);

                    // Save the new user data
                    _data.update("users", userPhone, userData, (err) => {
                      if (!err) {
                        // Return the data about the new check
                        callback(201, checkObject);
                      } else {
                        callback(500, {
                          Error: "Could not update the user with the new check",
                        });
                      }
                    });
                  } else {
                    callback(500, { Error: "Could not create the new check" });
                  }
                });
              } else {
                callback(400, {
                  Error: `The user already has the maximum number of checks. (maximum checks: ${config.maxChecks})`,
                });
              }
            } else {
              callback(403, { Error: "User not allowed, verify your token." });
            }
          });
        } else {
          callback(403, { Error: "User not allowed, verify your token." });
        }
      });
    } else {
      callback(403, { Error: "Token isn't provided." });
    }
  }
};

// Checks - get
// Required data: id
// Optional data: none
handlers._checks.get = function (data, callback) {
  // Check that the phone number is valid
  const { id } = data.queryStringObject;

  if (id) {
    // Lookup the check
    _data.read("checks", id, (err, checkData) => {
      if (!err && checkData) {
        // Get the token from the headers
        const { token } = data.headers;

        if (token) {
          // Verify that the given token is valid and belongs to the user who created the check
          handlers._tokens.verifyToken(
            token,
            checkData.userPhone,
            (tokenIsValid) => {
              if (tokenIsValid) {
                // Return the check data
                callback(200, checkData);
              } else {
                callback(403, {
                  Error: "User not allowed, verify your token.",
                });
              }
            }
          );
        } else {
          callback(403, { Error: "Missing token" });
        }
      } else {
        callback(404);
      }
    });
  } else {
    callback(400, { Error: "Missing the id." });
  }
};

// Checks - put
// Required data: id
// Optional data: protocol, url, methods, successCodes, timeoutSecons (at least one must be send)
handlers._checks.put = function (data, callback) {
  const REQUIRED_FIELDS = ["id"];
  const OPTIONAL_FIELDS = [
    "protocol",
    "url",
    "methods",
    "successCodes",
    "timeoutSecons",
  ];
  const payloadObject = { ...data.payload, ...data.queryStringObject };

  const missing = [];
  const errors = [];
  for (const key of Object.keys(payloadObject)) {
    if (REQUIRED_FIELDS.includes(key) || OPTIONAL_FIELDS.includes(key)) {
      if (!payloadObject[key]) {
        missing.push(key);
      }
    }
  }
  // Check for the required field
  const requiredMissing = REQUIRED_FIELDS.filter((required) =>
    missing.includes(required)
  );
  if (requiredMissing.length > 0) {
    errors.push(`Missing required field(s) [${requiredMissing.join(", ")}]`);
  }

  // Check for the optional fields
  const optionalDataReceived = OPTIONAL_FIELDS.filter(
    (optional) => !missing.includes(optional)
  );
  if (optionalDataReceived.length <= 0) {
    errors.push(
      `At least one optional data is required. Optional Data: [${OPTIONAL_FIELDS.join(
        ", "
      )}]`
    );
  }

  if (errors.length === 0) {
    // Lookup the check

    _data.read("checks", payloadObject.id, (err, checkData) => {
      if (!err && checkData) {
        const token = data.headers.token;

        if (token) {
          handlers._tokens.verifyToken(
            token,
            checkData.userPhone,
            (tokenIsValid) => {
              if (tokenIsValid) {
                // Update the check where necessary
                optionalDataReceived.forEach((fieldToUpdt) => {
                  if (payloadObject[fieldToUpdt]) {
                    checkData[fieldToUpdt] = payloadObject[fieldToUpdt];
                  }
                });

                // Store the updates
                _data.update("checks", payloadObject.id, checkData, (err) => {
                  if (!err) {
                    callback(200);
                  } else {
                    callback(500, { Error: "Could not update the check." });
                  }
                });
              } else {
                callback(403, { Error: "Token isn't valid or is expired." });
              }
            }
          );
        } else {
          callback(403, { Error: "Token is missing." });
        }
      } else {
        callback(400, { Error: "Check ID did not exits." });
      }
    });
  } else {
    callback(404, { Error: errors.join(", ") });
  }
};

// Checks - delete
// Required data: id
// Optional data: none
handlers._checks.delete = function (data, callback) {
  // Check that the id is valid
  const { id } = data.queryStringObject;

  if (id) {
    // Lookup the check
    _data.read("checks", id, (err, checkData) => {
      if (!err && checkData) {
        // Get the token from the headers
        const { token } = data.headers;

        if (token) {
          handlers._tokens.verifyToken(
            token,
            checkData.userPhone,
            (tokenIsValid) => {
              if (tokenIsValid) {
                // Delete the check data
                _data.delete("checks", id, (err) => {
                  if (!err) {
                    // Lookup the user
                    _data.read(
                      "users",
                      checkData.userPhone,
                      (err, userData) => {
                        if (!err && userData) {
                          if (
                            Array.isArray(userData.checks) &&
                            userData.checks.length > 0
                          ) {
                            const checkIndex = userData.checks.findIndex(
                              (check) => check === id
                            );
                            //console.log('check index', checkIndex);
                            if (checkIndex > -1) {
                              userData.checks.splice(checkIndex, 1);
                            }
                          }

                          _data.update(
                            "users",
                            checkData.userPhone,
                            userData,
                            (err) => {
                              if (!err) {
                                callback(200);
                              } else {
                                callback(500, {
                                  Error:
                                    "Could not remove the check from the user object.",
                                });
                              }
                            }
                          );
                        } else {
                          callback(404, {
                            Error:
                              "Could not find the user who created the check.",
                          });
                        }
                      }
                    );
                  } else {
                    callback(500, { Error: "Could not delete the check data" });
                  }
                });
              } else {
                callback(403, {
                  Error: "User not allowed, verify your token.",
                });
              }
            }
          );
        } else {
          callback(403, { Error: "missing token." });
        }
      } else {
        callback(400, { Error: "The specified check ID doesn't exists" });
      }
    });
  } else {
    callback(400, { Error: "Missing ID field." });
  }
};

// Ping handler
handlers.ping = function (data, callback) {
  callback(200);
};

// Not found handler
handlers.notFound = function (data, callback) {
  callback(404, "not found");
};

// Export the module
module.exports = handlers;
