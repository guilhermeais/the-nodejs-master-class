/*
 * Primary file for the API
 *
 */

// Depedencies
const http = require("http");
const url = require("url");
const StringDecoder = require("string_decoder").StringDecoder;

// The server should respond to all request with a string

const server = http.createServer(function (request, response) {
  // Get the URL and parse it
  const parsedUrl = url.parse(request.url, true);

  // Get the path
  const path = parsedUrl.pathname;
  const trimmedPath = path.trim();

  // Get the query string as an object
  const queryStringObject = parsedUrl.query;

  // Get the HTTP Method
  const method = request.method.toLowerCase();

  // Get the headers as an object
  const headers = request.headers;

  // Get the payload, if any
  const decoder = new StringDecoder("utf-8");
  let buffer = "";
  request.on("data", function (data) {
    buffer += decoder.write(data);
  });

  request.on("end", function () {
    buffer += decoder.end();

    // Send the response
    response.end("Hello World\n");

    // Log the request path
    console.log("Request received with this payload: ", buffer);
  });
});

// Start the server, and have it listen on port 3000
server.listen("3000", () => {
  console.log("the server is listening on port 3000 now.");
});
