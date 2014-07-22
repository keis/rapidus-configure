var rapidus = require('rapidus'),
    sinon = require('sinon');

module.exports.funone = {value: 1}
module.exports.funtwo = {value: 2}
module.exports.kitchen = function (config) {
    var sink = new rapidus.Sink();
    sink.kitchen = true;
    return sink;
};
module.exports.kitchenSpy = sinon.spy(module.exports.kitchen);

module.exports.processor = function (config) {
    return function (record) {
        record.processed = true;
    };
}

module.exports.spyProcessor = sinon.spy(module.exports.processor);

module.exports.logger = function (config) {
    var logger = new rapidus.Logger(config.hier, config.name);
    logger.bar = true;
    return logger;
};
