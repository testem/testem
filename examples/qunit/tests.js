test('validate phone #', function(){
    ok(validatePhone('770 123 4567'), 'basic')
})

test('no non-numbers', function(){
    equal(false, validatePhone('a'))
    equal(false, validatePhone('?'))
})

test('must be in right grouping', function(){
    equal(false, validatePhone(' 3 9 3'))
    equal(false, validatePhone('12 23 2345 3 thuno'))
})

test('dashes are ok', function(){
    ok(validatePhone('770-123-4567e'))
    //ok(false, navigator.userAgent)
})


