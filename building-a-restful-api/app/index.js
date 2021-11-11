/*
 * Primary file for the API
 *
 */

// Depedencies
const http = require("http");

// The server should respond to all request with a string
const server = http.createServer(function (request, response) {
  response.end("Hello World\n");
});

// Start the server, and have it listen on port 3000
server.listen("3000", () => {
  console.log("the server is listening on port 3000 now.");
});
