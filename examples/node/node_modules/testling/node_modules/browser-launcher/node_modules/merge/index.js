module.exports = function() {

	var x = Array.prototype.slice.call(arguments),
		y = x.shift();

	x.forEach(function(z) {

		if (typeof z == 'object')

			Object.getOwnPropertyNames(z).forEach(function(w) {

				Object.defineProperty(y, w, Object.getOwnPropertyDescriptor(z, w));
			
			});
		
	});
	
	return y;
	
};