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

var game_core = function (options) {
  // Store a flag if we are the server instance
  this.server = options.server;

  // How many players in the game?
  this.players_threshold = 2;

  if (this.server) {
    // If we're initializing the server game copy, pre-create the list of trials
    // we'll use, make a player object, and tell the player who they are
    this.id = options.id;
    this.expName = options.expName;
    this.player_count = options.player_count;

    this.players = [{
      id: options.player_instances[0].id,
      instance: options.player_instances[0].player,
      player: new game_player(this, options.player_instances[0].player)
    }];

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

// send an update to the server
game_core.prototype.server_send_update = function () {
  //Make a snapshot of the current state, for updating the clients
  var local_game = this;

  // Add info about all players
  var player_packet = _.map(local_game.players, function (p) {
    return {
      id: p.id,
      player: null
    };
  });

  var state = {
    gs: this.game_started,   // true when game's started
    pt: this.players_threshold,
    pc: this.player_count,
    dataObj: this.data,
    roundNum: this.roundNum,
    trialInfo: this.trialInfo
  };

  _.extend(state, { players: player_packet });

  //Send the snapshot to the players
  this.state = state;
  _.map(local_game.get_active_players(), function (p) {
    p.player.instance.emit('onserverupdate', state);
  });
};