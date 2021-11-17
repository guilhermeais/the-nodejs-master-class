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
// @TODO Only let an authenticaded user access their object. Don't let them access anyone else's
handlers._users.get = function (data, callback) {
  // Check that the phone number is valid
  const phone =
    typeof data.queryStringObject.phone === "string" &&
    data.queryStringObject.phone.trim() >= 10
      ? data.queryStringObject.phone
      : "";

  if (phone) {
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
    callback(400, { Error: "Missing required field." });
  }
};

// Users - put
// Required data: phone
// Optional data: firstName, lastName, password (at leat one must be specified)
// @TODO Only let an authenticated user update their own object. Don't let them update anyone else's
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
      callback(400, { Error: "Missing fields to update." });
    }
  } else {
    callback(400, { Error: "Missing required field." });
  }
};

// Users - delete
// Required field: phone
// @TODO Only let an authenticated user delete their object. Dont let them delete anyone else's
// @TODO Cleanup (delete) any other data files associated with this user
handlers._users.delete = function (data, callback) {
  // Check that the phone number is valid
  const phone =
    typeof data.queryStringObject.phone === "string" &&
    data.queryStringObject.phone.trim() >= 10
      ? data.queryStringObject.phone
      : "";

  if (phone) {
    // Lookup the user
    _data.read("users", phone, (err, data) => {
      if (!err && data) {
       _data.delete('users', phone,err=>{
         if(!err){
          callback(200)
         }else{
          callback(500, {Error: 'Could not delete the specified user'})
         }
       })

      } else {
        callback(404, { Error: "Could not find the specified user." });
      }
    });
  } else {
    callback(400, { Error: "Missing required field." });
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
