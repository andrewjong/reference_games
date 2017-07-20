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
    case 'clickedObj':
      // writeData(client, "clickedObj", message_parts);
      others[0].player.instance.send("s.feedback." + message_parts[2]);
      target.instance.send("s.feedback." + message_parts[2]);
      setTimeout(function () {
        _.map(all, function (p) {
          p.player.instance.emit('newRoundUpdate', { user: client.userid });
        });
        gc.newRound();
      }, 3000);

      break;

    case 'playerTyping':
      _.map(others, function (p) {
        p.player.instance.emit('playerTyping',
          { typing: message_parts[1] });
      });
      break;

    case 'chatMessage':
      if (client.game.player_count == 2 && !gc.paused) {
        // writeData(client, "message", message_parts);
        // Update others
        var msg = message_parts[1].replace(/~~~/g, '.');
        _.map(all, function (p) {
          p.player.instance.emit('chatMessage', { user: client.userid, msg: msg });
        });
      }
      break;

    case 'h': // Receive message when browser focus shifts
      target.visible = message_parts[1];
      break;
  }
};

var getStim = function (game, targetStatus) {
  return _.filter(game.trialInfo.currStim, function (x) {
    return x.targetStatus == targetStatus;
  })[0]['color'];
};

var dataOutput = function () {
  let clickedObjOutput = function (client, message_data) {
    let gc = client.game;
    let roundNum = gc.state.roundNum + 1;
    let id = gc.id;

    let outcome = message_data[2] === "target";
    let targetVsD1 = utils.colorDiff(getStim(gc, "target"), getStim(gc, "distr1"));
    let targetVsD2 = utils.colorDiff(getStim(gc, "target"), getStim(gc, "distr2"));
    let D1VsD2 = utils.colorDiff(getStim(gc, "distr1"), getStim(gc, "distr2"));
    let line = (id + ',' + Date.now() + ',' + roundNum + ',' +
      message_data.slice(1).join(',') +
      targetVsD1 + "," + targetVsD2 + "," + D1VsD2 + "," + outcome +
      '\n');
    console.log("clickedObj:" + line);
    return line;

  }

  let chatMessageOutput = function (client, message_data) {
    let gc = client.game;
    let roundNum = gc.state.roundNum + 1;
    let id = gc.id;

    let msg = message_data[1].replace(/~~~/g, '.');
    let line = (id + ',' + Date.now() + ',' + roundNum + ',' + client.role + ',"' + msg + '"\n');
    console.log("message:" + line);
    return line;
  }

  return {
    'chatMessage': chatMessageOutput,
    'clickedObj': clickedObjOutput
  };
}();

// /* 
//    The following functions should not need to be modified for most purposes
// */

var startGame = function (game, player) {
  // Establish write streams
  var startTime = utils.getLongFormTime();
  var dataFileName = startTime + "_" + game.id + ".csv";
  utils.establishStream(game, "message", dataFileName,
    "gameid,time,roundNum,sender,contents\n");
  utils.establishStream(game, "clickedObj", dataFileName,
    "gameid,time,roundNum,condition," +
    "clickStatus,clickColH,clickColS,clickColL,clickLocS,clickLocL" +
    "alt1Status,alt1ColH,alt1ColS,alt1ColL,alt1LocS,alt1LocL" +
    "alt2Status,alt2ColH,alt2ColS,alt2ColL,alt2LocS,alt2LocL" +
    "targetD1Diff,targetD2Diff,D1D2Diff,outcome\n");
  game.newRound();
};

module.exports = {
  dataOutput: dataOutput,
  startGame: startGame,
  onMessage: onMessage
};
