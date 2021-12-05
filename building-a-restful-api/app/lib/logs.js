/**
 * Library for storing and rotating logs
 *
 */

// Depedencies
const fs = require("fs");
const path = require("path");
const zLib = require("zlib");

// Container for the module
const lib = {};

// Global variables
const EXT_COMPRESSED_FILES = "gz.b64";

// Base directory of the data folder
lib.baseDir = path.join(__dirname, "/../.logs");

// Append a string to a file. Crete the file if it does not exist.
lib.append = function (file, str, callback) {
  const PATH = `${lib.baseDir}/${file}.log`;

  if (!fs.existsSync(lib.baseDir)) {
    fs.mkdirSync(lib.baseDir, { recursive: true });
  }

  // Open the file for appending
  fs.open(PATH, "a", (err, fileDescriptor) => {
    if (!err && fileDescriptor) {
      // Append to the file and close it
      fs.appendFile(fileDescriptor, str + "\n", (err) => {
        if (!err) {
          fs.close(fileDescriptor, (err) => {
            if (!err) {
              callback(null);
            } else {
              callback("Error: closing file that was being appended");
            }
          });
        } else {
          callback("Error: appending to file");
        }
      });
    } else {
      callback("Could not open the file for appending");
    }
  });
};

// List all the logs, and optionally include the compressed logs
lib.list = function (includeCompressedLogs = true, callback) {
  fs.readdir(lib.baseDir, (err, data) => {
    if (!err && Array.isArray(data) && data.length > 0) {
     

      const trimmedFileNames = [];
      data.forEach((fileName) => {
        // Add the .log files
        if (fileName.indexOf(".log") > -1) {
          trimmedFileNames.push(fileName.replace(".log", ""));
        }

        // Add on the .gz files
        if (
          fileName.indexOf(`.${EXT_COMPRESSED_FILES}`) > -1 &&
          includeCompressedLogs
        ) {
          trimmedFileNames.push(fileName.replace(`.${EXT_COMPRESSED_FILES}`, ""));
        }
      });

      callback(null, trimmedFileNames);
    } else {
      callback(err, data);
    }
  });
};

// Compress the contents of one .log file into a .gb.b64 file within the same directory
lib.compress = function (logId, newFileId, callback) {
  const sourceFile = `${logId}.log`;
  const destFile = `${newFileId}.${EXT_COMPRESSED_FILES}`;

  const finalSourcePath = `${lib.baseDir}/${sourceFile}`;
  const finalDestPath = `${lib.baseDir}/${destFile}`;
  // Read the source file
  fs.readFile(finalSourcePath, "utf8", (err, inputString) => {
    if (!err && inputString) {
      // Compress the data using gzip
      zLib.gzip(inputString, (err, buffer) => {
        if (!err && buffer) {
          // Send the new compressed data to the destination file
          fs.open(finalDestPath, "wx", (err, fileDescriptor) => {
            if (!err && fileDescriptor) {
              // Write to the destination file
              fs.writeFile(fileDescriptor, buffer.toString("base64"), (err) => {
                if (!err) {
                  // Close the destionation file
                  fs.close(fileDescriptor, (err) => {
                    if (!err) {
                      callback(null);
                    } else {
                      callback(err);
                    }
                  });
                } else {
                  callback(err);
                }
              });
            } else {
              callback(err);
            }
          });
        } else {
          callback(err);
        }
      });
    } else {
      callback(err);
    }
  });
};

// Decompress the contents of a .gz.b64 file into a string variable
lib.decompress = function (fileId, callback) {
  const fileName = `${fileId}.${EXT_COMPRESSED_FILES}`
  const pathFile = `${lib.baseDir}/${fileName}`
  fs.readFile(pathFile, 'utf8', (err, str)=>{
    if (!err && str) {
      // Decompress the data
      const inputBuffer = Buffer.from(str, 'base64')
      zLib.unzip(inputBuffer, (err, outputBuffer)=>{
        if (!err && outputBuffer) {
          // Callback
          const strCallback = outputBuffer.toString() 
          callback(null, strCallback)
        }else{
          callback(err)
        }
      })
    } else {
      callback(err)
    }
  })
}

// Truncate a log file
 lib.truncate = function (logId, callback) {
   const pathToTruncate = `${lib.baseDir}/${logId}.log`
   fs.truncate(pathToTruncate,0,(err)=>{
     if (!err) {
       callback(null)
     } else {
       callback(err)
     }
   })
 }

// Export de module
module.exports = lib;
