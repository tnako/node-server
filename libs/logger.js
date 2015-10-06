/*jslint node:true,es5:true*/

(function () {
    "use strict";

    var fs = require("fs"),
        util = require("util"),
        cluster = require('cluster'),
        EventEmitter = require("events").EventEmitter,
        Logger = module.exports = new EventEmitter(),
        logFilename = null;


    function logReplacement(level, args) {
        var message = util.format.apply(null, args),
            timestamp = new Date(),
            id = (cluster.worker === undefined || cluster.worker === null ? 0 : cluster.worker.id),
            timestampString = '[' + timestamp.toISOString() + '] [wid: ' + id + '] ' + level + ': ' + message + '\n';

        if (logFilename) {
            try {
                fs.appendFileSync(logFilename, timestampString);
            } catch (e) {
                process.stdout.write('Не могу записать в файл: ' + e.stack);
            }
        } else {
            process.stdout.write(timestampString);
        }

        Logger.emit("log", level, timestamp, message);
    }

    function log() {
        logReplacement("log", arguments);
    }

    function info() {
        logReplacement("info", arguments);
    }

    function warn() {
        logReplacement("warn", arguments);
    }

    function error() {
        logReplacement("error", arguments);
    }

    function remapConsole() {
        console.log = log;
        console.info = info;
        console.warn = warn;
        console.error = error;
    }

    function setLogFilename(filename) {
        logFilename = filename;
    }

    Logger.log = log;
    Logger.info = info;
    Logger.warn = warn;
    Logger.error = error;
    Logger.remapConsole = remapConsole;
    Logger.setLogFilename = setLogFilename;

}());
