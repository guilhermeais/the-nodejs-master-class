/**
 * Request handlers
 */

// Dependencies
const _data = require("./data");
const helpers = require("./helpers");

// Define the handlers
const handlers = {};

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
// @TODO Cleanup (delete) any other data files associated with this user
handlers._users.delete = function (data, callback) {
  // Check that the phone number is valid
  const phone =
    typeof data.queryStringObject.phone === "string" &&
    data.queryStringObject.phone.trim() >= 10
      ? data.queryStringObject.phone
      : "";

  if (phone) {
    handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
      if (tokenIsValid) {
        // Lookup the user
        _data.read("users", phone, (err, data) => {
          if (!err && data) {
            _data.delete("users", phone, (err) => {
              if (!err) {
                callback(200);
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
