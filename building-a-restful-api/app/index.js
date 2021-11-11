/*
 * Primary file for the API
 *
 */

// Depedencies
const http = require("http");
const url = require("url");

// The server should respond to all request with a string

const server = http.createServer(function (request, response) {
  // Get the URL and parse it
  const parsedUrl = url.parse(request.url, true);

  // Get the path
  const path = parsedUrl.pathname;
  const trimmedPath = path.trim()
  
  // Get the HTTP Method
  const method = request.method.toLowerCase()
  
  // Send the response
  response.end("Hello World\n");

  // Log the request path
  console.log(`Request received on path: ${trimmedPath} with method: ${method}`);
});

// Start the server, and have it listen on port 3000
server.listen("3000", () => {
  console.log("the server is listening on port 3000 now.");
});
