/*jslint node:true,es5:true,nomen:true*/

(function () {
    "use strict";

    var Logger          = require('./logger'),
        EventEmitter    = require("events").EventEmitter,
        Net             = module.exports = new EventEmitter(),
        WebSocketServer = require('ws').Server,
        Monitor          = require('./monitoring'),
        Wss,
        connectionsCounter = 0;


    function start(POSServer) {
        var NetWork = POSServer.NetWork;

        // start ws server
        Wss = new WebSocketServer({
            port: NetWork.wsPort
        });

        Wss.on('connection', function (ws) {
            Logger.log('[Net] Новое подключение от', ws._socket.remoteAddress);
            Monitor.save('Net', 'connection', ++connectionsCounter);
            ws.on('message', function (message) {
                try {
                    message = JSON.parse(message);
                } catch (e) {
                    Net.send(ws, JSON.stringify({
                        name: "Net",
                        action: 'error',
                        data: 101
                    }));
                    return;
                }

                if (!message.name || !message.action) {
                    Logger.warn('[Net] Неизвестное сообщение', message);
                    return;
                }

                message.ip = ws._socket.remoteAddress;
                message.ws = ws;

                Net.emit('request', message);
            });
            ws.on('error', function (e) {
                Logger.warn('[Net] ошибка ws', e);
            });
            ws.on('close', function (reasonCode, description) {
                var addr = (ws._socket && ws._socket._peername && ws._socket._peername != undefined)
                    ? ws._socket._peername.address
                    : '';
                Logger.log('[Net] ' + addr + ' отключился.', reasonCode, description);
                Monitor.save('Net', 'close', --connectionsCounter); // ToDo: get all current connections
            });
        }).on('error', function(error) {
            Logger.error('[Net] WebSocketServer error:', error);
        });

    }

    function send(ws, message, binary) {
        if (ws.readyState === 1) {
          if (binary) {
            ws.send(message, { binary: true, mask: true });
          } else {
            ws.send(message);
          }
        }
    }

    function sendError(ws, name, code) {
        if (ws.readyState === 1) {
          if (code === undefined) code = 101;
          ws.send(JSON.stringify({
              name: name,
              action: 'error',
              data: code
          }));
        }
    }

    Net.start = start;
    Net.send = send;
    Net.sendError = sendError;
}());
