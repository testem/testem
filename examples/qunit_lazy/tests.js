QUnit.test('says hello world', function(assert){
    assert.equal(hello(), 'hello world', 'should equal hello world');
});

QUnit.test('says hello to person', function(assert){
    assert.equal(hello('Bob'), 'hello Bob', 'should equal hello Bob');
});

QUnit.todo('failing todo', function(assert){
    assert.ok(false, 'should be true');
});

// This will cause integration tests to fail because QUnit will report passing todos
// as failures (since you should just mark them as a normal test if they pass).
// QUnit.todo('passing todo', function(assert){
//     assert.ok(true, 'should be true');
// });
