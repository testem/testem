import fs from "node:fs";
import path from "node:path";
import vm from "vm";
import { expect } from "chai";
import { fileURLToPath } from "node:url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const decycleSource = fs.readFileSync(
  path.join(__dirname, '../public/testem/decycle.js'),
  'utf8'
);

function loadDecycle() {
  const context = {};

  vm.createContext(context);
  vm.runInContext(decycleSource, context, {
    filename: 'decycle.js'
  });

  // Round-trip through JSON so results are plain objects of this realm.
  return function(object, maxDepth) {
    return JSON.parse(JSON.stringify(context.decycle(object, maxDepth)));
  };
}

// Mirrors the factory manager Proxy of Ember 2.12/2.13 debug builds, which
// throws when any property other than `class` or `create` is read.
function factoryManager() {
  const target = { class: function Foo() {}, create() {} };
  return new Proxy(target, {
    get(obj, prop) {
      if (prop !== 'class' && prop !== 'create') {
        throw new Error(`You attempted to access "${String(prop)}" on a factory manager`);
      }
      return obj[prop];
    }
  });
}

describe('decycle', function() {
  let decycle;

  beforeEach(function() {
    decycle = loadDecycle();
  });

  it('replaces cyclic references with $ref paths', function() {
    const a = { name: 'a', list: [] };
    a.self = a;
    a.list.push(a, { parent: a.list });

    expect(decycle(a)).to.deep.equal({
      name: 'a',
      list: [{ $ref: '$' }, { parent: { $ref: '$["list"]' } }],
      self: { $ref: '$' }
    });
  });

  it('stringifies DOM-like nodes', function() {
    const node = {
      nodeType: 1,
      ownerDocument: {},
      toString() {
        return '[object HTMLDivElement]';
      }
    };
    const text = { nodeType: 3, toString() { return '[object Text]'; } };

    expect(decycle([node, { child: text }])).to.deep.equal([
      '[object HTMLDivElement]',
      { child: '[object Text]' }
    ]);
  });

  it('replaces a Proxy that throws on unknown properties with a placeholder', function() {
    expect(decycle(['log', factoryManager()])).to.deep.equal([
      'log',
      '[unserializable: You attempted to access "nodeType" on a factory manager]'
    ]);
  });

  it('replaces a nested throwing Proxy and keeps its siblings', function() {
    const record = { id: 1, owner: { manager: factoryManager(), name: 'owner' } };

    expect(decycle([record])).to.deep.equal([{
      id: 1,
      owner: {
        manager: '[unserializable: You attempted to access "nodeType" on a factory manager]',
        name: 'owner'
      }
    }]);
  });

  it('handles a throwing Proxy passed as the root value', function() {
    expect(decycle(factoryManager())).to.equal(
      '[unserializable: You attempted to access "nodeType" on a factory manager]'
    );
  });

  it('replaces an own getter that throws with a placeholder', function() {
    const obj = { before: 1, after: 2 };
    Object.defineProperty(obj, 'broken', {
      enumerable: true,
      get() {
        throw new Error('nope');
      }
    });

    expect(decycle([obj])).to.deep.equal([{
      before: 1,
      broken: '[unserializable: nope]',
      after: 2
    }]);
  });

  it('handles a revoked Proxy', function() {
    const { proxy, revoke } = Proxy.revocable({}, {});
    revoke();

    const [result] = decycle([proxy]);
    expect(result).to.match(/^\[unserializable: .+\]$/);
  });
});
