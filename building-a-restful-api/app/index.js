/*
 * Primary file for the API
 *
 */

// Dependencies
const server = require("./lib/server");
const workers = require("./lib/workers");
const cli = require("./lib/cli");

// Declare the app
const app = {};

// Init function
app.init = function (callback) {
  // Start the server
  server.init();

  // Start the workers
  workers.init();

  // Start the CLI, but make sure it starts last
  setTimeout(() => {
    cli.init();
    callback(true);
  }, 50);
};

// Self invoking only if required directly
if (require.main === module) {
  app.init(() => {});
}

// const EVENTS = ['SIGTERM', 'SIGINT','SIGQUIT']

// for (const EVENT of EVENTS) {
//   process.on(EVENT, ()=>{
//     console.log(`${EVENT} is called`);
//   })
// }

// Export the app
module.exports = app;
