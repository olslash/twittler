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

  var displayTweets = function(tweets, anim) {
    var location = $('#tweets').find('ul');

    $.each(tweets, function(_, tweet) {
      var thisTweet = createTweetDiv(tweet.user, tweet.message,
        getFormattedDate(tweet.created_at));

      location.prepend(thisTweet.hide());
      // Set timeago's auto updater function on the new tweet.
      thisTweet.find('time').timeago();

      if (anim) {
        thisTweet.slideDown();
      } else
        thisTweet.show();
    });
  };

  var clearTweetList = function() {
    $('#tweets').find('ul').empty();
  };

  var getFormattedDate = function(date) {
    var d = new Date(date);
    return d.toISOString();
  };

  // ---------- Functions for dealing with tweet data ----------

  var Head = function(initial) {
    this.currentPosition = initial;
  };
  Head.prototype = {
    getPosition: function() {
      return this.currentPosition;
    },

    fastForward: function(howfar) {
      this.currentPosition += howfar;
    }
  };


  var Streamer = function(head, target) {
    this.target = target ?
      window.streams.users[target] : window.streams.home;
    this.head = head;
  };

  Streamer.prototype = {
    checkNew: function() {
      return this.target.length - this.head.getPosition();
    },

    read: function(howmany) {
      var result;
      var headposition = this.head.getPosition();
      var available = this.target.length - headposition;

      if (howmany <= available) {
        result = this.target.slice(headposition, headposition + howmany);
      } else {
        console.log("Streamer.read(): Not enough tweets to fill that request. Requested " +
          howmany + ", returning " + available);
        //return as many as we can
        result = this.target.slice(headposition, this.target.length);
      }

      this.head.fastForward(result.length);
      return result;
    }
  };


  var Ribbon = function(el) {
    var that = this;
    this.waiting = 0;         // Number of tweets in the buffer

    this._el = el;
    this._bufferEl = el.find($('#tweet-buffer-length'));
    this._buttons = [];         // elements: buttons for displaying tweets.
    this._handlers = [];      // handlers for those buttons.
    this._buttonValues = [];  // what values those buttons represent

    // Figure out what buttons are available from the DOM.
    $.each(this._el.find("[data-num]"), function(_, e) {
      var thisbutton = $(e);
      that._buttons.push(thisbutton);
      that._buttonValues.push(thisbutton.data().num);
    });

    // Set click handlers on those buttons
    $.each(this._buttons, function(_, e) {
      that._handlers.push(e.on("click", function(event) {
        var thisAmount = $(event.currentTarget).data().num;
        // ask someone to display thisAmount tweets
        $.publish("/twittler/showTweets", [thisAmount, true]);
      }));
    });
  };
  Ribbon.prototype = {
    killHandlers: function() {
      $.each(this._handlers, function(_, e) {
        e.off();
      });
    },

    checkVisibility: function() { // Displays or hides the ribbon depending on if we have tweets waiting.
      if (this.waiting > 0)
        this._el.slideDown();
      else
        this._el.slideUp();
    },

    checkButtons: function() { // Displays or hides the "show more" buttons depending on # of tweets waiting.
      var that = this;
      $.each(this._buttonValues, function(i,e){
        if(that.waiting >= e) {
          that._buttons[i].fadeIn();
        }
        if(that.waiting < e) {
          that._buttons[i].fadeOut();
        }
      });
    },

    setWaiting: function(num) { // Updates the "tweets waiting" number
        this.waiting = num;
        this._bufferEl.text(num);

        this.checkVisibility();
        this.checkButtons();
    }
  };



  var h = new Head(0);
  var s = new Streamer(h);
  r = new Ribbon($("#show-more-buttons"));

  $.subscribe("/twittler/showTweets", function(_, howmany, anim) {
    displayTweets(s.read(howmany), anim);
    r.setWaiting(s.checkNew()); // Check for new tweets
  });

  $.publish("/twittler/showTweets", [10, false]); // Populate the page on load.

  var checkLoop = window.setInterval(function() {
    r.setWaiting(s.checkNew()); // Check for new tweets
  }, 1000); //reset this when target changes



  /**
   * New structure:
   *
   * Keep Head, Streamer, Ribbon.
   *
   * Head:
   *     Arguments:
   *        initial: an initial position, default 0
   *     Maintains position in a tweets array generated by data_generator.js
   *     The head position always corresponds to the latest tweet -displayed-, in
   *     the given array.
   *
   *     Since there are multiple streams, there can be multiple heads.
   *
   *     Methods and properties:
   *        -- use prototype --
   *        var position: corresponds to the array index of the latest tweet displayed.
   *        getPosition(): return the current position.
   *        fastForward(howfar): move the head forward <howfar>
   *
   * Streamer:
   *     Arguments:
   *         head, a Head object.
   *         target, a specific target stream. Defaults to streams.home.
   *     Handles interaction with a tweet stream.
   *     Fires events for Ribbon to listen to
   *
   *      Each stream (user array) gets its own streamer object
   *
   *      Methods and properties:
   *          -- use prototype --
   *          checkNew(): returns the number of new tweets available (past the head),
   *                      for the given target.
   *          read(howmany): returns <howmany> tweets, starting at the current head
   *                        position, and ending at head + howmany.
   *                        Advances the head to the index of the last element shown
   *
   *
   * Ribbon:
   *
   * Other UI elements?
   * Show All Users link? -- listen to events from the streamer etc
   *
   * App flow:
   *
   * Create a head at position 0
   * Create a streamer, s, with the head, targeted to global.
   * create a ribbon and AllUsersLink
   *
   * s.read(10), and display each result. -- initial page population.
   * --like a page constructor.
   *
   * now we need:
   * constantly check how many tweets are past the head
   * update the ribbon buttons.
   * something to handle events sent out by the ribbon buttons-- they shouldn't be
   * tightly coupled to the streamer. in practice, anything should be able to
   * request that new tweets be shown via an event.
   *
   * what is actually handling displaying tweets to the page? callbacks on event
   * handlers.
   */



  // var Head = function(initial) { // A "tape head" that marks our position in the tweet stream
  //     //var that = this;
  //     this.headposition = initial || 0;

  //     this.fastforward = function(howfar) {
  //         this.headposition += howfar;
  //     };

  //     // this.rewind = function(howfar) {

  //     // };

  //     this.scrubTo = function(where) {
  //         this.headposition = where;
  //     };
  // };

  // var Streamer = function(head, user) { // Handles interaction with the tweet stream

  //     var target;
  //     var localhead = head;

  //     this.check = function() { // Returns number of new tweets past the head
  //         var len = target.length;
  //         return len - localhead.headposition;
  //     };

  //     this.read = function(howmany) { // Returns <howmany> tweets and advances the head.
  //         var result;
  //         var headposition = localhead.headposition;
  //         var available = target.length - headposition;

  //         if (howmany <= available) {
  //             result = target.slice(headposition, headposition + howmany);
  //         } else {
  //             console.log("Streamer.get(): Not enough tweets to fill that request. Requested " +
  //                 howmany + ", returning " + available);
  //             //return as many as we can
  //             result = target.slice(head, target.length);
  //         }

  //         localhead.fastforward(result.length);
  //         return result;
  //     };

  //     this.setTarget = function(user) {
  //         //todo: dom show/hide should obviously not be here but UGH i want this to work.
  //         var selector = $('#current-target');
  //         if (user)
  //             selector.show();
  //         else
  //             selector.hide();

  //         target = user ? window.streams.users[user] : window.streams.home;
  //     };

  //     this.getTarget = function() {
  //         return target;
  //     };
  //     //var that = this;
  //     this.setTarget(user);
  // };

  // var Ribbon = function(streamer, ribbonselector) { // Handles behavior of the "show more" ribbon
  //     var that = this;
  //     var waiting = 0;
  //     var buffer = ribbonselector.find($('#tweet-buffer-length'));
  //     var buttons = [];
  //     var handlers = [];

  //     // Figure out what buttons are available.
  //     $.each(ribbonselector.find("[data-num]"), function(i, e) {
  //         buttons.push($(e));
  //     });

  //     // Set click handlers on those buttons
  //     buttons.forEach(function(e) {
  //         handlers.push(e.on("click", function(event) {
  //             var thisAmount = $(event.currentTarget).data().num;

  //             streamer.read(thisAmount).forEach(function(e, i) {
  //                 displayTweet(createTweetDiv(e.user, e.message, getFormattedDate(e.created_at)), true);
  //             });
  //             that.setWaiting(streamer.check());
  //         }));
  //     });

  //     this.killHandlers = function() {
  //         $.each(handlers, function(i, e) {
  //             e.off();
  //         });
  //     };

  //     this.setWaiting = function(num) { // Updates the "tweets waiting" number
  //         waiting = num;
  //         buffer.text(num);

  //         checkVisibility();
  //         checkButtons();
  //     };

  //     var checkButtons = function() { // Displays or hides the "show more" buttons depending on # of tweets waiting.
  //         // TODO: make this not hardcoded
  //         // TODO: definitely a better way to do this than a bunch of IFs
  //         if (waiting >= 1) {
  //             buttons[0].fadeIn();
  //         }
  //         if (waiting >= 5) {
  //             buttons[1].fadeIn();
  //         }
  //         if (waiting >= 15) {
  //             buttons[2].fadeIn();
  //         }

  //         if (waiting < 1) {
  //             buttons[0].fadeOut();
  //         }
  //         if (waiting < 5) {
  //             buttons[1].fadeOut();
  //         }
  //         if (waiting < 15) {
  //             buttons[2].fadeOut();
  //         }
  //     };

  //     var checkVisibility = function() { // Displays or hides the ribbon depending on if we have tweets waiting.
  //         if (waiting > 0)
  //             ribbonselector.slideDown();
  //         else {
  //             //ribbonselector.slideUp();
  //         }
  //     };
  // };

  // var changeTarget = function(user) { // Change page target and repopulate.
  //     // TODO: this is kind of hacky I think
  //     s.setTarget(user);

  //     if (r) { r.killHandlers(); }// TODO: I shouldn't have to do this explicitly.

  //     r = new Ribbon(s, $("#show-more-buttons"));

  //     //TODO: yuck
  //     h.scrubTo(s.getTarget().length - INITIAL_POP);
  //     s.read(INITIAL_POP).forEach(function(e) {
  //         displayTweet(createTweetDiv(e.user, e.message, getFormattedDate(e.created_at)), false);
  //     });

  //     r.setWaiting(s.check());

  //     clearInterval(mainloop);
  //     mainloop = window.setInterval(function() {
  //         r.setWaiting(s.check()); // Check for new tweets
  //     }, PERIOD);
  // };

  // var PERIOD = 1000; // How often to run the main loop
  // var INITIAL_POP = 10;
  // var mainloop;
  // var h = new Head(0); // Head
  // var s = new Streamer(h);
  // var r = new Ribbon(s, $("#show-more-buttons"));

  // changeTarget(null);

  // // Click handlers for usernames
  // $('#tweets').find('ul').on("click", 'a', function(e) {
  //     $('#tweets').find('ul').empty();

  //     var user = e.currentTarget.innerText;
  //     changeTarget(user);
  // });

  // $('#current-target').on("click", "a", function() {
  //     $('#tweets').find('ul').empty();
  //     changeTarget(null);
  // });



  // TODO: Generate the followed list
  // TODO: Header should show target of current stream.
  // TODO: Let the user tweet.
})(jQuery);