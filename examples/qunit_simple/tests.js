QUnit.test('says hello world', function(assert){
    assert.equal(hello(), 'hello world', 'should equal hello world');
});

QUnit.test('says hello to person', function(assert){
    assert.equal(hello('Bob'), 'hello Bob', 'should equal hello Bob');
});

