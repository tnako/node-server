/*jslint node:true,es5:true*/

function Server(service) {
    "use strict";

    this.EventEmitter = require("events").EventEmitter;
    this.Async = require('async');
    this.Logger = require('./logger');
    this.SQL = require('./sql');
    this.Monitor = require('./monitoring');
    this.Net = require('./net');
    this.Server = new this.EventEmitter();
    this.serverObj = {
        name: 'unknown'
    };

    if (typeof service !== undefined && service) {
        this.serverObj = service;
    } else {
        this.Logger.warn('[' + this.serverObj.name + '] Плохое имя для сервиса');
    }
}


module.exports = Server;
