import { Model } from "./model.js";

/*
view.js
==========

View is the base class for dev-reporter view-models.
State lives on Model attributes via get and set.
observe and destroy attach that state to the terminal-kit widgets.
*/

export default class View extends Model {
  observe(model, thing, handler) {
    const eventMap = typeof thing === 'string' ? { [thing]: handler } : thing;
    for (const event in eventMap) {
      model.on(event, eventMap[event]);
    }
    if (!this.observers) {
      this.observers = [];
    }
    this.observers.push([model, eventMap]);
  }

  destroy() {
    this.removeObservers();
  }

  removeObservers() {
    if (!this.observers) {
      return;
    }
    this.observers.forEach(function(observer) {
      const model = observer[0];
      const eventMap = observer[1];
      for (const event in eventMap) {
        model.off(event, eventMap[event]);
      }
    });
  }
}
