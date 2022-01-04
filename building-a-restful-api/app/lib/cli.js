/**
 *  CLI-Related Taks
 */

// Dependencies
const readline = require("readline");
const debug = require("util").debuglog("cli");
const Events = require("events");
const { colors } = require("./helpers");
const { loadavg, cpus, freemem, uptime } = require("os");
const { getHeapStatistics } = require("v8");
const _data = require("./data");
class _events extends Events {
  constructor() {
    super();
  }
}
const e = new _events();

// Helpers
const _window = {
  width: process.stdout.columns,
};

// Instantiate the CLI module object
const cli = {};

// Responders object
cli.responders = {
  man: () => {},
  help: () => {},
  exit: function () {
    console.log("You exit the application");
    process.exit(0);
  },
  stats: function () {
    // Compile and object of stats
    const stats = {
      "Load Average": loadavg().join(" "),
      "CPU Count": cpus().length,
      "Free Memory": freemem(),
      "Current Malloced Memory": getHeapStatistics().malloced_memory,
      "Peak Malloced Memory": getHeapStatistics().peak_malloced_memory,
      "Allocated Heap Used (%)": Math.round(
        (getHeapStatistics().used_heap_size /
          getHeapStatistics().total_heap_size) *
          100
      ),
      "Available Heap Allocated (%)": Math.round(
        (getHeapStatistics().total_heap_size /
          getHeapStatistics().heap_size_limit) *
          100
      ),
      Uptime: uptime() + " Seconds",
    };

    // Show the header for the stats
    cli.defaultHeader("SYSTEM STATISTICS");
    // Log out each stat
    for (const key in stats) {
      const value = stats[key];
      let line = colors(key).yellow;
      const padding = 60 - key.length;
      for (let i = 0; i < padding; i++) {
        line += " ";
      }

      line += value;
      console.log(line);
      cli.verticalSpace();
    }

    cli.verticalSpace(1);

    // End with another horizontal line
    cli.horizontalLine();
  },

  "list users": function () {
    _data.list("users", (err, userIds) => {
      if (!err && userIds && Array.isArray(userIds)) {
        cli.verticalSpace();
        userIds.forEach((id) => {
          _data.read("users", id, (err, user) => {
            if (!err && user && typeof user == "object") {
              let line = `Name: ${user.firstName} ${user.lastName}; Phone: ${
                user.phone
              }; Checks: ${
                user.checks &&
                Array.isArray(user.checks) &&
                user.checks.length > 0
                  ? user.checks.length
                  : 0
              }.`;

              console.log(line);
              cli.verticalSpace();
            }
          });
        });
      }
    });
  },
  "more user info": function (str) {
    if (typeof str !== "string" && str.trim().length > 0) {
      console.log("The ID is invalid.");
      return;
    }
    // Get the ID from the string
    const userId = str.split("--")[1].trim();
    if (userId) {
      // Lookup the user
      _data.read("users", userId, (err, userData) => {
        if (!err && userData) {
          // Remove the hashed password
          delete userData.hashPassword;

          // Print the JSON with text highlighting
          cli.verticalSpace();
          console.dir(userData, { colors: true });
          cli.verticalSpace()
          return
        } else {
          console.log("Couldn't find the specified user")
          return
        }
      });
    
    } else {
      console.log("Invalid user id, please try again passing a valid id.");
      return
    }
  },

  "list checks": function (str) {
    console.log("You asked for list checks", str);
  },
  "more check info": function (str) {
    console.log("You asked for more check info", str);
  },

  "list logs": function () {
    console.log("You asked for list logs");
  },
  "more log info": function (str) {
    console.log("You asked for more log info", str);
  },
};

