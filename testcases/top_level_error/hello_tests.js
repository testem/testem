/*test('says hello world', function(){
    equal(hello(), 'hello world', 'should equal hello world');
});

test('says hello to person', function(){
    equal(hello('Bob'), 'hello Bob', 'should equal hello Bob');
});

*/
for (var i = 0; i < 10; i++)
    console.log('hello world')
describe('hello', function(){
    it('should say hello', function(){
        expect(hello()).toBe('hello world');
        waits(200);
    });
    it('should say hello to person', function(){
        expect(hello('Bob')).toBe('hello Bob');
        waits(200);
    });
});