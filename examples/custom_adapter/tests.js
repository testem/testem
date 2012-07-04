/*global test, assert, hello*/

test('say hello', function() {
    assert(hello() === 'hello world', 'should equal hello world')
})
