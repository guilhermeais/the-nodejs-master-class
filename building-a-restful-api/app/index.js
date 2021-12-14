/*
 * Primary file for the API
 *
 */

// Dependencies
const server = require('./lib/server');
const workers = require('./lib/workers');

// Declare the app
const app = {};

// Init function
app.init = function () {
  // Start the server
  server.init()

  // Start the workers
  workers.init()
}

// Execute 
app.init()

// const EVENTS = ['SIGTERM', 'SIGINT','SIGQUIT']

// for (const EVENT of EVENTS) {
//   process.on(EVENT, ()=>{
//     console.log(`${EVENT} is called`);
//   })
// }


// Export the app
module.exports = app
