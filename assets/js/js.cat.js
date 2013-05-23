;(function ($) { // store vars in a privately scoped anonymous function

    var $objectCache = {};

    /* when DOM is ready, bind some shit */

    $(function() {

    	// once the page has fully loaded, do some shit
    	$(window).on('load', function () {

	    	$objectCache.html = $('html');
	    	$objectCache.music = $('#music');

	    	$objectCache.html.addClass('delayed loaded');

			$objectCache.music.on('play', function () {
	    		$objectCache.html.removeClass('paused').addClass('played');
			});

			$objectCache.music.on('pause', function () {
	    		$objectCache.html.addClass('paused');
			});

		});

	});

    /* /when DOM is ready, bind some shit */

})($);