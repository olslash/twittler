var twittler = (function($) {

	// ---------- Functions for displaying tweets to the page ----------

	var createTweetDiv = function(username, text, timeago) {
		var wrapper = $("<div>", {
			class: 'content'
		});

		var header = $("<div>", {
			class: 'stream-header'
		});

		var name = $("<a>", {
			class: 'username',
			text: username,
			href: '#'
		});

		var time = $("<small>", {
			text: timeago
		});

		var tweet = $("<p>", {
			class: 'tweet-text',
			text: text
		});

		// yuck
		var fin = $('<li>').append(wrapper).append(header).append(tweet);
		$(fin).find(header).append(name).append(time);

		return fin;
	};

	var displayTweet = function(tweet, anim) {
		// TODO: handle an array of tweets?
		var location = $('#tweets').find('ul'); // TODO: not hardcoded
		location.prepend(tweet);

		var thistweet = $(location).find('li').first();
		thistweet.hide();

		if (anim)
			thistweet.slideDown();
		else
			thistweet.show();
	};

	var getFormattedDate = function(date) {
		var d = new Date(date);
		return d.toTimeString(); //todo: "ago" time string
	};

	// ---------- Functions for dealing with tweet data ----------

	var Head = function(initial) { // A "tape head" that marks our position in the tweet stream
		var that = this;
		this.headposition = initial || 0;

		this.fastforward = function(howfar) {
			that.headposition += howfar;
		};

		this.rewind = function(howfar) {

		};

		this.scrubto = function(where) {

		};
	};

	var Streamer = function(head, user) { // Handles interaction with the tweet stream
		var that = this;
		this.target = user ? window.streams.users[user] : window.streams.home;

		this.check = function() { // Returns number of new tweets past the head
			var len = that.target.length;
			return len - head.headposition;
		};

		this.read = function(howmany) { // Returns <howmany> tweets and advances the head.
			var result;
			var headposition = head.headposition;
			var available = that.target.length - headposition;

			if (howmany <= available) {
				result = that.target.slice(headposition, headposition + howmany);
			} else {
				console.log("Streamer.get(): Not enough tweets to fill that request. Requested " +
					howmany + ", returning " + available);
				//return as many as we can
				result = that.target.slice(head, that.target.length);
			}

			head.fastforward(result.length);
			return result;
		};
	};

	var Ribbon = function(streamer, ribbonselector) { // Handles behavior of the "show more" ribbon
		var that = this;
		var waiting = 0;
		var buffer = ribbonselector.find($('#tweet-buffer-length'));
		var buttons = [];
		var handlers = [];

		// Figure out what buttons are available.
		$.each(ribbonselector.find("[data-num]"), function(i, e) {
			buttons.push($(e));
		});

		// Set click handlers on those buttons
		buttons.forEach(function(e) {
			// TODO: the behavior in here should probably be passed in as a callback instead.
			handlers.push(e.on("click", function(event) {
				var thisAmount = $(event.currentTarget).data().num;

				streamer.read(thisAmount).forEach(function(e, i) {
					displayTweet(createTweetDiv(e.user, e.message, getFormattedDate(e.created_at)), true);
				});

				that.setWaiting(streamer.check());
			}));
		});

		this.killHandlers = function() {
			$.each(handlers, function(i, e) {
				e.off();
			});
		};

		this.setWaiting = function(num) { // Updates the "tweets waiting" number
			waiting = num;
			buffer.text(num);

			checkVisibility();
			checkButtons();
		};

		var checkButtons = function() { // Displays or hides the "show more" buttons depending on # of tweets waiting.
			// TODO: make this not hardcoded
			// TODO: definitely a better way to do this than a bunch of IFs
			if (waiting >= 1) {
				buttons[0].show();
			}
			if (waiting >= 5) {
				buttons[1].show();
			}
			if (waiting >= 15) {
				buttons[2].show();
			}

			if (waiting < 1) {
				buttons[0].hide();
			}
			if (waiting < 5) {
				buttons[1].hide();
			}
			if (waiting <= 15) {
				buttons[2].hide();
			}
		};

		var checkVisibility = function() { // Displays or hides the ribbon depending on if we have tweets waiting.
			if (waiting > 0)
				ribbonselector.slideDown();
			else
				ribbonselector.slideUp();
		};
	};

	var PERIOD = 1000; // How often to run the main loop

	var h = new Head(0);
	var s = new Streamer(h);
	var r = new Ribbon(s, $("#show-more-buttons"));

	// Populate page on load
	s.read(10).forEach(function(e) {
		displayTweet(createTweetDiv(e.user, e.message, getFormattedDate(e.created_at)), false);
	});

	window.setInterval(function() {
		// Main loop
		r.setWaiting(s.check()); // Check for new tweets
	}, PERIOD);

	var changeTarget = function(user) {
		// TODO: this is kind of hacky I think
		h = new Head(0);
		s = new Streamer(h, user);
		r.killHandlers(); // TODO: I shouldn't have to do this explicitly.
		r = new Ribbon(s, $("#show-more-buttons"));

		s.read(10).forEach(function(e) {
			displayTweet(createTweetDiv(e.user, e.message, getFormattedDate(e.created_at)), false);
		});
	};
	// Click handlers for usernames
	$('#tweets').find('ul').on("click", 'a', function(e) {
		$('#tweets').find('ul').empty();

		var user = e.currentTarget.innerText;
		changeTarget(user);
	});

	// TODO: Generate the followed list
	// TODO: Add a "show all" button
	// TODO: Header should show target of current stream.
})(jQuery);