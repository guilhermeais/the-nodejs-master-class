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
const { debuglog } = require("util");
const debug = debuglog("server");

// Instantiate the server module object
const server = {};

// Global variables
const _colors = {
  green: "\x1b[32m%s\x1b[0m",
  red: "\x1b[31m%s\x1b[0m",
};
const _parseString = (value) => (typeof value === "string" ? value : "");
const POSSIBLES_CONTENT_TYPES = {
  json: { type: "application/json", parse: (value) => JSON.stringify(value) },
  html: { type: "text/html", parse: _parseString },
  css: { type: "text/css", parse:  (value)=>value&&typeof value !=='undefined'?value:null  },
  png: { type: "image/png", parse: (value)=>value&&typeof value !=='undefined'?value:null },
  jpeg: { type: "image/jpeg", parse: (value)=>value&&typeof value !=='undefined'?value:null },
  jpg: { type: "image/jpeg", parse: (value)=>value&&typeof value !=='undefined'?value:null },
  favicon: { type: "image/x-icon", parse: (value)=>value&&typeof value !=='undefined'?value:null },
  plain: { type: "text/plain",  parse:(value)=>value&&typeof value !=='undefined'?value:null },
  js: { type: "application/javascript",  parse:(value)=>value&&typeof value !=='undefined'?value:null},
  _default: { type: "text/plain", parse:(value)=>value&&typeof value !=='undefined'?value:null },
};

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
    let cosenHandler =
      typeof server.router[trimmedPath] !== "undefined"
        ? server.router[trimmedPath]
        : handlers.notFound;

        // If ther equest is within the public directory, use the public handler instead
        cosenHandler = trimmedPath.indexOf('public') > -1?handlers.public : cosenHandler

    // Construct the data object to send to the handler
    const data = {
      trimmedPath,
      queryStringObject,
      method,
      headers,
      payload: helpers.parseJsonToObject(buffer),
    };

    // Route the request to the hadler specified in the router
    cosenHandler(
      data,
      function (statusCode = 200, payload = {}, contentType = "json") {
        // Return the response-parts that are content-specific
        response.setHeader(
          "Content-Type",
          POSSIBLES_CONTENT_TYPES[contentType?contentType:'_default'].type
        );

        let payloadString = POSSIBLES_CONTENT_TYPES[contentType?contentType:'_default'].parse(payload);
         // console.log('payload string', payloadString);
        // Return the response-parts that are common to all content-types
        response.writeHead(statusCode);
        response.end(payloadString);
        // Log the request path
        // if the response is 200/201, print green otherwise print red

        const _color = [200, 201].includes(statusCode)
          ? _colors["green"]
          : _colors["red"];

        debug(_color, `${method.toUpperCase()}/${trimmedPath} ${statusCode}`);
        // debug("Returning this response: ", statusCode, payloadString);
      }
    );
  });
};

// Define a request router
server.router = {
  "": handlers.index,
  "account/create": handlers.accountCreate,
  "account/edit": handlers.accountEdit,
  "account/deleted": handlers.accountDeleted,
  "session/create": handlers.sessionCreate,
  "session/deleted": handlers.sessionDeleted,
  "checks/all": handlers.checkList,
  "checks/create": handlers.checksCreate,
  "checks/edit": handlers.checksEdit,

  ping: handlers.ping,
  "api/users": handlers.users,
  "api/tokens": handlers.tokens,
  "api/checks": handlers.checks,
  "favicon.ico": handlers.favicon,
  'public': handlers.public,
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
