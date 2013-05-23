;(function( $, window, document, undefined ) {

	/* console.log shortcut for internal dev */
	if ( typeof( _ ) === 'undefined' ) function _(msg) {
		console.log(msg);
	}
	/* /console.log shortcut for internal dev */

    // undefined is used here as the undefined global variable in ECMAScript 3 is
    // mutable (ie. it can be changed by someone else). undefined isn't really being
    // passed in so we can ensure the value of it is truly undefined. In ES5, undefined
    // can no longer be modified.

    // window and document are passed through as local variable rather than global
    // as this (slightly) quickens the resolution process and can be more efficiently
    // minified (especially when both are regularly referenced in your plugin).

    // plugin name
    var pluginName = 'pbjCarousel';

    $[pluginName] = function(el, options){
        // To avoid scope issues, use 'base' instead of 'this'
        // to reference this class from internal events and functions.
        var base = this;

        // Access to jQuery and DOM versions of element
        base.$el = $(el);
        base.el = el;

        // Add a reverse reference to the DOM object
        // Zepto only supports the following use of data() through the optional data plugin
        // Therefore reverse reference is only supported with jQuery or custom Zepto build
        //base.$el.data("pbjCarousel", base);

        // store positioning functions in here
        var position = {
        	width: function() {
        		// grab the width from the viewport el, but subtract the borders
	        	base.width = base.$el.width() - (base.options.borderSize * 2);

        		// once base width is set, apply it to all images
				base.$imgs.attr({
					width: base.width
				});
        	},

        	imgLoadCount: 5,

        	imgLoad: function(callback) {

        		// count down from 5
        		position.imgLoadCount--;

        		// when all 5 imgs have loaded fire the callback
        		if (!position.imgLoadCount) {
        			position.height();
        			position.tapMap();
        		}
        	},

        	height: function() {

        		// grab the height from inner, divided by 3
        		base.height = base.$inner.height() / 3;

        		// apply base height to el
        		base.$el.css('height', base.height);

        	},

        	tapMap: function() {
        		// in order to create shaped "tap" (click) targets we must do some maths
	        	// imagine drawing 2 diagonal lines, 1 from the top left to the bottom right corner, the other from the top right to bottom left corner
	        	//
	        	// +------+
	        	// |\  n /|
	        	// | \  / |
	        	// |  \/  |
	        	// |w /\ e|
	        	// | /  \ |
	        	// |/  s \|
	        	// +------+
	        	//
	        	// we shape the north/top/up and south/bottom/down sections and overlay them on the rectangular east/right, west/left sections
	        	// to find the necessary skew angle for the north and south elements we use the folliwng equation:
	        	// sin A = opp/hyp
	        	// the opposite side is a, the current height of el
	        	// the hypotenuse can be solved using the Pythagorean theorem. as stated immediately above, side a is the current height of el and side b, the current width of el
	        	// js Math methods spit out radians, so we'll need to convert that to degrees (actually we could totally use radians but it's Greek to me)
				var skewAngle = Math.asin(base.height/Math.sqrt(Math.pow(base.width, 2) + Math.pow(base.height, 2))) * (180 / Math.PI);

				// set the special skewed click targets to use the determined angle
				base.$skewPos.css(methods.prefixr('transform', 'skewY(' + skewAngle + 'deg)')).addClass('pbj-shaped');
				base.$skewNeg.css(methods.prefixr('transform', 'skewY(' + (skewAngle * -1) + 'deg)')).addClass('pbj-shaped');
        	}
        },

        events = {
        	click: function() {
        		// load tap target click function once
	        	base.$tapTarget.one('click.pbj', function(e) {
	        		e.preventDefault();
	        		e.stopImmediatePropagation();
	        		methods.doSlide($(this).data('pbjAdv'));
	        	});
        	},
        	resize: function() {
        		// on throttled window resize, load layout figurer outer function
	        	$(window).on('resize.pbj', methods.throttle(methods.doLayoutResize, 100));
        	}
        },

        methods = {

	        init: function() {
	            // add options to the mix
	            base.options = $.extend({},$[pluginName].defaultOptions, options);

	            // first things first, add "viewport" class to base el. this allows us to add some immediate styling (like fading out) while we build things
	            base.$el.addClass('pbj-viewport');

	            // run the first build method, the image scavenger, which will kick off subsequent methods when it's done
	            methods.doInitScavengry();
	        },

	        // cache DOM els for future use
	        doCacheEls: function() {
	        	// cache "inner"
	        	base.$inner = base.$el.find('.pbj-inner');

	        	// cache center img container
	        	base.$centerImg = base.$el.find('.pbj-img-container:nth-child(3) .pbj-img');

	        	// cache imgs
	        	base.$imgs = base.$el.find('.pbj-img');

	        	// cache needed tap targets
				base.$tapTarget = base.$el.find('.pbj-tap');
				base.$skewPos = base.$el.find('.pbj-tap-n-1, .pbj-tap-s-2');
	        	base.$skewNeg = base.$el.find('.pbj-tap-n-2, .pbj-tap-s-1');

	        	// now that those els are cached, lets get the layout looking spiffy and register some events
	        	methods.doLayoutInitSize();
	        	methods.doRegisterEvents();
	        },

	        // output browser prefixed CSS object for a given CSS rule
	        prefixr: function(rule, val) {
	        	var tempObj = {};
	        	$.each(['-webkit-', '-moz-', '-ms-', '-ms-', '-o-', ''], function(i, prefix) {
					tempObj[prefix + rule] = val;
				});
				return tempObj;
	        },

	        // compute next frame
	        nextFrame: function(plane, increment, save) { // plane ? 0 : 1 [, increment ? true : false ] [, save ? true : false ]
	        	if (increment) var product = (base.currentFrame[plane] + 1 === base.catalog[plane].length) ? 0 : base.currentFrame[plane] + 1;
	        	else var product = (base.currentFrame[plane] - 1 < 0) ? base.catalog[plane].length - 1 : base.currentFrame[plane] - 1;

	        	if (save) base.currentFrame[plane] = product;

	        	return product;
	        },

	        // throttle function from Underscore 1.4.4
	        //
			// > http://underscorejs.org
			// > (c) 2009-2013 Jeremy Ashkenas, DocumentCloud Inc.
			// > Underscore may be freely distributed under the MIT license.
	        throttle: function(func, wait) {
				var context, args, timeout, result;
				var previous = 0;
				var later = function() {
					previous = new Date;
					timeout = null;
					result = func.apply(context, args);
				};
				return function() {
					var now = new Date;
					var remaining = wait - (now - previous);
					context = this;
					args = arguments;
					if (remaining <= 0) {
						clearTimeout(timeout);
						timeout = null;
						previous = now;
						result = func.apply(context, args);
					} else if (!timeout) {
						timeout = setTimeout(later, remaining);
					}
					return result;
				};
			},

	        doInitScavengry: function() {

	        	// before we build up we must tear down

	        	// loop through the provided img list/s, figure some things out, then hand it off to the processList function
	        	base.$el.children().each(function() {
	        		if ($(this).hasClass('horizontal') || $(this).data('pbjDirection') === 'horizontal') { // populate the horizontal catalog
	        			processList(1, this);
	        		} else { // populate the vertical catalog
	        			processList(0, this);
	        		}
	        	});

	        	// run 1 or more lists through the map function to extract necessary vals and then add to the appropriate catalog
        		function processList(plane, currentList) { // plane can be either 1 (horizontal) or 0 (vertical)

        			// init the catalog as an array containing 2 empty arrays
		        	if (typeof base.catalog === 'undefined') base.catalog = [[], []];

		        	// run the list, minus the parent element, through the map function, grabbing the src and alt vals, then dump each img object into the catalog
		        	base.catalog[plane] = base.catalog[plane].concat($(currentList).find('img').map(function(i) {

        				// if the current img lacks an alt property, attempt to add one based on the img filename, which is hopefully semantic enough to make sense
		        		var tempAlt = (typeof this.alt === 'undefined' || this.alt === '') ? this.src.split('.').slice(-2, -1)[0].split('/').pop().replace('_', ' ').replace('-', ' ') : this.alt;

		        		var currentObj = { src: this.src, alt: tempAlt };

		        		// if both lists are empty and this is the first processed img, set this as the "keystone" img, at position 0 in both lists
		        		if (!base.catalog[0].length && !base.catalog[1].length && !i) {
		        			base.catalog[0].push(currentObj);
			        		base.catalog[1].push(currentObj);
			        		return null;
		        		} else {
		        			return currentObj;
		        		}

        			}));
        		}

        		// now that we've gathered all imgs, we can answer the question of which orientation we're using, vertical, horizontal, or both
        		if (base.catalog[0].length !== 1 && base.catalog[1].length !== 1) base.orientation = -1;
        		else if (base.catalog[0].length === 1) base.orientation = 1;
        		else base.orientation = 0;

        		// now lets move on to building
        		methods.doInitCarpentry();
        	},

        	doInitCarpentry: function() {

        		// now we build

        		// init the currentFrame info
	        	base.currentFrame = [0, 0];

	        	// create document fragment object with inner div
	        	var frag = {
	        		$inner: $(document.createElement('div')).addClass('pbj-inner')
	        	};

	        	// build 5 sections to make the dance floor
	        	var cell = 1;
	        	while (cell <= 5) {
	        		// set the plane of the current cell
	        		var plane = ([2, 4].indexOf(cell) !== -1) ? 1 : 0 ;

	        		// create temp objects with info needed to build the dance floor
	        		var cellObj = {
	        				1: methods.nextFrame(plane),
	        				2: methods.nextFrame(plane),
	        				3: 0,
	        				4: 1,
	        				5: 1
	        			};

	        		// create img container, append img with appropriate values, then append to inner frag
	        		frag.$cell = $(document.createElement('section'))
	        			.addClass('pbj-img-container')
	        			.append($(document.createElement('img'))
	        				.attr({
				        		'class' : 'pbj-img',
			        			src	: base.catalog[plane][cellObj[cell]].src,
			        			alt : base.catalog[plane][cellObj[cell]].alt
		        			}))
		        		.appendTo(frag.$inner);

		        	// incrment counter
		        	cell++;
	        	}

	        	// build temp tap map frag
	        	frag.$tapMap = $(document.createElement('div')).addClass('pbj-tap-map');

	        	// obj of tapmap info
	        	var tapMapArr = ['n', 's', 'e', 'w', 'n pbj-tap-n-1', 'n pbj-tap-n-2', 's pbj-tap-s-1', 's pbj-tap-s-2'],
	        		tapMapObj = {
	        			0: function() { return tapMapArr.splice(0, 2); },
	        			1: function() { return tapMapArr.splice(2, 2); },
	        			'-1': function() { return tapMapArr.splice(2, 6) }
		        	};

	        	// iterate through each tap target type to build the tap target areas
        		$.each(tapMapObj[base.orientation](), function(i, val) {
        			// map semantic directions to shorthand cardinal directions
        			var dirObj = {
        				n: 'up',
        				s: 'down',
        				e: 'right',
        				w: 'left'
        			};

        			// if the first letter of the current value corresponds to a key in dirObj, save that value in the temp dirAdv var
        			if (dirObj[val[0]]) var advDir = dirObj[val[0]];

					// append the tap target we create to the tap map frag
	        		frag.$tapMap.append($(document.createElement('a')).attr({
		        		'class'			: 'pbj-tap pbj-tap-' + val,
		        		'data-pbj-adv'	: advDir
		        	})
		        		// add a visually hidden span to include accessible text describing the tap target link
		        		.append($(document.createElement('span')).attr({
			        		'class'	: 'visually-hidden'
			        	})
			        		// the accessibility text can be modified in default options
			        		.text(base.options.accessibleLinkText + ' ' + advDir)
			        	)
		        	);
        		});

	        	// add tap map elements to the end of frag
				frag.$inner = frag.$inner.add(frag.$tapMap);

	        	// add optional css and finally append frag to living el
	        	base.$el.css({
	        		backgroundColor: base.options.backgroundColor,
	        		borderRadius: base.options.borderRadius,
	        		borderColor: base.options.borderColor,
			        borderWidth: base.options.borderSize
	        	}).html(frag.$inner);

	        	// now that the final structure is in the wild, lets cache some els
	        	methods.doCacheEls();
	        },

	        doRegisterEvents: function() {
	        	events.resize();
	        	events.click();
	        },

	        // adaptation of my whenVisible jQuery plugin
 			// http://plugins.jquery.com/whenvisible/
 			whenVisible: function(el, callback) {

	        	var interval = 50,
	        		timeout = 6000,
	        		isVisible = false,
		        	si = null,
		        	check = function () {
		        		// decrement the timeout counter each run
			    		timeout--;

			    		if ($(el)[0].offsetWidth > 0 && $(el)[0].offsetHeight > 0) {
			        		callback(el);
			        		isVisible = true;
			        		clearInterval(si);
			        	} else if (!timeout) { // if we reach the timeout just give up
			        		clearInterval(si);
			        		return;
			        	}
			    	};

	            // run initial check
	            check();

	            // if initial check didn't come back true, kick off setInterval
	            if (!isVisible) si = setInterval(check, interval);
 			},

	        // do maths to assign necessary parameters (width, height, skew deg) to componenets (viewport, tap panels)
	        doLayoutInitSize: function() {

				position.width();

				base.$imgs.each(function () {
					methods.whenVisible($(this), position.imgLoad);
				});

			},

			// on resize do some stuff
			doLayoutResize: function() {
				position.width();
				position.height();
    			position.tapMap();
			},

			/*
			// if the imgs take a second to load the inner el height will remain at 0. we'll have to twiddle our thumbs for a bit.
			methods.whenVisible(base.$inner, function(el) {
				// the images have scaled, resetting the height. grab the new value from the inner el
				base.height = $(el).height();

				// handle image placement for images that are different sizes
				var doImagePlacement = {
					alignTop: function() {}, //this is default browser behavior; do nothing
					alignBottom: function () {
						base.$imgs.each(function() {
							methods.whenVisible(this, function(el) {
								$(el).css('top', base.height - $(el).height());
							});
						});
					},
					alignMiddle: function () {
						base.$imgs.each(function() {
							methods.whenVisible(this, function(el) {
								$(el).css('top', (base.height - $(el).height()) / 2);
							});
						});
					},
					stretch: function () {
						base.$imgs.attr({
							height: base.height - (base.options.borderSize * 2)
						});
					}
				}

				// run the chosen image placement method
				doImagePlacement[base.options.imagePlacement]();
			});
			*/

	        // advance the frame in the indicated directiom
	        doSlide: function(advDir) {

	        	// create a var to store the plane of movement, 0 or 1
	        	var plane = (['left', 'right'].indexOf(advDir) !== -1) ? 1 : 0 ,
	        		increment = (['right', 'down'].indexOf(advDir) !== -1) ? true : false ;

	        	// save the new current frame
				methods.nextFrame(plane, increment, true);

				// "translate" the inner el, aka move the dance floor to the new position
	        	base.$inner.addClass('pbj-move-' + advDir);

				var t = setTimeout(function() {
					base.$centerImg.attr({
	        			src	: base.catalog[plane][base.currentFrame[plane]].src,
	        			alt : base.catalog[plane][base.currentFrame[plane]].alt
        			});

					methods.whenVisible(base.$centerImg, function() {
						base.$inner.removeClass('pbj-move-up pbj-move-down pbj-move-left pbj-move-right').find('.pbj-img').each(function(i, el) {
							// don't touch the center img
							if (i === 2) return null;

							var plane = ([1, 3].indexOf(i) !== -1) ? 1 : 0 ,
				        		increment = ([3, 4].indexOf(i) !== -1) ? true : false ;

							$(this).attr({
								src	: base.catalog[plane][methods.nextFrame(plane, increment)].src,
			        			alt : base.catalog[plane][methods.nextFrame(plane, increment)].alt
							});
						});

						// once everything's loaded, re-attach the click handler
						events.click();
					});
				}, base.options.transitionDuration);

	        }
        };

        // Run initializer
        methods.init();
    };

    $[pluginName].defaultOptions = {
        backgroundColor: '#ededed',
        borderColor: '#ededed',
        borderSize: 3,
        borderRadius: 4,
        accessibleLinkText: 'advance to next frame',
        imagePlacement: 'stretch', // options: "alignTop", "alignBottom", "alignMiddle", "stretch"
        transitionDuration: 1000
    };

    $.fn[pluginName] = function(options) {
        return this.each(function() {
            (new $[pluginName](this, options));
        });
    };

// to use with jQuery/Zepto uncomment the desired library
//})( jQuery, window, document );
})( Zepto, window, document );