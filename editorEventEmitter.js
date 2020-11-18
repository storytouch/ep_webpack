var EventEmitter = require('events').EventEmitter;

class EditorEventEmitter extends EventEmitter {}

exports.editorEvent = new EditorEventEmitter();
