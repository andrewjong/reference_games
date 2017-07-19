// A window global for our game root variable.
var globalGame = {};

var client_onserverupdate_received = function (data) {

  // Update client versions of variables with data received from
  // server_send_update function in game.core.js
  // data refers to server information

  // offset each index of the player ids by 1
  if (data.players) {
    _.map(_.zip(data.players, globalGame.players), function (z) {
      z[1].id = z[0].id;
    });
  }

  // Get rid of "waiting" screen if there are multiple players
  if (data.players.length > 1) {
    $('#messages').empty();
    globalGame.get_player(globalGame.my_id).message = "";
  }

  // update data object on first round, don't overwrite (FIXME)
  if (!_.has(globalGame, 'data')) {
    globalGame.data = data.dataObj;
  }

};

var client_onMessage = function (data) {
  var commands = data.split('.');
  var command = commands[0];
  var subcommand = commands[1] || null;
  var commanddata = commands[2] || null;

  switch (command) {
    case 's': //server message
      switch (subcommand) {
        case 'end_turn':
          // Redirect to exit survey
          ondisconnect();
          console.log("received end message...");
          break;

        case 'alert': // Not in database, so you can't play...
          alert('You did not enter an ID');
          window.location.replace('http://nodejs.org'); break;

        case 'join': //join a game requested
          var num_players = commanddata;
          client_onjoingame(num_players, commands[3]); break;

        case 'add_player': // New player joined... Need to add them to our list.
          console.log("adding player" + commanddata);
          console.log("cancelling timeout");
          clearTimeout(globalGame.timeoutID);
          if (hidden === 'hidden') {
            flashTitle("GO!");
          }
          globalGame.players.push({ id: commanddata, player: new game_player(globalGame) }); break;

      }
  }
};

var client_onjoingame = function (num_players, role) {
  if (num_players == 1) {
    // Set timeout only for first player...
    this.timeoutID = setTimeout(function () {
      if (_.size(this.urlParams) == 4) {
        this.submitted = true;
        window.opener.turk.submit(this.data, true);
        window.close();
      } else {
        console.log("would have submitted the following: ");
        console.log(this.data);
      }
    }, 1000 * 60 * 15);

    globalGame.get_player(globalGame.my_id).message = ('Waiting for another player to connect... '
      + 'Please do not refresh the page!');
  }
};