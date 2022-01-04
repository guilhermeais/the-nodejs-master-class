/*
 * Crete and export configuration variables
 *
 */

const proccess = require("process");

// Container for all the enviroments
const enviroments = {};

// Staging (defualt) enviroment

enviroments.staging = {
  httpPort: 3000,
  httpsPort: 3001,
  envName: "staging",
  hashingSecret: "thisIsASecret",
  maxChecks: 5,
  twilio: {
    accountSid: "AC48a5a360f72fb848d2660a78010df699",
    authToken: "8f84d4c428d0725582b96894e7d3d3a5",
    fromPhone: "+12058589504",
  },
  templateGlobals: {
    appName: 'uptimeChecker',
    companyName: 'NotARealCompany. Inc',
    yearCreated: '2021',
    baseUrl:`http://localhost:3000`
  }
};

// Production enviroment
enviroments.production = {
  httpPort: 5000,
  httpsPort: 5001,
  envName: "production",
  hashingSecret: "thisIsAlsoASecret",
  maxChecks: 5,
  twilio: {
    accountSid: "AC48a5a360f72fb848d2660a78010df699",
    authToken: "8f84d4c428d0725582b96894e7d3d3a5",
    fromPhone: "+5516993299116",
  },
  templateGlobals: {
    appName: 'uptimeChecker',
    companyName: 'NotARealCompany. Inc',
    yearCreated: '2021',
    baseUrl:`http://localhost:5000`
  }
};

// Testing enviroment
enviroments.testing = {
  httpPort: 4000,
  httpsPort: 4001,
  envName: "testing",
  hashingSecret: "thisIsAlsoASecret",
  maxChecks: 5,
  twilio: {
    accountSid: "AC48a5a360f72fb848d2660a78010df699",
    authToken: "8f84d4c428d0725582b96894e7d3d3a5",
    fromPhone: "+5516993299116",
  },
  templateGlobals: {
    appName: 'uptimeChecker',
    companyName: 'NotARealCompany. Inc',
    yearCreated: '2021',
    baseUrl:`http://localhost:3000`
  }
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
