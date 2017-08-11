const
  fs = require('fs'),
  utils = require(__base + 'sharedUtils/sharedUtils.js');

const cardLogic = require(__base + 'cards/card-logic.js');

// This is the function where the server parses and acts on messages
// sent from 'clients' aka the browsers of people playing the
// game. For example, if someone clicks on the map, they send a packet
// to the server (check the client_on_click function in game.client.js)
// with the coordinates of the click, which this function reads and
// applies.
const onMessage = function (client, message) {
  //Cut the message up into sub components
  const message_parts = message.split('.');

  //The first is always the type of message
  const message_type = message_parts[0];

  // logging for debug
  if (message_type != 'h') {// skip the inactive window message
    console.log('Server received message:');
    message_parts.forEach((m, i) => console.log(`->[${i}]: <${typeof m}> ${m}`));
  }

  //Extract important variables
  const gc = client.game;
  const id = gc.id;
  const all = gc.get_active_players();
  const target = gc.get_player(client.userid);
  const others = gc.get_others(client.userid);
  let deck;
  let onTable;
  switch (message_type) {

    // player swapped two cards
    case 'swapUpdate':
      others.forEach(p => {
        console.log("Emitting swapUpdate to player: " + p.id);
        p.player.instance.emit('swapUpdate', { c1: message_parts[1], c2: message_parts[2] });
      })
      break;
    // the player ended their turn
    case 'endTurn':
      // reshuffling logic here
      deck = utils.toNumArray(message_parts[1]);
      onTable = utils.toNumArray(message_parts[2]);
      const reshuffle = cardLogic.reshuffle(gc.reshuffleP, onTable, deck);
      // TODO: SOMETHING HERE ABOUT WRITING THE END STATE DATA
      all.forEach(p => {
        console.log("Emitting endTurn to player: " + p.id);
        p.player.instance.emit('endTurn', reshuffle);
      });

      break;
    // client is requesting information to start the next turn
    case 'nextTurnRequest':
      deck = utils.toNumArray(message_parts[1]);
      onTable = cardLogic.dealCards(deck, gc.options.CARDS_ON_TABLE); 
      const newTurn = { deck, onTable };
      gc.turnNum++;

      // FIXME: I feel uncomfortable about the new draw being done per each client, instead of synced with the server. Technically data should be the same, but seems bad practice

      // TODO: SOMETHING HERE ABOUT WRITING THE START STATE DATA

      console.log("Emitting newTurn to player: " + target.i);
      target.instance.emit('newTurn', newTurn);
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
        const msg = message_parts[1].replace(/~~~/g, '.');
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
      assignmentId: client.game.assignmentId || 'none',
      workerId: client.game.workerId || 'none',
      gameid: client.game.id,
      epochTime: Date.now(),
      humanTime: Date(), 
      turnNum: client.game.turnNum + 1, // TODO: add turn number to game state
    };
  };

  const chatMessageOutput = function (client, message_data) {
    const output = Object.assign(commonOutput(client, message_data), {
      role: client.role,
      text: message_data[1].replace(/~~~/g, '.'),
    });

    console.log(JSON.stringify(output, null, 3));
    return output;
  };

  const cardsOutput = function (client, message_data) {
    const output = Object.assign(commonOutput(client, message_data), {
      // whoseTurn: ,
      // stage: ,
      // p1Hand: ,
      // p2Hand: ,
      // onTable: ,
      // deck: client.game.deck,
      // deckSize: 
      // numSwapped: 
      // reshuffleP: 
      // numReshuffled:
    });

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
