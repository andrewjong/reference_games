/*
  The main game class. This gets created on both server and
  client. Server creates one for each game that is hosted, and each
  client creates one for itself to play the game. When you set a
  variable, remember that it's only set in that instance.
*/
var has_require = typeof require !== 'undefined';

if (typeof _ === 'undefined') {
  if (has_require) {
    _ = require('lodash');
    utils = require(__base + '/sharedUtils/sharedUtils.js');
  }
  else throw 'mymodule requires underscore, see http://underscorejs.org';
}

const gameOptions = {
  CARDS_PER_HAND: 3,
  CARDS_ON_TABLE: 4,
  RESHUFFLE_PROBABILITY: 0.5
}

var game_core = function (options) {
  // Store a flag if we are the server instance
  this.server = options.server;
  this.email = 'stanford.csli.games@gmail.com';
  this.dataStore = ['csv', 'mongo'];
  this.experimentName = 'cards';

  this.world = {
    width: 1000,
    height: 700
  }

  // How many players in the game?
  this.players_threshold = 2;
  this.playerRoleNames = {
    role1: 'player1',
    role2: 'player2'
  }

  // Which round (a.k.a. "trial") are we on (initialize at -1 so that first round is 0-indexed)
  this.roundNum = -1;
  // Total number of rounds we want people to complete
  this.numRounds = 1; // one in this case because each game has several turns

  // which turn we're on. start at 0 so first round starts at 1
  this.turnNum = 0;

  // the value of 'p'
  this.reshuffleP = gameOptions.RESHUFFLE_PROBABILITY;

  if (this.server) {
    // If we're initializing the server game copy, pre-create the list of trials
    // we'll use, make a player object, and tell the player who they are
    this.id = options.id;
    this.expName = options.expName;
    this.player_count = options.player_count;
    this.game_started = false;

    this.data = {
      id: this.id,
      trials: [],
      catch_trials: [], system: {},
      subject_information: {
        gameID: this.id,
        score: 0
      }
    };

    this.players = [{
      id: options.player_instances[0].id,
      instance: options.player_instances[0].player,
      player: new game_player(this, options.player_instances[0].player)
    }];

    /* Game Starting State */
    this.cards = {
      deck: _.shuffle(Array.from(Array(52).keys())) // Represent deck of cards as number array, shuffle random order
    }
    console.log('Deck: ' + this.cards.deck);

    // Draw from the top cards of the deck
    this.cards.onTable = this.cards.deck.splice(0, gameOptions.CARDS_ON_TABLE);
    console.log("On table: " + this.cards.onTable);
    this.cards.p1Hand = this.cards.deck.splice(0, gameOptions.CARDS_PER_HAND);
    console.log("P1 hand: " + this.cards.p1Hand);
    this.cards.p2Hand = this.cards.deck.splice(0, gameOptions.CARDS_PER_HAND);
    console.log("P2 hand: " + this.cards.p2Hand);

    console.log('server game core initialized!');
    this.server_send_update();
  } else {
    // If we're initializing a player's local game copy, create the player object
    // Don't initialize any client state until after another client connects and server sends update
    this.players = [{
      id: null,
      instance: null,
      player: new game_player(this)
    }];

    this.cards = {
      deck: Array(52).fill(-1), // array with dummy values to represent the full size of the deck
      onTable: [],
      p1Hand: [],
      p2Hand: []
    }
    console.log('cards: ' + JSON.stringify(this.cards));
  }
};

var game_player = function (game_instance, player_instance) {
  this.instance = player_instance;
  this.game = game_instance;
  this.role = '';
  this.message = '';
  this.id = '';
};

// server side we set some classes to global types, so that
// we can use them in other files (specifically, game.server.js)
if ('undefined' != typeof global) {
  module.exports = {
    game_core,
    game_player
  }
}

// HELPER FUNCTIONS

// Method to easily look up player 
game_core.prototype.get_player = function (id) {
  var result = _.find(this.players, function (e) { return e.id == id; });
  return result.player;
};

// Method to get list of players that aren't the given id
game_core.prototype.get_others = function (id) {
  var otherPlayersList = _.filter(this.players, function (e) { return e.id != id; });
  var noEmptiesList = _.map(otherPlayersList, function (p) { return p.player ? p : null; });
  return _.without(noEmptiesList, null);
};

// Returns all players
game_core.prototype.get_active_players = function () {
  var noEmptiesList = _.map(this.players, function (p) { return p.player ? p : null; });
  return _.without(noEmptiesList, null);
};

// Advance to the next round
game_core.prototype.newRound = function () {
  // If you've reached the planned number of rounds, end the game  
  if (this.roundNum == this.numRounds - 1) {
    _.map(this.get_active_players(), function (p) {
      p.player.instance.disconnect();
    });
  } else {
    // console.log('got to newRound in game.core.js and not the final round');
    if (this.roundNum < 0 && (this.roundNum + 1 == 0)) {
      console.log(`Setting game_started to true`);
      this.game_started = true;
    }
    this.roundNum += 1;

    /* If we want multiple rounds, reinitialize the game state here. Multiple rounds is currently not implemented for cards! */

    this.server_send_update();
  }
};

// send an update from the server
game_core.prototype.server_send_update = function () {
  //Make a snapshot of the current state, for updating the clients
  var local_game = this;

  var state = {
    gs: this.game_started,   // true when game's started
    pt: this.players_threshold,
    pc: this.player_count,
  };

  // Add info about all players
  let player_packet = local_game.players.map(p => {
    return {
      id: p.id,
      player: null
    }
  })


  _.extend(state, {
    players: player_packet,
    cards: local_game.cards  // add the cards to the sent state
  });

  //Send the snapshot to the players
  this.state = state; // synchronize our own state?
  this.get_active_players().forEach(p => {
    console.log('Emiting server update to player ' + p.id);
    p.player.instance.emit('onserverupdate', state);
  })
};