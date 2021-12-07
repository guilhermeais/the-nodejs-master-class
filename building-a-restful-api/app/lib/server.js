/*
 * Server-related tasks
 *
 */

// Depedencies
const http = require("http");
const https = require("https");
const url = require("url");
const { StringDecoder } = require("string_decoder");
const config = require("./config");
const fs = require("fs");
const handlers = require("./handlers");
const helpers = require("./helpers");
const path = require("path");
const {debuglog} = require('util')
const debug = debuglog('server')

// Instantiate the server module object
const server = {};

// Global variables
const _colors  = {
  'green':"\x1b[32m%s\x1b[0m",
  "red":"\x1b[31m%s\x1b[0m"
}

// All the server logic for both the http and https server
server.unifiedServer = function (request, response) {
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
      typeof server.router[trimmedPath] !== "undefined"
        ? server.router[trimmedPath]
        : handlers.notFound;

    // Construct the data object to send to the handler
    const data = {
      trimmedPath,
      queryStringObject,
      method,
      headers,
      payload: helpers.parseJsonToObject(buffer),
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
      // if the response is 200/201, print green otherwise print red
     
      const _color =  [200, 201].includes(statusCode)?_colors['green']:_colors['red']
      
      debug(_color,`${method.toUpperCase()}/${trimmedPath} ${statusCode}`);
      // debug("Returning this response: ", statusCode, payloadString);
    });
  });
};

// Define a request router
server.router = {
  ping: handlers.ping,
  users: handlers.users,
  tokens: handlers.tokens,
  checks: handlers.checks,
};

// Instantiate the HTTP server
server.httpServer = http.createServer(server.unifiedServer);

// Start the HTTP server

// Instantiate the HTTPS server
const _pathKey = path.join(__dirname, "/../https/key.pem");
const _pathCert = path.join(__dirname, "/../https/cert.pem");
server.httpsServerOptions = {
  key: fs.readFileSync(_pathKey),
  cert: fs.readFileSync(_pathCert),
};

server.httpsServer = https.createServer(
  server.httpsServerOptions,
  server.unifiedServer
);

// Start the HTTPS server

// Init script
server.init = function () {
  // Start the HTTP server
  server.httpServer.listen(config.httpPort, () => {
    console.log(
      "\x1b[36m%s\x1b[0m",
      `the server HTTP is listening on port ${config.httpPort} in ${config.envName} mode.`
    );
  });

  // Start the HTTPS server
  server.httpsServer.listen(config.httpsPort, () => {
    console.log(
      "\x1b[35m%s\x1b[0m",
      `the server HTTPS is listening on port ${config.httpsPort} in ${config.envName} mode.`
    );
  });
};

// Export the module
module.exports = server;
