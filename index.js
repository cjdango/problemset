'use strict';

const lib = require('./lib/lib');
const events = require('events');


const doAsync = async items => {
  for (const item of items) {
    if (!Array.isArray(item)) {
      await lib.asyncOp(item);
    } else {
      await Promise.all(item.map(element => lib.asyncOp(element)));
    }
  }
};


class RandStringSource extends events.EventEmitter {
  #remainder = '';

  constructor(randStream) {
    super();
    this._listen(randStream);
  }

  _listen(randStream) {
    randStream.on('data', chunk => {
      this._emitData(chunk);
    });
  }

  _emitData(chunk) {
    let payload = '';
    let emitCount = 0;

    for (const char of chunk) {

      // Encontered dot? Possible emit
      if (char === '.') {

        // Emit only if either payload or remainder is not empty.
        if (payload || this.#remainder) {

          // If this is gonna be the first emit for this chunk,
          // then prepend remainder to the payload before emitting
          if (emitCount === 0) {
            this.emit('data', this.#remainder + payload);
          }
          else {
            this.emit('data', payload);
          }

          // Reset remainder and payload for every emit
          this.#remainder = '';
          payload = '';

          emitCount++;
        }
      }
      // No emit needed, just append char
      // to payload for next emit's use
      else {
        payload += char;
      }

    }

    this.#remainder += payload;
  }

}


class ResourceManager {
  #resources = [];
  #callbacks = [];

  constructor(count) {
    this._createResources(count);
  }

  _createResources(resourceCount) {
    for (let idx = 0; idx < resourceCount; idx++) {
      const newResource = new Resource(idx);

      newResource.on('release', () => {
        const oldestCallback = this.#callbacks.shift();
        this._runCallback(oldestCallback, newResource);
      });

      this.#resources.push(newResource);
    }
  }

  _getResource() {
    return this.#resources.find(res => res.isReleased());
  }

  _runCallback(callback, resource) {
    if (callback) {
      resource.borrow();
      callback(resource);
    }
  }

  borrow(callback) {
    const res = this._getResource();

    // If available resource found
    if (res) {
      this._runCallback(callback, res);
    }
    // If all resources are being borrowed, queue.
    else {
      this.#callbacks.push(callback)
    }
  }
}

class Resource extends events.EventEmitter {
  #borrowed = false;

  constructor(idx) {
    super();
    this.idx = idx;
  }

  release() {
    this.#borrowed = false;
    this.emit('release');
  }

  borrow() {
    this.#borrowed = true;
  }

  isReleased() {
    return !this.#borrowed;
  }

}
