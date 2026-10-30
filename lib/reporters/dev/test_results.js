import { Collection, Model } from "./model.js";

function initialResults() {
  return {
    topLevelError: null,
    failed: 0,
    passed: 0,
    pending: 0,
    total: 0,
    // How many tests the framework announced it will run, or 0 if unknown.
    // Only used for progress display; `total` stays the count of results.
    planned: 0,
    tests: new Collection(),
    all: false
  };
}

export default class TestResults extends Model {
  constructor() {
    super(initialResults());
  }

  reset() {
    this.set(initialResults());
  }

  addResult(result) {
    let total = this.get('total');
    let pending = this.get('pending');
    let passed = this.get('passed');
    let failed = this.get('failed');
    total++;
    if (result.pending) {
      pending++;
    } else if ((result.failed === 0 && !result.todo) || (result.failed > 0 && result.todo)) {
      passed++;
    } else {
      failed++;
    }
    this.get('tests').push(result);
    this.set({
      total: total,
      pending: pending,
      passed: passed,
      failed: failed,
      items: result.items
    });
  }
}
