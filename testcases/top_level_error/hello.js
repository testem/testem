function hello(name){
    setTimeout(function(){
        throw new Error('This is a top level error baby!');
    }, 1);
    return 'hello ' + (name || 'world');
}