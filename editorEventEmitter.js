var eventEmitter = require('events');

class editorEvent {
  constructor() {
    const instance = this.constructor.instance;
    if (instance) {
      return instance;
    }

    this.constructor.instance = this;
    this.editorEmitter = new eventEmitter();
  }

  getEventEmitter() {
    return this.editorEmitter;
  }
}
exports.editorEvent = editorEvent;
