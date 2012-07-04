/*
 * ender postMessage - v0.1.3 - 5/1/2012
 * by Thomas Sturm http://www.sturm.to
 * Dual licensed under the MIT and GPL licenses.
 *
 * based on 
 *
 * jQuery postMessage - v0.5 - 9/11/2009
 * http://benalman.com/projects/jquery-postmessage-plugin/
 * Copyright (c) 2009 "Cowboy" Ben Alman
 * Dual licensed under the MIT and GPL licenses.
 * http://benalman.com/about/license/
 */

// Release History
// ender postMessage
// 0.1.3 - (5/1/2012) compatible with browserify
// 0.1.2 - (5/26/2011) Initial Fork and Release
//
// jQuery postMessage
// 0.5 - (9/11/2009) Improved cache-busting
// 0.4 - (8/25/2009) Initial release

!function (window) {
     // A few vars used in non-awesome browsers
     var interval_id,
	  last_hash,
	  original_hash,
	  cache_bust = 1,
		
	  // A var used in awesome browsers.
	  rm_callback,
		
	  // A few convenient shortcuts.
	  window = this,
	  FALSE = !1,
		
	  // Reused internal strings.
	  postMessage = 'postMessage',
	  addEventListener = 'addEventListener',

      has_postMessage = window[postMessage];
     
      fn = {};
	
	  // Method: ender.postMessage
	  // 
	  // This method will call window.postMessage if available, setting the
	  // targetOrigin parameter to the base of the target_url parameter for maximum
	  // security in browsers that support it. If window.postMessage is not available,
	  // the target window's location.hash will be used to pass the message. 
	  //
	  // Please Note: The ender version does not support the jQuery object serialization 
	  // for postMessage
	  // 
	  // Usage:
	  // 
	  // > ender.postMessage( message, target_url [, target ] );
	  // 
	  // Arguments:
	  // 
	  //  message - (String) A message to be passed to the other frame.
	  //  target_url - (String) The URL of the other frame this window is
	  //    attempting to communicate with. This must be the exact URL (including
	  //    any query string) of the other window for this script to work in
	  //    browsers that don't support window.postMessage.
	  //  target - (Object) A reference to the other frame this window is
	  //    attempting to communicate with. If omitted, defaults to `parent`.
	  // 
	  // Returns:
	  // 
	  //  Nothing.
	  
	  fn.postMessage = function( message, target_url, target ) {
		if ( !target_url ) { return; }
		
		// Default to parent if unspecified.
		target = target || parent;
		
		if ( has_postMessage ) {
		  // The browser supports window.postMessage, so call it with a targetOrigin
		  // set appropriately, based on the target_url parameter.
		  target[postMessage]( message, target_url.replace( /([^:]+:\/\/[^\/]+).*/, '$1' ) );
		  
		} else if ( target_url ) {
		  // The browser does not support window.postMessage, so set the location
		  // of the target to target_url#message. A bit ugly, but it works! A cache
		  // bust parameter is added to ensure that repeat messages trigger the
		  // callback.
		  target.location = target_url.replace( /#.*$/, '' ) + '#' + (+new Date) + (cache_bust++) + '&' + message;
		}
	  };
	  
	  // Method: ender.receiveMessage
	  // 
	  // Register a single callback for either a window.postMessage call, if
	  // supported, or if unsupported, for any change in the current window
	  // location.hash. If window.postMessage is supported and source_origin is
	  // specified, the source window will be checked against this for maximum
	  // security. If window.postMessage is unsupported, a polling loop will be
	  // started to watch for changes to the location.hash.
	  // 
	  // Note that for simplicity's sake, only a single callback can be registered
	  // at one time. Passing no params will unbind this event (or stop the polling
	  // loop), and calling this method a second time with another callback will
	  // unbind the event (or stop the polling loop) first, before binding the new
	  // callback.
	  // 
	  // Also note that if window.postMessage is available, the optional
	  // source_origin param will be used to test the event.origin property. From
	  // the MDC window.postMessage docs: This string is the concatenation of the
	  // protocol and "://", the host name if one exists, and ":" followed by a port
	  // number if a port is present and differs from the default port for the given
	  // protocol. Examples of typical origins are https://example.org (implying
	  // port 443), http://example.net (implying port 80), and http://example.com:8080.
	  // 
	  // Usage:
	  // 
	  // > ender.receiveMessage( callback [, source_origin ] [, delay ] );
	  // 
	  // Arguments:
	  // 
	  //  callback - (Function) This callback will execute whenever a <ender.postMessage>
	  //    message is received, provided the source_origin matches. If callback is
	  //    omitted, any existing receiveMessage event bind or polling loop will be
	  //    canceled.
	  //  source_origin - (String) If window.postMessage is available and this value
	  //    is not equal to the event.origin property, the callback will not be
	  //    called.
	  //  source_origin - (Function) If window.postMessage is available and this
	  //    function returns false when passed the event.origin property, the
	  //    callback will not be called.
	  //  delay - (Number) An optional zero-or-greater delay in milliseconds at
	  //    which the polling loop will execute (for browser that don't support
	  //    window.postMessage). If omitted, defaults to 100.
	  // 
	  // Returns:
	  // 
	  //  Nothing!
	  
	  fn.receiveMessage = function( callback, source_origin, delay ) {
		if ( has_postMessage ) {
		  // Since the browser supports window.postMessage, the callback will be
		  // bound to the actual event associated with window.postMessage.
		  
		  if ( callback ) {
			// Unbind an existing callback if it exists.
			rm_callback && fn.receiveMessage();
			
			// Bind the callback. A reference to the callback is stored for ease of
			// unbinding.
			rm_callback = function(e) {
			  if ( ( typeof source_origin === 'string' && e.origin !== source_origin )
				|| ( typeof source_origin === 'function' && source_origin( e.origin ) === FALSE ) ) {
				return FALSE;
			  }
			  callback( e );
			};
		  }
		  
		  if ( window[addEventListener] ) {
			window[ callback ? addEventListener : 'removeEventListener' ]( 'message', rm_callback, FALSE );
		  } else {
			window[ callback ? 'attachEvent' : 'detachEvent' ]( 'onmessage', rm_callback );
		  }
		  
		} else {
		  // Since the browser sucks, a polling loop will be started, and the
		  // callback will be called whenever the location.hash changes.
		  
		  interval_id && clearInterval( interval_id );
		  interval_id = null;
		  
		  if ( callback ) {
			delay = typeof source_origin === 'number'
			  ? source_origin
			  : typeof delay === 'number'
				? delay
				: 100;
			
			original_hash = document.location.hash;
			
			interval_id = setInterval(function(){
			  var hash = document.location.hash,
				re = /^#?\d+&/;
			  if ( hash !== last_hash && hash !== original_hash && re.test( hash ) ) {
				last_hash = hash;
				if ( original_hash ) {
					document.location.hash = original_hash; 
				} else {
					document.location.hash = ''; 
				}
				callback({ data: hash.replace( re, '' ) });
			  }
			}, delay );
		  }
		}
	  };
	  module.exports = {postMessage: fn.postMessage, receiveMessage: fn.receiveMessage};
}(window);
