steal('funcunit/syn/resources/jquery.js')
  .then('funcunit/qunit')
  .then('funcunit/syn/synthetic.js')
  .then('funcunit/syn/mouse.js')
  .then('funcunit/syn/browsers.js')
  .then('funcunit/syn/key.js', function(){
  	// selenium can't force focus on the window, so these tests won't work
    Syn.skipFocusTests = true;
   })
  .then('funcunit/syn/test/qunit/syn_test.js')
  .then('funcunit/syn/test/qunit/mouse_test.js')
  .then('funcunit/syn/test/qunit/key_test.js')
  .then('funcunit/syn/resources/jquery.event.drag.js')
  .then('funcunit/syn/resources/jquery.event.drop.js')
  .then('funcunit/syn/drag/drag.js')
  .then('funcunit/syn/drag/test/qunit/drag_test.js')