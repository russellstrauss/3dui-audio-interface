var Graphics = require('./components/graphics.js');
var Utilities = require('./utils.js');
var VR = require('./components/vr.js');

(function () {
	
	document.addEventListener('DOMContentLoaded', function() {

		VR().init();
	});
})();