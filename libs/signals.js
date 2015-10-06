/*jslint node:true,es5:true*/

(function () {
    "use strict";

    var EventEmitter = require("events").EventEmitter,
        Logger = require('./logger'),
        Signals = module.exports = new EventEmitter();

    function init() {
        function signalsParser(type) {
            Logger.warn('Получен сигнал: %s', type);
            Signals.emit('signal', type);
        }

        process.on('SIGINT', function () {
            signalsParser('SIGINT');
        });
        process.on('SIGQUIT', function () {
            signalsParser('SIGQUIT');
        });
    }

    Signals.init = init;
}());