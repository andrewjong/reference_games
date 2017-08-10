// A window global for our game root variable.
var globalGame = {};

var client_onserverupdate_received = function (state) {
  console.log('Server update received on client: ' + globalGame.my_id);

  // Update client versions of variables with data received from
  // server_send_update function in game.core.js
  // data refers to server information

  // offset each index of the player ids by 1
  if (state.players) {
    _.map(_.zip(state.players, globalGame.players), function (z) {
      z[1].id = z[0].id;
    });
  }

  // Get rid of "waiting" screen if there are multiple players
  if (state.players.length > 1) {
    $('#messages').empty();
    globalGame.get_player(globalGame.my_id).message = "";
    $('#chatbox').removeAttr("disabled");
  } else {
    $('#chatbox').attr("disabled", "disabled");
  }

  globalGame.game_started = state.gs;
  globalGame.players_threshold = state.pt;
  globalGame.player_count = state.pc;
  globalGame.roundNum = state.roundNum;

  // update data object on first round, don't overwrite (FIXME) 
  if (!_.has(globalGame, 'data')) {
    globalGame.data = state.dataObj;
  }

  // update the Phaser graphics
  // TODO: update phaser with some update function passing in state.cards
  // drawScreen(state)
  console.log("Client side (not passed to Phaser yet), state.cards: " + JSON.stringify(state.cards));
  console.log(`globalGame.my_role: ${globalGame.my_role}`);

  // Package the data into a package convenient for Phaser NOTE: these variables could technically be stored in globalGame. maybe change that later
  console.log(`globalGame.game_started: ${globalGame.game_started}`);
  if (globalGame.game_started) {
    $('#viewport').empty();
    let pData = {
      deck: state.cards.deck,
      onTable: state.cards.onTable,
    };
    if (globalGame.my_role == 'player1') {
      pData.isMyTurn = true;
      pData.myHand = state.cards.p1Hand;
      pData.theirHand = state.cards.p2Hand;
    } else if (globalGame.my_role == 'player2') {
      pData.isMyTurn = false;
      pData.myHand = state.cards.p2Hand;
      pData.theirHand = state.cards.p1Hand;
    } else { // this shouldn't happen!
      console.error("globalGame.my_role: " + globalGame.my_role);
    }
    console.log('Calling startPhaser with pData: ' + JSON.stringify(pData));
    startPhaser(pData);
  } else {
    console.log('Waiting for game start')
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
        case 'end':
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
          console.log("adding player " + commanddata);
          console.log("cancelling timeout");
          clearTimeout(globalGame.timeoutID);
          if (hidden === 'hidden') {
            flashTitle("GO!");
          }
          globalGame.players.push({
            id: commanddata,
            player: new game_player(globalGame)
          }); break;

      }
  }
};

var client_onjoingame = function (num_players, role) {
  // set role locally
  globalGame.my_role = role;
  globalGame.get_player(globalGame.my_id).role = globalGame.my_role;

  _.map(_.range(num_players - 1), function (i) {
    globalGame.players.unshift({ id: null, player: new game_player(globalGame) });
  });

  if (num_players == 1) {
    // Set timeout only for first player...
    this.timeoutID = setTimeout(function () {
      if (_.size(this.urlParams) == 4) {
        this.submitted = true;
        window.opener.turk.submit(this.data, true);
        window.close();
      } else {
        console.log("would have submitted the following :");
        //console.log(this.data);
      }
    }, 1000 * 60 * 15); // 15 minute timeout
    console.log(globalGame.my_id);
    globalGame.get_player(globalGame.my_id).message = ('Waiting for another player to connect... '
      + 'Please do not refresh the page!');
  }
};

const customSetup = function (game) {
  game.socket.on('swapUpdate', swapped => {
    console.log('swapUpdate received on client ' + game.my_id + ': ' + JSON.stringify(swapped));
    handleSwapUpdate(swapped.c1, swapped.c2);
  })
  // Update about the cards in both player's hands and on the table
  game.socket.on('cardsUpdate', cardsPacket => {
    console.log('cardsUpdate received on client ' + game.my_id + ': ' + JSON.stringify(cardsPacket));
  });

  // Next turn contains data for transitioning to the next turn
  game.socket.on('endTurn', reshuffled => {
    console.log('endTurn received on client ' + game.my_id + ': ' + JSON.stringify(reshuffled));
    game.turnNum++;
    handleEndTurn(reshuffled);
  });

  // New turn update for the start of the next turn
  game.socket.on('newTurn', newTurn => {
    console.log('newTurn received on client ' + game.my_id + ': ' + JSON.stringify(newTurn));
    handleNewTurn(newTurn);
  });

}

// This is essentially a state setup function
// It exists due to name compatibility stuff within clientBase.js, because 'drawScreen()' is called in onconnect
// else 
function drawScreen(data) {
  console.log('drawScreen called for client ' + globalGame.my_id);
}