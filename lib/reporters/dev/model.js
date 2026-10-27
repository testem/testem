/**
 * Observable attribute bag for the dev reporter.
 *
 * A later TypeScript port can turn this into
 * `Model<Attrs extends Record<string, unknown>>` with
 * `get<K extends keyof Attrs>(key: K): Attrs[K]`.
 *
 * @template {Record<string, unknown>} [Attrs=Record<string, unknown>]
 */
export class Model {
  /**
   * @param {Partial<Attrs>} [attrs]
   */
  constructor(attrs = /** @type {Partial<Attrs>} */ ({})) {
    /** @type {Map<string, Set<Function>>} */
    this.listeners = new Map();
    /** @type {Attrs} */
    this.attributes = /** @type {Attrs} */ ({ ...attrs });
  }

  /**
   * @template {keyof Attrs} K
   * @param {K} key
   * @returns {Attrs[K]}
   */
  get(key) {
    return this.attributes[key];
  }

  /**
   * @param {string | Partial<Attrs>} key
   * @param {unknown} [value]
   * @param {{ silent?: boolean }} [options]
   * @returns {this}
   */
  set(key, value, options) {
    /** @type {Partial<Attrs>} */
    let attrs;
    /** @type {{ silent?: boolean }} */
    let opts;
    if (key !== null && typeof key === 'object') {
      attrs = /** @type {Partial<Attrs>} */ (key);
      opts = /** @type {{ silent?: boolean }} */ (value || {});
    } else {
      attrs = /** @type {Partial<Attrs>} */ ({ [key]: value });
      opts = options || {};
    }

    const changed = [];
    for (const attr of Object.keys(attrs)) {
      const next = attrs[attr];
      if (Object.is(this.attributes[attr], next)) {
        continue;
      }
      this.attributes[attr] = next;
      changed.push(attr);
    }

    if (!opts.silent && changed.length > 0) {
      for (const attr of changed) {
        this.trigger('change:' + attr, this, this.attributes[attr], opts);
      }
      this.trigger('change', this, opts);
    }
    return this;
  }

  /**
   * @param {string} name Space-separated event names are each registered.
   * @param {Function} callback
   * @returns {this}
   */
  on(name, callback) {
    return listen(this, name, callback);
  }

  /**
   * @param {string} name
   * @param {Function} callback
   * @returns {this}
   */
  off(name, callback) {
    return unlisten(this, name, callback);
  }

  /**
   * @param {string} name
   * @param {Function} callback
   * @returns {this}
   */
  once(name, callback) {
    const wrapped = (...args) => {
      this.off(name, wrapped);
      callback(...args);
    };
    return this.on(name, wrapped);
  }

  /**
   * @param {string} name
   * @param {...unknown} args
   * @returns {this}
   */
  trigger(name, ...args) {
    return emit(this, name, args);
  }
}

/**
 * Ordered list of models. Plain objects are wrapped; an existing {@link Model} is kept.
 *
 * @template {Model} [T=Model]
 */
export class Collection {
  /**
   * @param {Array<Partial<Record<string, unknown>> | T>} [models]
   * @param {{ model?: new (attrs?: object) => T }} [options]
   */
  constructor(models = [], options = {}) {
    /** @type {Map<string, Set<Function>>} */
    this.listeners = new Map();
    /** @type {new (attrs?: object) => T} */
    this.Model = options.model || /** @type {new (attrs?: object) => T} */ (Model);
    /** @type {T[]} */
    this.models = [];
    for (const item of models) {
      this._insert(item, true);
    }
  }

  /** @returns {number} */
  get length() {
    return this.models.length;
  }

  /**
   * @param {number} index
   * @returns {T | undefined}
   */
  at(index) {
    return this.models[index];
  }

  /**
   * @param {Partial<Record<string, unknown>> | T} item
   * @returns {T}
   */
  push(item) {
    return this._insert(item, false);
  }

  /**
   * @param {Partial<Record<string, unknown>> | T} item
   * @returns {T}
   */
  add(item) {
    return this.push(item);
  }

  /**
   * @param {T | null | undefined} model
   * @returns {this}
   */
  remove(model) {
    if (model === undefined || model === null) {
      return this;
    }
    const index = this.models.indexOf(model);
    if (index === -1) {
      return this;
    }
    this.models.splice(index, 1);
    this.trigger('remove', model, this);
    return this;
  }

  /** @returns {this} */
  reset() {
    this.models = [];
    this.trigger('reset', this);
    return this;
  }

  /**
   * @param {(model: T, index: number, models: T[]) => void} callback
   * @returns {void}
   */
  forEach(callback) {
    this.models.forEach(callback);
  }

  /**
   * @param {(model: T, index: number, models: T[]) => boolean} callback
   * @returns {T[]}
   */
  filter(callback) {
    return this.models.filter(callback);
  }

  /**
   * @template U
   * @param {(model: T, index: number, models: T[]) => U} callback
   * @returns {U[]}
   */
  map(callback) {
    return this.models.map(callback);
  }

  /**
   * @param {string} name
   * @param {Function} callback
   * @returns {this}
   */
  on(name, callback) {
    return listen(this, name, callback);
  }

  /**
   * @param {string} name
   * @param {Function} callback
   * @returns {this}
   */
  off(name, callback) {
    return unlisten(this, name, callback);
  }

  /**
   * @param {string} name
   * @param {...unknown} args
   * @returns {this}
   */
  trigger(name, ...args) {
    return emit(this, name, args);
  }

  /**
   * @param {Partial<Record<string, unknown>> | T} item
   * @param {boolean} silent
   * @returns {T}
   */
  _insert(item, silent) {
    const model = item instanceof Model ? /** @type {T} */ (item) : new this.Model(item);
    this.models.push(model);
    if (!silent) {
      this.trigger('add', model, this);
    }
    return model;
  }
}

/**
 * @param {string} name
 * @returns {string[]}
 */
function eventNames(name) {
  return String(name).split(/\s+/).filter(Boolean);
}

/**
 * @param {{ listeners: Map<string, Set<Function>> }} target
 * @param {string} name
 * @param {Function} callback
 */
function listen(target, name, callback) {
  for (const event of eventNames(name)) {
    let callbacks = target.listeners.get(event);
    if (!callbacks) {
      callbacks = new Set();
      target.listeners.set(event, callbacks);
    }
    callbacks.add(callback);
  }
  return target;
}

/**
 * @param {{ listeners: Map<string, Set<Function>> }} target
 * @param {string} name
 * @param {Function} callback
 */
function unlisten(target, name, callback) {
  for (const event of eventNames(name)) {
    const callbacks = target.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }
  return target;
}

/**
 * @param {{ listeners: Map<string, Set<Function>> }} target
 * @param {string} name
 * @param {unknown[]} args
 */
function emit(target, name, args) {
  const callbacks = target.listeners.get(name);
  if (!callbacks) {
    return target;
  }
  for (const callback of [...callbacks]) {
    callback(...args);
  }
  return target;
}
