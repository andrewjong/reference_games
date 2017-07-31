/*
  The main game class. This gets created on both server and
  client. Server creates one for each game that is hosted, and each
  client creates one for itself to play the game. When you set a
  variable, remember that it's only set in that instance.
*/
var has_require = typeof require !== 'undefined';

if (typeof _ === 'undefined') {
  if (has_require) {
    _ = require('underscore');
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

  // How many players in the game?
  this.players_threshold = 2;

  // the value of 'p'
  this.reshuffleP = gameOptions.RESHUFFLE_PROBABILITY;

  if (this.server) {
    // If we're initializing the server game copy, pre-create the list of trials
    // we'll use, make a player object, and tell the player who they are
    this.id = options.id;
    this.expName = options.expName;
    this.player_count = options.player_count;

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
      deck: _.shuffle(Array.from(Array(52).keys)), // Represent deck of cards as number array, shuffle random order
    }

    // Draw from the top cards of the deck
    cards.p1Hand = cards.deck.splice(0, gameOptions.CARDS_PER_HAND);
    console.log("P1 hand: " + cards.p1Hand);
    cards.onTable = cards.deck.splice(0, gameOptions.CARDS_ON_TABLE);
    console.log("On table: " + cards.onTable);
    cards.p2Hand = cards.deck.splice(0, gameOptions.CARDS_PER_HAND);
    console.log("P2 hand: " + cards.p2Hand);

    this.server_send_update();
  } else {
    // If we're initializing a player's local game copy, create the player object
    this.players = [{
      id: null,
      instance: null,
      player: new game_player(this)
    }];
  }
};

var game_player = function (game_instance, player_instance) {
  this.instance = player_instance;
  this.game = game_instance;
  this.id = '';
};

// server side we set some classes to global types, so that
// we can use them in other files (specifically, game.server.js)
if ('undefined' != typeof global) {
  module.exports = global.game_core = game_core;
  module.exports = global.game_player = game_player;
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
    p.player.instance.emit('onserverupdate', state);
  })
};