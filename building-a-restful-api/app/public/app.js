/**
 * Frontend Logic for the Application
 */

// Container for the frontend application
let app = {};

// Config
app.config = {
  sessionToken: null,
};

// AJAX Client for the (restful API)
app.client = {};

// Interface for making API calls
app.client.request = function (
  headers = {},
  path = "/",
  method = "",
  queryStringObject = {},
  payload = {},
  callback = null
) {
  const POSSIBLE_REQUEST_METHODS = ["POST", "GET", "PUT", "DELETE"];
  method = POSSIBLE_REQUEST_METHODS.includes(method.toUpperCase())
    ? method.toUpperCase()
    : "GET";

  // For each query string parameter send, add it to the path
  const requestUrl = `${path}?`;
  Object.keys(queryStringObject).forEach((queryKey, i) => {
    if (queryStringObject.hasOwnProperty(queryKey)) {
      // If at least one query string parameter has already been added, prepend new ones with an ampersand
      if (i > 0) {
        requestUrl += "&";
      }

      // Add the key and value
      requestUrl += `${queryKey}=${queryStringObject[queryKey]}`;
    }
  });
  // Form the http request as a JSON type
  const xhr = new XMLHttpRequest();
  xhr.open(method, requestUrl, true);
  xhr.setRequestHeader("Content-Type", "applicatoin/json");

  // For each header sent, add it to the request
  Object.keys(headers).forEach((headerKey) => {
    if (headers.hasOwnProperty(headerKey)) {
      xhr.setRequestHeader(headerKey, headers[headerKey]);
    }
  });

  // If there is a current session token set, add that as a header
  if (app.config.sessionToken) {
    xhr.setRequestHeader("token", app.config.sessionToken.id);
  }

  // When the request comes back, handle the response
  xhr.onreadystatechange = function () {
    if (xhr.readyState === XMLHttpRequest.DONE) {
      const statusCode = xhr.status
      const responseReturned = xhr.responseText

      // Callback if requested
      if (typeof callback === 'function' ) {
        try {
          const parsedResponse = JSON.parse(responseReturned)
          callback(statusCode, parsedResponse)
        } catch (error) {
          callback(statusCode, )
        }
      }
    }
  }

  // Send the payload as JSON
  const payloadString = JSON.stringify(payload)
  xhr.send(payloadString)
};
