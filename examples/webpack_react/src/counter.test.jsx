import { expect } from 'chai';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Counter } from './counter.jsx';

const { describe, it } = globalThis;

describe('Counter', () => {
  it('starts at 0', () => {
    const { getByRole } = render(<Counter />);
    expect(getByRole('button').textContent).to.equal('Count: 0');
  });

  it('increments on click', async () => {
    const user = userEvent.setup();
    const { getByRole } = render(<Counter />);
    await user.click(getByRole('button', { name: 'Count: 0' }));
    expect(getByRole('button').textContent).to.equal('Count: 1');
  });
});
