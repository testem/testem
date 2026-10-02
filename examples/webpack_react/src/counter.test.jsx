import { act } from 'react';
import { expect } from 'chai';
import { render } from '@testing-library/react';
import { Counter } from './counter.jsx';

const { describe, it } = globalThis;

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Counter', () => {
  it('starts at 0', () => {
    const { getByRole } = render(<Counter />);
    expect(getByRole('button').textContent).to.equal('Count: 0');
  });

  // A DOM click, not user-event. user-event waits on setTimeout between
  // pointer events, and Headless Firefox on Windows sometimes does not
  // deliver that before Mocha's 2s limit. The sibling react_simple example
  // uses the same click and stays at a few milliseconds on that runner.
  it('increments on click', async () => {
    const { getByRole } = render(<Counter />);
    const button = getByRole('button', { name: 'Count: 0' });
    await act(() => {
      button.click();
    });
    expect(button.textContent).to.equal('Count: 1');
  });
});
