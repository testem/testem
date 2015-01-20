QUnit.test('says hello world', function(){
    equal(hello(), 'hello world', 'should equal hello world');
});

QUnit.test('says hello to person', function(){
    equal(hello('Bob'), 'hello Bob', 'should equal hello Bob');
});

