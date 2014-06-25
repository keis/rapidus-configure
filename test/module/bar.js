var rapidus = require('rapidus');

module.exports.funone = {value: 1}
module.exports.funtwo = {value: 2}
module.exports.kitchen = function (config) {
    var sink = new rapidus.Sink();
    sink.kitchen = true;
    return sink;
};
