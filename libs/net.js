/*jslint node:true,es5:true,nomen:true*/

(function() {
  "use strict";

  var Logger = require('./logger'),
    EventEmitter = require("events").EventEmitter,
    Net = module.exports = new EventEmitter(),
    WebSocketServer = require('ws').Server,
    Monitor = require('./monitoring'),
    Wss,
    connectionsCounter = 0;


  function makeIPstr(ws) {
    var addr = (ws._socket && ws._socket._peername && ws._socket._peername != undefined) ? ws._socket._peername.address + ':' + message.ws._socket._peername.port : '';
    return addr
  }

  function start(POSServer) {
    var NetWork = POSServer.NetWork;

    // start ws server
    Wss = new WebSocketServer({
      port: NetWork.wsPort
    });

    Logger.info('WS Server ws://0.0.0.0:' + NetWork.wsPort + ' started!');

    Wss.on('connection', function(ws) {
      Logger.log('[Net] ' + makeIPstr(ws) + ' New connection');
      Monitor.save('Net', 'connection', ++connectionsCounter);
      ws.on('message', function(message) {
        try {
          message = JSON.parse(message);
        } catch (e) {
          Net.send(ws, JSON.stringify({
            name: 'Net',
            action: 'error',
            data: 101
          }));
          return;
        }

        message.ipp = makeIPstr(ws);
        message.ws = ws;

        if (!message.name || !message.action) {
          Logger.warn('[Net] Неизвестное сообщение', message);
          return;
        }

        if (message.action == 'init') {
          Logger.warn('[Net] Somebody want to init worker', message);
          return;
        }

        if (message.ws.appdata === undefined) {
          message.ws.appdata = {};
        }

        Net.emit('request', message);
      });
      ws.on('error', function(e) {
        Logger.warn('[Net] ошибка ws', e);
      });
      ws.on('close', function(reasonCode, description) {
        Logger.log('[Net] ' + makeIPstr(ws) + ' disconnected.', reasonCode, description);
        Monitor.save('Net', 'close', --connectionsCounter); // ToDo: get all current connections
      });
    }).on('error', function(error) {
      Logger.error('[Net] WebSocketServer error:', error);
    });

  }

  function send(ws, message, binary) {
    if (ws.readyState === 1) {
      if (binary) {
        ws.send(message, {
          binary: true,
          mask: true
        });
      } else {
        ws.send(message);
      }
    }
  }

  function sendError(ws, name, code) {
    if (ws.readyState === 1) {
      if (code === undefined) code = 100;
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
