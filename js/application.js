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
            href: '#!'
        });

        var time = $("<time>", {
            datetime: timeago,
            class: 'timeago'
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
        location.prepend(tweet.hide());

        //var thistweet = $(location).find('li').first();
        // thistweet.hide();

        // Set timeago's auto updater function on the new tweet.
        tweet.find('time').timeago();

        if (anim)
            tweet.slideDown();
        else
            tweet.show();
    };

    var getFormattedDate = function(date) {
        var d = new Date(date);
        return d.toISOString();
    };

    // ---------- Functions for dealing with tweet data ----------

    var Head = function(initial) { // A "tape head" that marks our position in the tweet stream
        //var that = this;
        this.headposition = initial || 0;

        this.fastforward = function(howfar) {
            this.headposition += howfar;
        };

        // this.rewind = function(howfar) {

        // };

        this.scrubTo = function(where) {
            this.headposition = where;
        };
    };

    var Streamer = function(head, user) { // Handles interaction with the tweet stream

        var target;
        var localhead = head;

        this.check = function() { // Returns number of new tweets past the head
            var len = target.length;
            return len - localhead.headposition;
        };

        this.read = function(howmany) { // Returns <howmany> tweets and advances the head.
            var result;
            var headposition = localhead.headposition;
            var available = target.length - headposition;

            if (howmany <= available) {
                result = target.slice(headposition, headposition + howmany);
            } else {
                console.log("Streamer.get(): Not enough tweets to fill that request. Requested " +
                    howmany + ", returning " + available);
                //return as many as we can
                result = target.slice(head, target.length);
            }

            localhead.fastforward(result.length);
            return result;
        };

        this.setTarget = function(user) {
            //todo: dom show/hide should obviously not be here but UGH i want this to work.
            var selector = $('#current-target');
            if (user)
                selector.show();
            else
                selector.hide();

            target = user ? window.streams.users[user] : window.streams.home;
        };

        this.getTarget = function() {
            return target;
        };
        //var that = this;
        this.setTarget(user);
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
                buttons[0].fadeIn();
            }
            if (waiting >= 5) {
                buttons[1].fadeIn();
            }
            if (waiting >= 15) {
                buttons[2].fadeIn();
            }

            if (waiting < 1) {
                buttons[0].fadeOut();
            }
            if (waiting < 5) {
                buttons[1].fadeOut();
            }
            if (waiting < 15) {
                buttons[2].fadeOut();
            }
        };

        var checkVisibility = function() { // Displays or hides the ribbon depending on if we have tweets waiting.
            if (waiting > 0)
                ribbonselector.slideDown();
            else
                ribbonselector.slideUp();
        };
    };

    var changeTarget = function(user) { // Change page target and repopulate.
        // TODO: this is kind of hacky I think
        s.setTarget(user);

        if (r) { r.killHandlers(); }// TODO: I shouldn't have to do this explicitly.

        r = new Ribbon(s, $("#show-more-buttons"));

        //TODO: yuck
        h.scrubTo(s.getTarget().length - INITIAL_POP);
        s.read(INITIAL_POP).forEach(function(e) {
            displayTweet(createTweetDiv(e.user, e.message, getFormattedDate(e.created_at)), false);
        });

        r.setWaiting(s.check());

        clearInterval(mainloop);
        mainloop = window.setInterval(function() {
            r.setWaiting(s.check()); // Check for new tweets
        }, PERIOD);
    };

    var PERIOD = 1000; // How often to run the main loop
    var INITIAL_POP = 10;
    var mainloop;
    var h = new Head(0); // Head
    var s = new Streamer(h);
    var r = new Ribbon(s, $("#show-more-buttons"));

    changeTarget(null);

    // Click handlers for usernames
    $('#tweets').find('ul').on("click", 'a', function(e) {
        $('#tweets').find('ul').empty();

        var user = e.currentTarget.innerText;
        changeTarget(user);
    });

    $('#current-target').on("click", "a", function() {
        $('#tweets').find('ul').empty();
        changeTarget(null);
    });



    // TODO: Generate the followed list
    // TODO: Header should show target of current stream.
    // TODO: Let the user tweet.
})(jQuery);
