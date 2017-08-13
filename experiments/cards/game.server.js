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
const onMessage = function (client, data) {

  // The eventType is stored in data.eventType
  const eventType = data.eventType;

  // logging for debug
  if (eventType != 'h') {// skip the inactive window message
    console.log('Server received message:');
    for(let attribute in data){
      const value = data[attribute];
      console.log(`->[${attribute}]: <${typeof value}> ${value}`);
    }
  }

  //Extract important variables
  const gc = client.game;
  const id = gc.id;
  const all = gc.get_active_players();
  const target = gc.get_player(client.userid);
  const others = gc.get_others(client.userid);
  let deck;
  let onTable;

  /**
   * Request the client's current state to add to the eventData before writing. This is because the server does
   * not store a copy of the client's state - it must ask the client for it.
   * @param eventData an object for the event data
   */
  function sendWriteRequest(eventData){
    // ask the client to attach its current game state to the eventData
    target.instance.emit('stateRequest', Object.assign({origEvent:eventType}, eventData));
  }

  switch (eventType) {
    // player swapped two cards
    case 'swapUpdate':
      sendWriteRequest(data);
      others.forEach(p => {
        console.log("Emitting swapUpdate to player: " + p.id);
        p.player.instance.emit('swapUpdate', { c1: data.c1, c2: data.c2 });
      })
      break;
    // the player ended their turn
    case 'endTurn':
      // reshuffling logic here
      const reshuffle = cardLogic.reshuffle(gc.reshuffleP, data.onTable, data.deck);
      // TODO: SOMETHING HERE ABOUT WRITING THE END STATE DATA
      all.forEach(p => {
        console.log("Emitting endTurn to player: " + p.id);
        p.player.instance.emit('endTurn', reshuffle);
      });
      break;

    // client is requesting information to start the next turn
    case 'nextTurnRequest':
      // FIXME: I feel uncomfortable about the new draw being done per each client, instead of synced with the server. Technically data should be the same, but seems bad practice
      const newTurn = { deck: data.deck, onTable: data.onTable };
      gc.turnNum++;
      // TODO: SOMETHING HERE ABOUT WRITING THE START STATE DATA

      console.log("Emitting newTurn to player: " + target.i);
      target.instance.emit('newTurn', newTurn);
      break;

    // a player is typing
    case 'playerTyping':
      _.map(others, function (p) {
        p.player.instance.emit('playerTyping',
          { typing: data.isTyping });
      });
      break;

    // a message was sent
    case 'chatMessage':
      if (client.game.player_count == 2 && !gc.paused) {
        const message = data.message.replace(/~~~/g, '.');
        // Update others
        sendWriteRequest({message});
        _.map(all, function (p) {
          p.player.instance.emit('chatMessage', { user: client.userid, msg: message });
        });
      }
      break;

    // the client replied with the current game state to write. now we can explicitly call the write function
    case 'dataToWrite':
      // because eventType got replaced with 'dataToWrite', replace eventType with the originating event type
      data.eventType = data.origEvent;
      delete data.origEvent;
      // convert the data to generic perspective rather than "my" and "their"
      convertData(client.role, data);

      // this commonOutput only works because it's stored on the server's version
      const commonOutput = {
        assignmentid: client.game.assignmentid || 'none',
        workerid: client.game.workerid || 'none',
        gameid: client.game.id,
        epochTime: Date.now(),
        humanTime: Date(), 
        turnNum: client.game.turnNum + 1, // TODO: add turn number to game state
      }
      const combinedData = Object.assign(commonOutput, data, {deckSize: data.deckSize});  // deck size useful

      utils.writeDataToMongo(combinedData);
  }
  function convertData(role, data){
    data.whoseTurn = data.isMyTurn ? role : (role == 'player1' ? 'player2' : 'player1');
    delete data.isMyTurn;

    if (role == 'player1'){
      data.p1Hand = data.myHand;
      data.p2Hand = data.theirHand;
    } else if (role == 'player2') {
      data.p2Hand = data.myHand;
      data.p1Hand = data.theirHand;
    }
    delete data.myHand;
    delete data.theirHand;
  }
};

const setCustomEvents = function (socket) { /*empty. can't delete because compatibility*/ };

// // Data output for the end of each turn
// const dataOutput = function () {
//   function commonOutput(client, data) {
//     return {
//       assignmentid: client.game.assignmentid || 'none',
//       workerid: client.game.workerid || 'none',
//       gameid: client.game.id,
//       epochTime: Date.now(),
//       humanTime: Date(), 
//       turnNum: client.game.turnNum + 1, // TODO: add turn number to game state
//     };
//   };

//   const chatMessageOutput = function (client, data) {
//     const output = Object.assign(commonOutput(client, message_data), {
//       role: client.role,
//       text: data.message.replace(/~~~/g, '.'),
//     });

//     console.log(JSON.stringify(output, null, 3));
//     return output;
//   };

//   const cardsOutput = function (client, message_data) {
//     const output = Object.assign(commonOutput(client, message_data), {
//       // whoseTurn: ,
//       // stage: ,
//       // p1Hand: ,
//       // p2Hand: ,
//       // onTable: ,
//       // deck: client.game.deck,
//       // deckSize: 
//       // numSwapped: 
//       // reshuffleP: 
//       // numReshuffled:
//     });

//     console.log(JSON.stringify(output, null, 3));
//     return output;
//   };

//   return {
//     'chatMessage': chatMessageOutput,
//     'cards': cardsOutput
//   };
// }();

module.exports = {
  onMessage: onMessage,
  setCustomEvents: setCustomEvents,
  // dataOutput: dataOutput
};
