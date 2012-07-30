var test = require('./testutils.js')
  , expect = test.expect
  , StyledString = require('../lib/styled_string.js')

describe('StyledString', function(){
    it('instantiates', function(){
        new StyledString('abc')
    })
    it('has length', function(){
        expect(new StyledString('abc').length).to.equal(3)
    })
    it('has attributes', function(){
        var s = new StyledString('abc', {foreground: 'red'})
        expect(s.attrs.foreground).to.equal('red')
    })
    it('can substring', function(){
        var s = new StyledString('abc', {foreground: 'red'})
        var s1 = s.substring(1)
        expect(s1.str).to.equal('bc')
        expect(s1.length).to.equal(2)
        expect(s1.attrs.foreground).to.equal('red')
    })
    it('can match', function(){
        var s = new StyledString('abc', {foreground: 'red'})
        expect(s.match(/bc$/)).not.to.equal(null)
    })
    it('can concat (and return a compound string)', function(){
        var s1 = new StyledString('abc', {foreground: 'red'})
        var s2 = new StyledString('def', {foreground: 'blue'})
        var s3 = s1.concat(s2)
        expect(s3.str).to.equal(null)
        expect(s3.length).to.equal(6)
        expect(s3.children).to.deep.equal([s1, s2])
    })
    it('will append more children on concat for a compound string', function(){
        var s1 = new StyledString('abc', {foreground: 'red'})
        var s2 = new StyledString('def', {foreground: 'blue'})
        var s3 = s1.concat(s2)
        var s4 = new StyledString('ghi')
        var s5 = s3.concat(s4)
        expect(s5.children).to.deep.equal([s1, s2, s4])
    })
    it('gives string', function(){
        var s = new StyledString('abc', {foreground: 'red'})
        expect(s.toString()).to.equal("\033[31mabc\033[0m")
    })
    it('gives string from compound string', function(){
        var s1 = new StyledString('abc', {foreground: 'red'})
        var s2 = new StyledString('def', {foreground: 'blue'})
        var s3 = s1.concat(s2)
        expect(s3.toString()).to.equal("\033[31mabc\033[0m\033[34mdef\033[0m")
    })
})