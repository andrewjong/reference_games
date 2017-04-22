// drawing.js
// This file contains functions to draw on the HTML5 canvas

// Draws a grid of cells on the canvas (evenly divided
var drawGrid = function(game){
    //size of canvas
    var cw = game.viewport.width;
    var ch = game.viewport.height;

    //padding around grid
    var p = game.cellPadding / 2;

    //grid width and height
    var bw = cw - (p*2) ;
    var bh = ch - (p*2) ;

    game.ctx.beginPath();

    // vertical lines
  for (var x = 0; x <= bw; x += Math.floor((cw - 2*p) / game.numHorizontalCells)) {
        game.ctx.moveTo(0.5 + x + p, p);
        game.ctx.lineTo(0.5 + x + p, bh + p);}

    // horizontal lines
    for (var x = 0; x <= bh; x += Math.floor((ch - 2*p) / game.numVerticalCells)) {
        game.ctx.moveTo(p, 0.5 + x + p);
        game.ctx.lineTo(bw + p, 0.5 + x + p);}

    game.ctx.lineWidth = 0;
    game.ctx.strokeStyle = "#000000";
    game.ctx.stroke();
};

// Loop through the object list and draw each one in its specified location
var drawObjects = function(game, player) {
    _.map(globalGame.objects, function(obj) {
      // game.ctx.globalCompositeOperation='destination-over';  // draw under highlight
      var customCoords = globalGame.my_role == "sketcher" ? 'speakerCoords' : 'listenerCoords';
      var trueX = obj[customCoords]['trueX'];
      var trueY = obj[customCoords]['trueY'];
      var gridX = obj[customCoords]['gridX'];
      var gridY = obj[customCoords]['gridY'];
      console.log(obj['subordinate'],customCoords,gridX,gridY,trueX,trueY);
      globalGame.ctx.drawImage(obj.img, trueX, trueY,obj.width, obj.height);
    });

};


///// this version of highlightCell function edited from tangrams_sequential/drawing.js
//// almost same as copy above except instances of game replaced by globalGame
var highlightCell = function(game, color, condition) {
  var targetObjects = _.filter(globalGame.objects, condition);
  var customCoords = globalGame.my_role == "sketcher" ? 'speakerCoords' : 'listenerCoords';
  for (var i = 0; i < targetObjects.length; i++){
    var gridX = targetObjects[i][customCoords]['gridX'];
    var gridY = targetObjects[i][customCoords]['gridY'];
    var upperLeftX = globalGame.getPixelFromCell(gridX, gridY).upperLeftX;
    var upperLeftY = globalGame.getPixelFromCell(gridX, gridY).upperLeftY;
    globalGame.ctx.globalCompositeOperation='source-over';
    if (upperLeftX != null && upperLeftY != null) {
      globalGame.ctx.beginPath();
      globalGame.ctx.lineWidth="10";
      globalGame.ctx.strokeStyle=color;
      globalGame.ctx.rect(upperLeftX +5 , upperLeftY +5 ,globalGame.cellDimensions.width-10,globalGame.cellDimensions.height-10);
      globalGame.ctx.stroke();
    }
  }
};



var drawScreen = function(game, player) {
  // console.log('got to drawScreen!')
  // draw background
  game.ctx.strokeStyle = "#FFFFFF";
  game.ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
  game.ctx.fillRect(0,0,game.viewport.width,game.viewport.height);

  // Draw message in center (for countdown, e.g.)
  if (player.message) {
    game.ctx.font = "bold 23pt Helvetica";
    game.ctx.fillStyle = 'blue';
    game.ctx.textAlign = 'center';
    wrapText(game, player.message,
             game.world.width/2, game.world.height/4,
             game.world.width*4/5,
             25);
  }
  else {
    drawGrid(globalGame);
    drawObjects(globalGame, player);
    // if (globalGame.my_role === globalGame.playerRoleNames.role1) {
    //     highlightCell(globalGame, player, '#d15619',
    //     function(x) {return x.target_status == 'target';});
    // }
  }
};

function Sketchpad() {
  paper.setup('sketchpad');
  var actual_height = $('#sketchpad').innerHeight();
  var actual_width = $('#sketchpad').innerWidth()    
  view.viewSize = new Size(actual_height, actual_width); 
  //  view.setViewSize = new Size(view.element.width,view.element.height)
}

Sketchpad.prototype.setupTool = function() {
  var tool = new Tool();

  tool.onMouseMove = function(event) {
    globalGame.currMouseX = event.point.x;
    globalGame.currMouseY = event.point.y;
    if(globalGame.penDown && globalGame.drawingAllowed) {
      globalGame.path.add(event.point);
    };
  }

  tool.onMouseDown = function(event) {
    startStroke(event);
  };

  tool.onMouseDrag = function(event) {
    globalGame.currMouseX = event.point.x;
    globalGame.currMouseY = event.point.y;
    if (globalGame.drawingAllowed) {
      globalGame.path.add(event.point);
    }
  };

  tool.onMouseUp = function(event) {
    endStroke(event);
  }
};

