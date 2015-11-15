/* globals expect, hello */
describe('hello', function(){

  it('says hello', function(){
    expect(hello()).toEqual('hello world');
  });

});
