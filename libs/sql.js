/*jslint node:true,es5:true*/

(function () {
    "use strict";

    var EventEmitter = require("events").EventEmitter,
        Logger = require('./logger'),
        maria = require('mysql2'),
        SQL = module.exports = new EventEmitter(),
        pool;


    function createPool(MariaServer) {
        pool = maria.createPool({
            connectionLimit: MariaServer.connectionLimit,
            host: MariaServer.host,
            user: MariaServer.user,
            password: MariaServer.password,
            database: MariaServer.database,
            dateStrings: true,
            supportBigNumbers: true
        });
    }

    function Transaction(callback) {
        var self = this;
        self.callback = callback;
        self.connection = null;

        if (typeof pool === undefined) {
            Logger.error('[SQL] Вначале необходимо создать pool БД');
            SQL.emit('error');
        }

        pool.getConnection(function (err, conn) {
            if (err) {
                Logger.error('[SQL] Ошибка получения соединения: ' + err.message);
                SQL.emit('error');
            }

            if (conn.myLockTransaction) {
                Logger.error('[SQL] Ошибка получения соединения: соединение уже используется транзакцией');
                SQL.emit('error');
            }

            conn.beginTransaction(function (err) {
                if (err) {
                    Logger.error('[SQL] Не удалось начать транзакцию: ' + err.message);
                    conn.release();
                    SQL.emit('error');
                }

                self.connection = conn;
                conn.myLockTransaction = true;
                self.callback();
            });
        });
    }

    function Query(sql, values, callback) {
        var self = this;
        self.callback = callback;
        self.connection = null;

        if (typeof pool === undefined) {
            Logger.error('[SQL] Вначале необходимо создать pool БД');
            SQL.emit('error');
        }

        pool.getConnection(function (err, conn) {
            if (err) {
                Logger.error('[SQL] Ошибка получения соединения: ' + err.message);
                SQL.emit('error');
            }

            self.connection = conn;
            for(var i = 0; i < values.length; ++i) {
                if (typeof values[i] === undefined) {
                    values[i] = '';
                    Logger.error("[SQL] param err", sql, values, i);
                    values[i] = null;
                }
            }
            try {
                conn.execute(sql, values, function (err, results) {
                    self.connection.release();
                    self.callback(err, results);
                });
            } catch(e) {
                Logger.error("[SQL] exec err", sql, values, e);
            }
        });
    }

    Transaction.prototype.query = function (sql, values, callback) {
        if (typeof sql === undefined || sql.length === 0) {
            callback('Нету запроса');
            return;
        }

        if (!this.connection) {
            callback('Нету подключения');
            return;
        }

        for(var i = 0; i < values.length; ++i) {
            if (values[i] === undefined) {
                values[i] = null;
                Logger.error("[SQL] param err", sql, values, i);
            }
        }
        try {
            this.connection.execute(sql, values, callback);
        } catch(e) {
            Logger.error("[SQL] exec tx err", sql, values, e);
        }
    };

    Transaction.prototype.done = function (valid) {
        if (!this.connection) {
            Logger.warn('[SQL][Transaction][done] Вызов без соединения');
            return;
        }

        this.connection.myLockTransaction = false;

        this.connection.release();

        if (valid) {
            this.connection.commit(function (err) {
                if (err) {
                    Logger.error('[SQL] Ошибка окончания транзакции: ' + err.message);
                    SQL.emit('error');
                }
            });
        } else {
            this.connection.rollback();
        }
    };

    SQL.createPool = createPool;
    SQL.Transaction = Transaction;
    SQL.Query = Query;

}());