function startStroke(event) {
  var point = event ? event.point : {x: globalGame.currMouseX, y: globalGame.currMouseY};
  if (globalGame.drawingAllowed) {
    globalGame.path = new Path({
      segments: [point],
      strokeColor: 'black',
      strokeWidth: 5
    });
  }
};

function endStroke(event) {
  if (globalGame.drawingAllowed) {
    // Increment stroke num
    globalGame.currStrokeNum += 1;

    // Simplify path to reduce data sent
    globalGame.path.simplify(10);

    // Send stroke (in both svg & json forms) to server
    globalGame.socket.emit('stroke', {
      currStrokeNum: globalGame.currStrokeNum,
      svgString: globalGame.path.exportSVG({asString: true}),
      jsonString: globalGame.path.exportJSON({asString: true})
    });

    // only send to remote db if you are the sketcher
    if (globalGame.my_role == "sketcher") {
      // prep to send stroke info to remote db (see also writeData in game.server)
      var currStrokeNum = globalGame.currStrokeNum;
      var svgString = globalGame.path.exportSVG({asString: true});
      var jsonString = globalGame.path.exportJSON({asString: true});
      var trialNum = globalGame.roundNum + 1;
      var gameID = globalGame['data']['id'];
      var timestamp = Date.now();
      var intendedName = getIntendedTargetName(globalGame.objects);
      var allObjects = globalGame.objects;
      var sketchpadWidthActual = paper.view.size._width;
      var sketchpadHeightActual = paper.view.size._height;

      // send stroke info to remote db (see also writeData in game.server)
      dbline = {role: globalGame.my_role,
                gameID: gameID,
                playerID: globalGame.my_id,
                trialNum: trialNum,
                timestamp: timestamp,
                responseType: 'stroke',
                intendedName: intendedName,
                allObjects: allObjects,
                currStrokeNum: currStrokeNum,
                svgString: svgString,
                jsonString: jsonString,
                dbname: globalGame.dbname,
                colname: globalGame.colname};

      // console.log(dbline);
      $.ajax({
       type: 'GET',
       url: 'http://10.102.2.155:9919/savedecision',
       dataType: 'jsonp',
       traditional: true,
       contentType: 'application/json; charset=utf-8',
       data: dbline,
       success: function(msg) {
                  console.log('stroke response: upload success!');
                }
    });

    }
  };
}

function getIntendedTargetName(objects) {
  return _.filter(objects, function(x){
    return x.target_status == 'target';
  })[0]['subordinate'];
}

function drawSketcherFeedback(globalGame, scoreDiff, clickedObjName) {
  // visual feedback
  highlightCell(globalGame, 'black', function(x) {
    return x.subordinate == clickedObjName;
  });
  // textual feedback
  $('#turnIndicator').html(" ");
  if (scoreDiff==1) {
    setTimeout(function(){
      $('#feedback').html('Great job! Your partner correctly identified the target.');
    }, globalGame.feedbackDelay);
  } else {
    setTimeout(function(){
      $('#feedback').html('Too bad... Your partner thought the target was the object outlined in ' + 'black'.bold() + '.');
    }, globalGame.feedbackDelay);
  }
};

function drawViewerFeedback(globalGame, scoreDiff, clickedObjName) {
  // viewer feedback
  highlightCell(globalGame, 'black', function(x) {
    return x.subordinate == clickedObjName;
  });
  highlightCell(globalGame, 'green', function(x) {
    return x.target_status == 'target';
  });
  // textual feedback
  $('#turnIndicator').html(" ");
  if (scoreDiff==1) {
      setTimeout(function(){
        $('#feedback').html('Great job! You correctly identified the target!');
      }, globalGame.feedbackDelay);
  } else {
      setTimeout(function(){
        $('#feedback').html('Sorry... The target was the object outlined in ' + 'green'.fontcolor("#1aff1a").bold() + '.');
      }, globalGame.feedbackDelay);
  }
};
// This is a helper function to write a text string onto the HTML5 canvas.
// It automatically figures out how to break the text into lines that will fit
// Input:
//    * game: the game object (containing the ctx canvas object)
//    * text: the string of text you want to writ
//    * x: the x coordinate of the point you want to start writing at (in pixels)
//    * y: the y coordinate of the point you want to start writing at (in pixels)
//    * maxWidth: the maximum width you want to allow the text to span (in pixels)
//    * lineHeight: the vertical space you want between lines (in pixels)
function wrapText(game, text, x, y, maxWidth, lineHeight) {
  var cars = text.split("\n");
  game.ctx.fillStyle = 'white';
  game.ctx.fillRect(0, 0, game.viewport.width, game.viewport.height);
  game.ctx.fillStyle = 'red';

  for (var ii = 0; ii < cars.length; ii++) {

    var line = "";
    var words = cars[ii].split(" ");

    for (var n = 0; n < words.length; n++) {
      var testLine = line + words[n] + " ";
      var metrics = game.ctx.measureText(testLine);
      var testWidth = metrics.width;

      if (testWidth > maxWidth) {
        game.ctx.fillText(line, x, y);
        line = words[n] + " ";
        y += lineHeight;
      }
      else {
        line = testLine;
      }
    }
    game.ctx.fillText(line, x, y);
    y += lineHeight;
  }
}
