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
    this.waiting = 0; // Number of tweets in the buffer

    this._el = el;
    this._bufferEl = el.find($('#tweet-buffer-length'));
    this._buttons = []; // elements: buttons for displaying tweets.
    this._handlers = []; // handlers for those buttons.
    this._buttonValues = []; // what values those buttons represent

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
      $.each(this._buttonValues, function(i, e) {
        if (that.waiting >= e) {
          that._buttons[i].fadeIn();
        }
        if (that.waiting < e) {
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


  // TODO: Generate the followed list
  // TODO: Header should show target of current stream.
  // TODO: Let the user tweet.
})(jQuery);