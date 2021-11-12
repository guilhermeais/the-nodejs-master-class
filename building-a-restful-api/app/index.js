/*
 * Primary file for the API
 *
 */

// Depedencies
const http = require("http");
const url = require("url");
const { StringDecoder } = require("string_decoder");
const config = require('./config')

// The server should respond to all request with a string

const server = http.createServer(function (request, response) {
  // Get the URL and parse it
  const parsedUrl = url.parse(request.url, true);

  // Get the path
  const path = parsedUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+$/g, "");

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

    // Choose the handler this request should go to. If one is not found, use the not found handler
    const cosenHandler =
      typeof router[trimmedPath] !== "undefined"
        ? router[trimmedPath]
        : handlers.notFound;

    // Construct the data object to send to the handler
    const data = {
      trimmedPath,
      queryStringObject,
      method,
      headers,
      payload: buffer,
    };

    // Route the request to the hadler specified in the router
    cosenHandler(data, function (statusCode, payload) {
      // Use the status code called back by the handler, or default to 200
      let _statusCode = typeof statusCode == "number" ? statusCode : 200;

      // Use the payload called back by the handler, or default to empty object
      let _payload = typeof payload == "object" ? payload : {};

      // Convert the payload to a string
      const payloadString = JSON.stringify(_payload);

      // Return the response
      response.setHeader("Content-Type", "application/json");
      response.writeHead(_statusCode);
      response.end(payloadString);

      // Log the request path
      console.log("Request this response: ", statusCode, payloadString);
    });
  });
});

// Start the server, and have it listen on port 3000
server.listen(config.port, () => {
  console.log(`the server is listening on port ${config.port} in ${config.envName} mode.`);
});

// Define the handlers
const handlers = {};

// Sample handler
handlers.sample = function (data, callback) {
  // Callback a http status code, and a payload object
  callback(406, { name: "sample handler" });
};

// Not found handler
handlers.notFound = function (data, callback) {
  callback(404, "not found");
};

// Define a request router
const router = {
  sample: handlers.sample,
};
