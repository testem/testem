import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { expect } from '/node_modules/chai/index.js';
import { Counter } from './counter.js';

const { afterEach, describe, it } = globalThis;

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function render(element) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  return {
    container,
    async mount() {
      await act(() => {
        root.render(element);
      });
    },
    async unmount() {
      await act(() => {
        root.unmount();
      });
      container.remove();
    }
  };
}

describe('Counter', function() {
  let view;

  afterEach(async function() {
    if (view) {
      await view.unmount();
      view = null;
    }
  });

  it('starts at 0', async function() {
    view = render(createElement(Counter));
    await view.mount();
    expect(view.container.querySelector('button').textContent).to.equal('Count: 0');
  });

  it('increments on click', async function() {
    view = render(createElement(Counter));
    await view.mount();
    await act(() => {
      view.container.querySelector('button').click();
    });
    expect(view.container.querySelector('button').textContent).to.equal('Count: 1');
  });
});

mocha.run();
