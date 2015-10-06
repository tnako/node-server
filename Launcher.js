/*jslint node:true,es5:true*/

(function() {
    "use strict";

    var Logger    = require('./libs/logger'),
        Args      = require('./libs/arguments'),
        SQL       = require('./libs/sql'),
        Signals   = require('./libs/signals'),
        Net       = require('./libs/net'),
        cluster   = require('cluster'),
        os        = require('os'),
        CHServer = {version: 'v15.10'},
        workers   = {};


    function exit() {
        process.exit(0);
    }

    function uncaughtExceptionHandler() {
        var args = Array.prototype.slice.call(arguments, 0);
        args = args.map(function(arg) {
            return arg instanceof Error ? arg.stack : arg;
        });
        args.unshift('[Launcher] Получено прерывание, выходим.');
        Logger.error.apply(null, args);
        exit();
    }

    function launch(i) {
        CHServer.activeWorkers.forEach(function(key) {
            workers[key] = require(CHServer.workerDir + key);
            workers[key].init(CHServer);
        });

        Net.on('request', function(message) {
            var obj = workers[message.name];

            if (obj === undefined) {
                Logger.warn('[Launcher] Нету worker', message.name);
                Net.send(message.ws, JSON.stringify({
                    name: message.name,
                    action: 'error',
                    data: 401
                }));
                return;
            }

            if (!message.ws.pos_model && message.name != "Hello") {
                Logger.warn('[Launcher] Нету функции (login fail)', message.name);
                Net.send(message.ws, JSON.stringify({
                    name: message.name,
                    action: 'error',
                    data: 401
                }));
                return;
            }

            var action = workers[message.name][message.action];

            if (action === undefined) {
                Logger.warn('[Launcher] Нету действия', message.name, message.action);
                Net.send(message.ws, JSON.stringify({
                    name: message.name,
                    action: 'error',
                    data: 402
                }));
                return;
            }

            workers[message.name][message.action](message);

        }).on('error', function(err) {
            Logger.warn('[Launcher] caught net error', err);
        });

        Net.start(CHServer);
    }

    exports.launch = launch;
    exports.exit = exit;

    Args.checkArguments(CHServer);
    Args.loadConfig(CHServer);
    console.log(CHServer);

    process.on("uncaughtException", uncaughtExceptionHandler);
    process.on('exit', function(code) {
        Logger.info('Bye bye:', code);
    });

    if (CHServer.logFileName !== undefined && CHServer.logFileName !== null && CHServer.logFileName.length > 0) {
        Logger.setLogFilename(CHServer.logFileName);
    }
    Logger.remapConsole();

    Signals.init();
    Signals.on('signal', exit);

    SQL.createPool(CHServer.MariaServer);
    SQL.on('error', function(e) {
        Logger.warn('[Launcher] sql error', e);
        exit();
    });

    if (CHServer.numCPUs < 2) {
      launch(0);
    } else {
      if (cluster.isMaster) {
          var params = { };
          var wCount = CHServer.numCPUs;

          for (var i = 1; i <= wCount; i++) {
              params['WORKER_ID'] = i;
              cluster.fork(params);
          }

          cluster.on('exit', function(worker, code, signal) {
              Logger.warn('[Launcher] worker ' + worker.process.pid + ' died');
              var worker = cluster.fork(process.env);

              // Note the process IDs
              var newPid = worker.process.pid;
              Logger.info('[Launcher] worker ' + newPid + ' created');
          });
      } else {
          launch(i);
      }
    }

}());
