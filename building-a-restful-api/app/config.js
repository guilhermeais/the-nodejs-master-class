/*
 * Crete and export configuration variables
 *
 */

const proccess = require("process");

// Container for all the enviroments
const enviroments = {};

// Staging (defualt) enviroment

enviroments.staging = {
  port: 3000,
  envName: "staging",
};

// Production enviroment
enviroments.production = {
  port: 5000,
  envName: "production",
};

// Determine which environment was passed as comamand-line argument

const currentEnviroment =
  typeof proccess.env.NODE_ENV == "string"
    ? process.env.NODE_ENV.toLowerCase()
    : "";

// Check that the current enviroment is one of the enviroments above, if not, default to staging
const enviromentToExport =
  typeof enviroments[currentEnviroment] == "object"
    ? enviroments[currentEnviroment]
    : enviroments.staging;

// Export the module
module.exports = enviromentToExport;
