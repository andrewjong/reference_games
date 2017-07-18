/*  Copyright (c) 2012 Sven "FuzzYspo0N" Bergström, 2013 Robert XD Hawkins
    
    written by : http://underscorediscovery.com
    written for : http://buildnewgames.com/real-time-multiplayer/
    
    modified for collective behavior experiments on Amazon Mechanical Turk

    MIT Licensed.
*/
var
  fs = require('fs'),
  utils = require(__base + 'sharedUtils/sharedUtils.js');

// This is the function where the server parses and acts on messages
// sent from 'clients' aka the browsers of people playing the
// game. For example, if someone clicks on the map, they send a packet
// to the server (check the client_on_click function in game.client.js)
// with the coordinates of the click, which this function reads and
// applies.
var onMessage = function (client, message) {
  //Cut the message up into sub components
  var message_parts = message.split('.');

  //The first is always the type of message
  var message_type = message_parts[0];

  //Extract important variables
  var gc = client.game;
  var id = gc.id;
  var all = gc.get_active_players();
  var target = gc.get_player(client.userid);
  var others = gc.get_others(client.userid);
  switch (message_type) {

    case 'endTurn':
      _.map(others, p => {
        p.player.instance.emit('endTurn')
      })

      break;

    case 'playerTyping':
      _.map(others, function (p) {
        p.player.instance.emit('playerTyping',
          { typing: message_parts[1] });
      });
      break;

    case 'chatMessage':
      if (client.game.player_count == 2 && !gc.paused) {
        // Update others
        var msg = message_parts[1].replace(/~~~/g, '.');
        _.map(all, function (p) {
          p.player.instance.emit('chatMessage', { user: client.userid, msg: msg });
        });
      }
      break;
  }
};

module.exports = {
  writeData: writeData,
  startGame: startGame,
  onMessage: onMessage
};
