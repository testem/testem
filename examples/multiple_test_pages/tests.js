for (var i = 0; i < 200; i++) {
  if (window.location.search === '?batch=1') {
    QUnit.test('says hello world', function(assert){
        assert.equal(hello(), 'hello world', 'should equal hello world');
    });
  } else {
    QUnit.test('says hello to person', function(assert){
        assert.equal(hello('Bob'), 'hello Bob', 'should equal hello Bob');
    });
  }
}
