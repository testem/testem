import { expect } from 'chai';
import { hello } from './hello.js';

const { describe, it } = globalThis;

describe('hello', () => {
  it('includes name', () => {
    expect(hello('vite')).to.equal('hello vite');
  });

  it('defaults when no name', () => {
    expect(hello()).to.equal('hello world');
  });
});

mocha.run();
