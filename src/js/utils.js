(function () {
	
	var appSettings;
	
	window.utils = (function() {
		
		return {
			appSettings: {
				breakpoints: {
					mobileMax: 767,
					tabletMin: 768,
					tabletMax: 991,
					desktopMin: 992,
					desktopLargeMin: 1200
				}
			},
			
			mobile: function() {
				return window.innerWidth < this.appSettings.breakpoints.tabletMin;
			},
			
			tablet: function() {
				return (window.innerWidth > this.appSettings.breakpoints.mobileMax && window.innerWidth < this.appSettings.breakpoints.desktopMin);
			},
			
			desktop: function() {
				return window.innerWidth > this.appSettings.breakpoints.desktopMin;
			},
			
			getBreakpoint: function() {
				if (window.innerWidth < this.appSettings.breakpoints.tabletMin) return 'mobile';
				else if (window.innerWidth < this.appSettings.breakpoints.desktopMin) return 'tablet';
				else return 'desktop';
			},
			
			debounce: function(func, wait, immediate) {
				var timeout;
				return function () {
					var context = this, args = arguments;
					var later = function () {
						timeout = null;
						if (!immediate) func.apply(context, args);
					};
					var callNow = immediate && !timeout;
					clearTimeout(timeout);
					timeout = setTimeout(later, wait);
					if (callNow) func.apply(context, args);
				};
			},
			
			isInteger: function(number) {
				return number % 1 === 0;
			}
		}
	})();

	module.exports = window.utils;
})();