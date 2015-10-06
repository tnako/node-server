/*jslint node:true,es5:true*/

(function () {
    "use strict";

    var Logger = require('./logger'),
        SQL = require('./sql'),
        cluster = require('cluster'),
        Monitor = module.exports,
        data = {};

    var query = "INSERT IGNORE INTO `monitoring` (`dttm`, `programm`, `worker`, `type`, `function`, `maxValue`, `minValue`, `counter`, `sumValue`) VALUES (NOW(), 'Challenge', ?, ?, ?, ?, ?, ?, ?);";

    function save(func, action, value) {
        if (data[func] === undefined) {
            data[func] = {};
        }
        if (data[func][action] === undefined) {
            data[func][action] = {};
        }

        var param = data[func][action];

        if (value != value) { // NaN hack
            value = 0;
        }
        if (param.maxValue == param.maxValue && (param.maxValue === undefined || value > param.maxValue)) {
            param.maxValue = value;
        }

        if (param.minValue == param.minValue && (param.minValue === undefined || value < param.minValue)) {
            param.minValue = value;
        }

        if (param.counter === undefined) {
            param.counter = 1;
        } else {
            param.counter++;
        }

        if (param.sumValue === undefined || param.sumValue != param.sumValue) {
            param.sumValue = value;
        } else {
            param.sumValue += value;
        }
    }

    setInterval(function () {
        var types = Object.keys(data);
        if (types.length !== 0) {
            types.forEach(function (type) {
                var funcs = Object.keys(data[type]);
                if (funcs.length !== 0) {
                    funcs.forEach(function (func) {
                        if (data[type][func].maxValue != data[type][func].maxValue) {
                            data[type][func].maxValue = 0;
                        }
                        if (data[type][func].minValue != data[type][func].minValue) {
                            data[type][func].minValue = 0;
                        }
                        var workerId = cluster.worker.id
                        if (!workerId) {
                            workerId = 0;
                        }
                        var params = [
                            workerId,
                            type,
                            func,
                            data[type][func].maxValue,
                            data[type][func].minValue,
                            data[type][func].counter,
                            data[type][func].sumValue
                        ];
                        new SQL.Query(query, params, function (err) {
                            if (err) {
                                Logger.error('[Monitor]:', 'query', err);
                                if (typeof data != 'undefined' && typeof data[type] != 'undefined' && typeof data[type][func] != 'undefined') {
                                    Logger.info('[Monitor]', type, func,
                                        data[type][func].maxValue,
                                        data[type][func].minValue,
                                        data[type][func].counter,
                                        data[type][func].sumValue);
                                }
                            }
                        });
                    });
                }
            });
            data = {};
        }
    }, 1000 * 60 * 6);

    Monitor.save = save;
}());
