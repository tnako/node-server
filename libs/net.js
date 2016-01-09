/*jslint node:true,es5:true,nomen:true*/

(function() {
  "use strict";

  var Logger = require('./logger'),
    EventEmitter = require("events").EventEmitter,
    Net = module.exports = new EventEmitter(),
    WebSocketServer = require('ws').Server,
    Monitor = require('./monitoring'),
    http = require('http'),
    Wss,
    connectionsCounter = 0;


  // ToDo:
  // разнести http и ws в разные прототипы

  function makeIPstr(ws) {
    var addr = ws._socket.remoteAddress + ':' + ws._socket.remotePort;
    //    var addr = (ws._socket && ws._socket._peername && ws._socket._peername != undefined) ? ws._socket._peername.address + ':' + ws._socket._peername.port : '';
    return addr
  }

  function makeIPstrhttp(socket) {
    return socket.remoteAddress + ':' + socket.remotePort
  }

  function _initWS(port) {
    // start ws server
    Wss = new WebSocketServer({
      port: port
    });

    Logger.info('WS Server ws://0.0.0.0:' + port + ' started!');

    Wss.on('connection', function(ws) {
      Logger.log('[Net] ' + makeIPstr(ws) + ' New connection');
      Monitor.save('Net', 'connection', ++connectionsCounter);
      ws.ipp = makeIPstr(ws);
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

  function _initHTTP(port) {

    var server = http.createServer().listen(port);
    Logger.info('HTTP Server http://0.0.0.0:' + port + ' started!');

    server.on('error', function(e) {
      Logger.error('[http] Server error:', e);
    });
/*
    server.on('connection', function(socket) {
      socket.ipp = makeIPstrhttp(socket);
      Logger.log('[http] ' + socket.ipp + ' New connection');
      Monitor.save('http', 'connection', ++connectionsCounter);

      socket.on('close', function() {
        Logger.log('[http] ' + socket.ipp + ' disconnected.');
        Monitor.save('http', 'close', --connectionsCounter);
      });

    })
*/
    server.on('request', function(request, response) {
      var body = ''
      request.on('data', function(data) {
        body += data
      });
      request.on('end', function() {
        try {
          //Logger.info("dsdss", body)
          var message = JSON.parse(body);
        } catch (e) {

          response.writeHead(401, {
            'Content-Type': 'text/html'
          });
          response.end();
          return
        }

        message.ws = response

        if (!message.name || !message.action) {
          Logger.warn('[http] Неизвестное сообщение', message);
          return;
        }

        if (message.action == 'init') {
          Logger.warn('[http] Somebody want to init worker', message);
          return;
        }

        if (message.ws.appdata === undefined) {
          message.ws.appdata = {};
        }

        Net.emit('request', message);
      });
    });
  }

  function start(POSServer) {
    var NetWork = POSServer.NetWork;

    if (NetWork.wsPort !== undefined && parseInt(NetWork.wsPort) > 0) {
      _initWS(parseInt(NetWork.wsPort));
    }

    if (NetWork.httpPort !== undefined && parseInt(NetWork.httpPort) > 0) {
      _initHTTP(parseInt(NetWork.httpPort));
    }
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
    } else if (ws.writeHead !== undefined) {
      ws.writeHead(200, {
        'Content-Type': 'application/json'
      });
      ws.write(message)
      ws.end();
    }
  }

  function sendError(ws, name, code) {
    if (code === undefined) code = 100;

    var buf_send = JSON.stringify({
      name: name,
      action: 'error',
      data: code
    });

    if (ws.readyState === 1) {
      ws.send(buf_send)
    } else if (ws.response !== undefined) {
      ws.response.writeHead(code, {
        'Content-Type': 'application/json'
      });
      ws.response.write(buf_send)
      ws.response.end();
    }
  }

  Net.start = start;
  Net.send = send;
  Net.sendError = sendError;
}());
