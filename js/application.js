var twittler = (function($) {
		var createTweetDiv = function(username, text, timeago) {
		var wrapper = $("<div>", {
			class: 'content',
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
		var temp = $('#tweets').find('ul').prepend(tweet).hide();
		if (anim)
			temp.slideDown();
		else
			temp.show();
	};

	var getFormattedDate = function(date) {
		var d = new Date(date);
		return d.toTimeString(); //todo: "ago" time string
	};
})(jQuery);