// Help / Man
cli.responders.help = function () {
  const commands = {
    man: "Show this help page",
    help: "Alias of the 'man' command",
    exit: "Kill the CLI (and the rest of the application)",
    stats:
      "Get statistics on the underlyong operating system and resource utilization",

    "list users":
      "Show a list of all the registered (undeleted) users in the system",
    "more user info --{userId}": "how details of a specefic user",

    "list checks --up --down":
      "Show a list of all the active checks in the system, including their state. The '--up' and the '--down' are both optional",
    "more check info --{checkId}": "Show details of a specified check",

    "list logs":
      "Show a list of all the log files available to be read (compressed and uncompressed)",
    "more log info --{fileName}": "Show details of a specified log file",
  };

  // Show a header fo the help page that is wide as the screen
  cli.defaultHeader("CLI MANUAL");

  // Show each command, followed by its exaplanation, in white and yrellow respectively
  for (const key in commands) {
    const value = commands[key];
    let line = colors(key).yellow;
    const padding = 60 - key.length;
    for (let i = 0; i < padding; i++) {
      line += " ";
    }

    line += value;
    console.log(line);
    cli.verticalSpace();
  }

  cli.verticalSpace(1);

  // End with another horizontal line
  cli.horizontalLine();
};
cli.responders.man = cli.responders.help;

// Create a vertical space
cli.verticalSpace = function (lines = 1) {
  if (typeof lines !== "number") {
    throw new Error("Lines should be a number");
  }

  for (let i = 0; i < lines; i++) {
    console.log("");
  }
};

// Create a horizontal line across the screen
cli.horizontalLine = function () {
  let line = "";
  for (let i = 0; i < _window.width; i++) {
    line += "-";
  }
  console.log(line);
};

// Create centered text on the screen
cli.centered = function (str = "") {
  if (typeof str !== "string") {
    throw new Error("str should be a string");
  }

  // Calculate the left padding there should be
  const leftPadding = Math.floor((_window.width - str.length) / 2);

  // Put in the left padded spaced before the string itself
  let line = "";

  for (let i = 0; i < leftPadding; i++) {
    line += " ";
  }
  line += str;
  console.log(line);
};

// Create a header
cli.defaultHeader = function (centeredStr = "UPTIME CLI") {
  if (typeof centeredStr !== "string") {
    throw new Error("centeredStr should be a string");
  }
  cli.horizontalLine();
  cli.centered(centeredStr);
  cli.horizontalLine();
  cli.verticalSpace(2);
};

// Input handlers
const possibleInputs = Object.keys(cli.responders);
for (const eventKey of possibleInputs) {
  if (cli.responders.hasOwnProperty(eventKey)) {
    e.on(eventKey, cli.responders[eventKey]);
  }
}

// Input processor
cli.proccesInput = function (str) {
  str = typeof str == "string" && str.trim().length > 0 ? str.trim() : null;
  // Only process the input if the user actually wrote something. Otherwise ignore
  if (str) {
    // Codify the unique strings that identify the unique questions allowed to be asked
    const ALLOWED_INPUTS = Object.keys(cli.responders);

    // Go through the possible inputs, emit an event when a match is found

    let matchFound = false;
    const counter = 0;
    ALLOWED_INPUTS.some((input) => {
      if (str.toLowerCase().indexOf(input) > -1) {
        matchFound = true;
        // Emit and event matching the unique input, and include the full string given
        e.emit(input, str);
        return true;
      }
    });

    // If no match is found, tell the user to try again
    if (!matchFound) {
      console.log("Sorry, try again");
    }
  }
};

// Init script
cli.init = function () {
  // Send the start message to the console, in dark blue
  console.log(colors().darkBlue, "The CLI is running");

  // Start the interface
  const _interface = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "> ",
  });

  // Create an initial prompt
  _interface.prompt();

  // Handle each line of input separately
  _interface.on("line", (str) => {
    // Send to the input processor
    cli.proccesInput(str);

    // Re-initialize the prompt afterwards
    _interface.prompt();
  });

  // If the user stops the CLI, kill the associated process
  _interface.on("close", () => {
    process.exit(0);
  });
};

// Export the module
module.exports = cli;
