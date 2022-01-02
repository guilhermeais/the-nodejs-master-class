/**
 *  CLI-Related Taks
 */

// Dependencies
const readline = require("readline");
const debug = require("util").debuglog("cli");
const Events = require("events");
const { colors } = require("./helpers");
class _events extends Events {
  constructor() {
    super();
  }
}
const e = new _events();

// Instantiate the CLI module object
const cli = {};

// Responders object
cli.responders = {
  man: () => {},
  help: () => {},
  exit: function () {
   process.exit(0)
  },
  stats: function () {
    console.log("You asked for stats");
  },

  "list users": function () {
    console.log("You asked for list users");
  },
  "more user info": function (str) {
    console.log("You asked for more user info", str);
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
  console.log("You asked for help");
};
cli.responders.man = cli.responders.help;

// Input handlers
const possibleInputs = Object.keys(cli.responders);
for (const eventKey of possibleInputs) {
  if (possibleInputs.includes(eventKey)) {
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
  console.log(colors.darkBlue, "The CLI is running");

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
