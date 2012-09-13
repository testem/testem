hello = -> 'hello world'

describe 'hello', ->
    it 'should say hello', ->
        expect(hello()).toBe 'hello world'