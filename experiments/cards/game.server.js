/*  Copyright (c) 2012 Sven "FuzzYspo0N" Bergström, 2013 Robert XD Hawkins
    
    written by : http://underscorediscovery.com
    written for : http://buildnewgames.com/real-time-multiplayer/
    
    modified for collective behavior experiments on Amazon Mechanical Turk

    MIT Licensed.
*/
const
  fs = require('fs'),
  utils = require(__base + 'sharedUtils/sharedUtils.js');

// This is the function where the server parses and acts on messages
// sent from 'clients' aka the browsers of people playing the
// game. For example, if someone clicks on the map, they send a packet
// to the server (check the client_on_click function in game.client.js)
// with the coordinates of the click, which this function reads and
// applies.
const onMessage = function (client, message) {
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

    // the player ended their turn
    case 'endTurn':
      others.forEach(p => {
        p.player.instance.emit('endTurn');
      })

      break;

    // a change was made to the cards on the table / in the hands
    case 'cardsUpdate':
      console.log('Server received: ' + message_parts);
      cards = {
        deck: message_parts[1],
        onTable: message_parts[2],
        p1Hand: message_parts[3],
        p2Hand: message_parts[4]
      }
      // pass the update along to each of the other clients
      others.forEach(p => {
        console.log("Emitting cardsUpdate to player: " + p.id);
        p.player.instance.emit('cardsUpdate', cards);
      })
      break;

    // a player is typing
    case 'playerTyping':
      _.map(others, function (p) {
        p.player.instance.emit('playerTyping',
          { typing: message_parts[1] });
      });
      break;

    // a message was sent
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

const setCustomEvents = function (socket) {
  //empty
};

// Data output for the end of each turn
const dataOutput = function () {
  function commonOutput(client, message_data) {
    return {
      gameid: client.game.id,
      time: Date.now(),
      turnNum: client.game.state.turnNum + 1, // TODO: add turn number to game state
      workerId: client.workerid,
      assignmentId: client.assignmentid
    };
  };

  const chatMessageOutput = function (client, message_data) {
    var intendedName = getIntendedTargetName(client.game.trialInfo.currStim);
    var output = _.extend(
      commonOutput(client, message_data), {
        intendedName,
        role: client.role,
        text: message_data[1].replace(/~~~/g, '.'),
      }
    );
    console.log(JSON.stringify(output, null, 3));
    return output;
  };

  const cardsOutput = function (client, message_data) {
    const deck = client.game.deck;

    var output = _.extend(
      commonOutput(client, message_data),
      deck
    );
    console.log(JSON.stringify(output, null, 3));
    return output;
  };

  return {
    'chatMessage': chatMessageOutput,
    'cards': cardsOutput
  };
}();
module.exports = {
  onMessage: onMessage,
  setCustomEvents: setCustomEvents,
  dataOutput: dataOutput
};
