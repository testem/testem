If a matcher is added to jasmine which has a HTMLElement as part of the message return, testem blows up. 
This works fine if you run jasmine normally in the browser. 
Something to do with the terminal output mechanism i guess. 

the stack explodes from an infinite recursion in a str(key, holder) function. 

to reproduce run:
node testem.js -f maxstackjasminebug/testem.json