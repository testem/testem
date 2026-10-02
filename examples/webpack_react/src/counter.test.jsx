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

  // Do not await act(). The await waits on a macrotask, and Headless
  // Firefox on Windows sometimes does not run that task before Mocha's
  // 2s limit. The state update is already flushed before act() returns.
  it('increments on click', () => {
    const { getByRole } = render(<Counter />);
    const button = getByRole('button', { name: 'Count: 0' });
    act(() => {
      button.click();
    });
    expect(button.textContent).to.equal('Count: 1');
  });
});
