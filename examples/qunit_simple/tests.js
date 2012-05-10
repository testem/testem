module('Module A') 
test('validate phone #', function(){
    ok(validatePhone('770 123 4567'), 'basic')
})

test('no non-numbers', function(){
    equal(false, validatePhone('a'), "letter")
    equal(false, validatePhone('?'), "question mark")
})

module('Module B')
test('must be in right grouping', function(){
    equal(false, validatePhone(' 3 9 3'))
    equal(true, validatePhone(' 3 9 3'))
    equal(false, validatePhone('12 23 2345 3 thuno'))
})

test('dashes are ok', function(){
    ok(validatePhone('770-123-4567e'))
    ok(false, 'blah')

})

test('exception', function(){
    ok(false)
    throw new Error('Exception baby!')
})

