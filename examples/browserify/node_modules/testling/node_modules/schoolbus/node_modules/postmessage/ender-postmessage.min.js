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
 */// Release History
// ender postMessage
// 0.1.3 - (5/1/2012) compatible with browserify
// 0.1.2 - (5/26/2011) Initial Fork and Release
//
// jQuery postMessage
// 0.5 - (9/11/2009) Improved cache-busting
// 0.4 - (8/25/2009) Initial release
!function(a){var b,c,d,e=1,f,a=this,g=!1,h="postMessage",i="addEventListener",j=a[h];fn={},fn.postMessage=function(a,b,c){if(!b)return;c=c||parent,j?c[h](a,b.replace(/([^:]+:\/\/[^\/]+).*/,"$1")):b&&(c.location=b.replace(/#.*$/,"")+"#"+ +(new Date)+e++ +"&"+a)},fn.receiveMessage=function(e,h,k){j?(e&&(f&&fn.receiveMessage(),f=function(a){if(typeof h=="string"&&a.origin!==h||typeof h=="function"&&h(a.origin)===g)return g;e(a)}),a[i]?a[e?i:"removeEventListener"]("message",f,g):a[e?"attachEvent":"detachEvent"]("onmessage",f)):(b&&clearInterval(b),b=null,e&&(k=typeof h=="number"?h:typeof k=="number"?k:100,d=document.location.hash,b=setInterval(function(){var a=document.location.hash,b=/^#?\d+&/;a!==c&&a!==d&&b.test(a)&&(c=a,d?document.location.hash=d:document.location.hash="",e({data:a.replace(b,"")}))},k)))},module.exports={postMessage:fn.postMessage,receiveMessage:fn.receiveMessage}}(window);