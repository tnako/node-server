/*jslint node:true,es5:true*/

(function() {
  "use strict";

  var Logger = require('./logger'),
    ArgumentParser = require('argparse').ArgumentParser,
    fs = require('fs'),
    Args = module.exports,
    conf_path = './server_conf.json';

  function checkArguments(POSServer) {
    var parser, args;
    parser = new ArgumentParser({
      version: POSServer.version,
      addHelp: true,
      description: 'Server',
      epilog: 'Example:  %(prog)s -s "127.0.0.1"',
      prog: 'node Launcher.js',
      usage: '%(prog)s <args>'
    });

    /*
    // ToDo: добавить привязку к хосту
    parser.addArgument(['-s', '--server'], {
        help: 'Адрес для открытия портов, по умолчанию 127.0.0.1'
    });
    */

    parser.addArgument(['-c', '--conf'], {
      help: 'Config file path, by default "./server_conf.json"'
    });

    parser.addArgument(['-w', '--wsPort'], {
      help: 'Порт для WebSockets, по умолчанию 8052'
    });

    parser.addArgument(['-l', '--logFileName'], {
      help: 'Файл для сохранения журнала'
    });

    parser.addArgument(['-n', '--numCPUs'], {
      help: 'Максимальное количество потоков для задачи'
    });

    parser.addArgument(['-a', '--SQL_host'], {
      help: 'Адрес для подключения к БД'
    });

    parser.addArgument(['-m', '--SQL_limit'], {
      help: 'Количество подключений к БД'
    });

    parser.addArgument(['-u', '--SQL_user'], {
      help: 'Пользователь для подключения к БД'
    });

    parser.addArgument(['-p', '--SQL_password'], {
      help: 'Пароль для подключения к БД'
    });

    parser.addArgument(['-d', '--SQL_database'], {
      help: 'Название БД для подключения'
    });

    parser.addArgument(['-e', '--memcheck'], {
      help: 'Включает режим создания дампов памяти, значение в минутах'
    });

    args = parser.parseArgs();

    if (args.conf !== undefined && args.conf !== null) {
      conf_path = args.conf;
    }

    if (args.server !== undefined && args.server !== null) {
      POSServer.NetWork.host = args.server;
    }

    if (args.wsPort !== undefined && args.wsPort !== null) {
      POSServer.NetWork.wsPort = args.wsPort;
    }

    if (args.logFileName !== undefined && args.logFileName !== null) {
      POSServer.logFileName = args.logFile;
    }

    if (args.numCPUs !== undefined && args.numCPUs !== null) {
      POSServer.numCPUs = args.numCPUs;
    }

    if (args.SQL_host !== undefined && args.SQL_host !== null) {
      POSServer.MariaServer.host = args.SQL_host;
    }

    if (args.SQL_limit !== undefined && args.SQL_limit !== null) {
      POSServer.MariaServer.connectionLimit = args.SQL_limit;
    }

    if (args.SQL_user !== undefined && args.SQL_user !== null) {
      POSServer.MariaServer.user = args.SQL_user;
    }

    if (args.SQL_password !== undefined && args.SQL_password !== null) {
      POSServer.MariaServer.password = args.SQL_password;
    }

    if (args.SQL_database !== undefined && args.SQL_database !== null) {
      POSServer.MariaServer.database = args.SQL_database;
    }

    if (args.memcheck !== undefined && args.memcheck !== null && args.memcheck > 0) {
      var heapdump = require('heapdump');
      setInterval(function(){
        heapdump.writeSnapshot('./' + Date.now() + '.heapsnapshot');
      }, args.memcheck * 60000);
    }

  }

  function saveConfig(POSServer) {
    fs.writeFile(conf_path, JSON.stringify(POSServer));
  }

  function loadConfig(POSServer) {
    if (fs.statSync(conf_path).isFile()) {
      var conf_data = JSON.parse(fs.readFileSync(conf_path));
      for (var prop in conf_data) {
        POSServer[prop] = conf_data[prop];
      }
    } else {
      Logger.warn("[Args] No conf file", conf_path);
    }
  }

  Args.checkArguments = checkArguments;
  Args.saveConfig = saveConfig;
  Args.loadConfig = loadConfig;
}());
