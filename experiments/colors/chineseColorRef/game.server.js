/*  Copyright (c) 2012 Sven "FuzzYspo0N" Bergström, 2013 Robert XD Hawkins
    
    written by : http://underscorediscovery.com
    written for : http://buildnewgames.com/real-time-multiplayer/
    
    modified for collective behavior experiments on Amazon Mechanical Turk

    MIT Licensed.
*/
    var
        fs    = require('fs'),
        utils = require(__base + 'sharedUtils/sharedUtils.js');

// This is the function where the server parses and acts on messages
// sent from 'clients' aka the browsers of people playing the
// game. For example, if someone clicks on the map, they send a packet
// to the server (check the client_on_click function in game.client.js)
// with the coordinates of the click, which this function reads and
// applies.
var onMessage = function(client,message) {
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
  switch(message_type) {
    
  case 'clickedObj' :
    // Update score
    gc.data.totalScore += message_parts[1] === "target" ? 1 : 0;
    // Give feedback to players
    var feedbackMsg = "s.feedback." + message_parts[2] + "." + message_parts[1];
    others[0].player.instance.send(feedbackMsg);
    target.instance.send(feedbackMsg);
    // Continue
    gc.newRound(3000);
    break; 
  
  case 'playerTyping' :
    _.map(others, function(p) {
      p.player.instance.emit( 'playerTyping',
			      {typing: message_parts[1]});
    });
    break;
  
  case 'chatMessage' :
    if(client.game.player_count == 2 && !gc.paused) {
      // Update others
      var msg = message_parts[1].replace(/~~~/g,'.');
      _.map(all, function(p){
	p.player.instance.emit( 'chatMessage', {user: client.userid, msg: msg});});
    }
    break;

  case 'h' : // Receive message when browser focus shifts
    target.visible = message_parts[1];
    break;
  }
};

var writeData = function(client, type, message_parts) {
  var gc = client.game;
  var roundNum = gc.state.roundNum + 1;
  var id = gc.id;
  switch(type) {
  case "clickedObj" :
    var outcome = message_parts[2] === "target";
    var targetVsD1 = utils.colorDiff(getStim(gc, "target"), getStim(gc, "distr1"));
    var targetVsD2 = utils.colorDiff(getStim(gc, "target"), getStim(gc, "distr2"));
    var D1VsD2 = utils.colorDiff(getStim(gc, "distr1"), getStim(gc, "distr2"));
    var line = (id + ',' + Date.now() + ',' + roundNum  + ',' +
		message_parts.slice(1).join(',') +
		targetVsD1 + "," + targetVsD2 + "," + D1VsD2 + "," + outcome +
		'\n');
    console.log("clickedObj:" + line);
    break;


  case "message" :
    var msg = message_parts[1].replace(/~~~/g,'.');
    var line = (id + ',' + Date.now() + ',' + roundNum + ',' + client.role + ',"' + msg + '"\n');
    console.log("message:" + line);
    break;
  }
  gc.streams[type].write(line, function (err) {if(err) throw err;});
};

var getStim = function(game, targetStatus) {
  return _.filter(game.trialInfo.currStim, function(x){
    return x.targetStatus == targetStatus;
  })[0]['color'];
};

// /* 
//    The following functions should not need to be modified for most purposes
// */

var startGame = function(game, player) {
  // Establish write streams
  var startTime = utils.getLongFormTime();
  var dataFileName = startTime + "_" + game.id + ".csv";
  utils.establishStream(game, "message", dataFileName,
			"gameid,time,roundNum,sender,contents\n");
  utils.establishStream(game, "clickedObj", dataFileName,
			"gameid,time,roundNum," +
			"clickStatus,clickP1,clickP2,clickP3,clickP4,clickP5,clickP6," +
			"clickP7,clickP8,clickLocS,clickLocL," +
			"alt1Status,alt1P1,alt1P2,alt1P3,alt1P4,alt1P5,alt1P6," +
			"alt1P7,alt1P8,alt1LocS,alt1LocL," +			
			"alt2Status,alt2P1,alt2P2,alt2P3,alt2P4,alt2P5,alt2P6," +
			"alt2P7,alt2P8,alt2LocS,alt2LocL,outcome\n");
  game.newRound(0);
};

module.exports = {
  writeData : writeData,
  startGame : startGame,
  onMessage : onMessage
};
