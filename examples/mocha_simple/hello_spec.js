import { expect } from '/node_modules/chai/index.js';

const { describe, it } = globalThis;

describe('hello', function(){
    it('should say hello', function(){
        expect(hello()).to.equal('hello world');
    });
    it('should say hello to person', function(){
        expect(hello('Bob')).to.equal('hello Bob');
    });
});

mocha.run();
