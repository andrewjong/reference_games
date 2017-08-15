var _ = require('underscore');
var fs = require('fs');
var path = require('path');
var converter = require("color-convert");
var DeltaE = require('../node_modules/delta-e');
var mkdirp = require('mkdirp');
var sendPostRequest = require('request').post;
const port = process.env.PORT || 4000;

// Mongoose stuff
const mongoose = require('mongoose');
const mongoDB = mongoose.connect(process.env.MONGODB_URI, { useMongoClient: true });
mongoDB
  .then(db => console.log("MongoDB connected :)"))
  .catch(err => console.log(`Couldn't connect to MongoDB! Data is not being saved. If you are testing, this is okay.\n\t${err}`));

const gameSchema = new mongoose.Schema({
  data: mongoose.Schema.Types.Mixed
});

// Use different models if chatMessage or clickedObj because they have different number of fields
const ChatMessage = mongoose.model('chatmessage', gameSchema);
const State = mongoose.model('state', gameSchema);
const CardSwap = mongoose.model('cardswap', gameSchema);

var serveFile = function (req, res) {
  var fileName = req.params[0];
  console.log('\t :: Express :: file requested: ' + fileName);
  if (req.query.workerId) {
    console.log(" by workerID " + req.query.workerId);
  }
  return res.sendFile(fileName, { root: __base });
};

var handleDuplicate = function (req, res) {
  console.log("duplicate id: blocking request");
  return res.redirect('sharedUtils/duplicate.html');
};

var handleInvalidID = function (req, res) {
  console.log("invalid id: blocking request");
  return res.redirect('/colors/chineseColorRef/forms/invalid.html');
};

var checkPreviousParticipant = function (workerId, callback) {
  console.log('skipping check for previous participant');
  return callback(false);
};

var writeDataToMongo = function (data) {
  console.log("Data writing to mongo: " + JSON.stringify(data));
  // Use a different Model per message type
  let mongoData = null;
  if (data.eventType == 'chatMessage') {
    console.log('Using model chatmessage');
    mongoData = new ChatMessage;
  }
  else if (data.eventType == 'initialized' 
    || data.eventType == 'endTurn' || data.eventType == 'nextTurnRequest') {
    console.log('Using model state');
    mongoData = new State;
  }
  else if (data.eventType == 'swapUpdate') {
    console.log('Using model cardSwap');
    mongoData = new CardSwap;
  }
  // Save to Mongo
  if (mongoData != null) {
    mongoData.data = data;
    mongoData.markModified('data');
    mongoData.save(err => {
      if (err) console.log('Error writing to mongo! ' + err);
      else console.log('Data saved successfully to mongo');
    });
  }
  else
    console.log(`Not writing to mongo because data.eventType=${data.eventType} is unaccounted for.`);
};

var UUID = function () {
  var baseName = (Math.floor(Math.random() * 10) + '' +
    Math.floor(Math.random() * 10) + '' +
    Math.floor(Math.random() * 10) + '' +
    Math.floor(Math.random() * 10));
  var template = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
  var id = baseName + '-' + template.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
  return id;
};

var getLongFormTime = function () {
  var d = new Date();
  var day = [d.getFullYear(), (d.getMonth() + 1), d.getDate()].join('-');
  var time = [d.getHours() + 'h', d.getMinutes() + 'm', d.getSeconds() + 's'].join('-');
  return day + '-' + time;
};

var getObjectLocHeaderArray = function () {
  var arr = _.map(_.range(1, 5), function (i) {
    return _.map(['Name', 'SenderLoc', 'ReceiverLoc'], function (v) {
      return 'object' + i + v;
    });
  });
  return _.flatten(arr);
};

var hsl2lab = function (hsl) {
  return converter.hsl.lab(hsl);
};

function fillArray(value, len) {
  var arr = [];
  for (var i = 0; i < len; i++) {
    arr.push(value);
  }
  return arr;
}

var checkInBounds = function (object, options) {
  return (object.x + (object.w || object.d) < options.width) &&
    (object.y + (object.h || object.d) < options.height);
};

var randomColor = function (options) {
  var h = ~~(Math.random() * 360);
  var s = ~~(Math.random() * 100);
  var l = _.has(options, 'fixedL') ? 50 : ~~(Math.random() * 100);
  return [h, s, l];
};

var randomSpline = function () {
  var numPoints = 4;
  return _.sample(_.range(50, 250), 2 * numPoints);
};

// returns an object with x, y, w, h fields
var randomRect = function (options) {
  if (_.isEmpty(options)) {
    throw "Error, must provide options to randomRect!";
  }

  var wRange = _.range(options.wMin, options.wMax);
  var hRange = _.range(options.hMin, options.hMax);

  var rect = randomPoint(options);
  rect.h = _.sample(wRange),
    rect.w = _.sample(hRange)

  if (!checkInBounds(rect, options)) {
    return this.randomRect(options);
  }

  return rect;
}

var randomCircle = function (options) {
  if (_.isEmpty(options)) {
    throw "Error, must provide options to randomCircle!";
  }

  //TODO, better error checking
  var dRange = _.range(options.dMin, options.dMax);
  if (_.isEmpty(dRange)) dRange = [options.dMin]; //hacky for now

  var circle = randomPoint(options);
  circle.d = _.sample(dRange);

  if (!checkInBounds(circle, options)) {
    return this.randomCircle(options);
  }

  return circle;
}

var randomPoint = function (options) {

  var xRange = _.range(options.xMin, options.xMax);
  var yRange = _.range(options.yMin, options.yMax);

  return {
    x: _.sample(xRange),
    y: _.sample(yRange)
  }
}

var colorDiff = function (color1, color2) {
  var subLAB = _.object(['L', 'A', 'B'], hsl2lab(color1));
  var tarLAB = _.object(['L', 'A', 'B'], hsl2lab(color2));
  var diff = Math.round(DeltaE.getDeltaE00(subLAB, tarLAB));
  return diff;
};


// --- below added by jefan March 2017
// extracts all the values of the javascript dictionary by key
var vec = function extractEntries(dict, key) {
  vec = []
  for (i = 0; i < dict.length; i++) {
    vec.push(dict[i][key]);
  }
  return vec;
}

// finds matches to specific value given key
var vec = function matchingValue(dict, key, value) {
  vec = []
  for (i = 0; i < dict.length; i++) {
    if (dict[i][key] == value) {
      vec.push(dict[i]);
    }
  }
  return vec;
}

// add entry to dictionary object
var dict = function addEntry(dict, key, value) {
  for (i = 0; i < dict.length; i++) {
    dict[i][key] = value;
  }
  return dict;
}

// make integer series from lb (lower) to ub (upper)
var series = function makeSeries(lb, ub) {
  series = new Array();
  if (ub <= lb) {
    throw new Error("Upper bound should be greater than lower bound!");
  }
  for (var i = lb; i < (ub + 1); i++) {
    series = series.concat(i);
  }
  return series;
}

// --- above added by jefan March 2017

/**
 * Convert a string of csv numbers to a numbers array
 * @param {String} string string of numbers separated by commas
 */
const toNumArray = function (string) {
  return string.split(',').map(n => Number(n));
}

module.exports = {
  UUID,
  checkPreviousParticipant,
  serveFile,
  handleDuplicate,
  handleInvalidID,
  getLongFormTime,
  // establishStream,
  // writeDataToCSV,
  writeDataToMongo,
  hsl2lab,
  fillArray,
  randomColor,
  randomRect,
  randomCircle,
  randomPoint,
  randomSpline,
  colorDiff,
  toNumArray
};
