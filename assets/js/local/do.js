;(function ($) { // store vars in a privately scoped anonymous function

    var $objectCache = {};

    /* when DOM is ready, bind some shit */

    $(function() {

    	$objectCache.html = $('html');

    	// once the page has fully loaded, do some shit
    	$(window).on('load', function () {

	    	$objectCache.html.addClass('delayed');

		});

		$('.carousel').pbjCarousel();

	});

    /* /when DOM is ready, bind some shit */

})($);