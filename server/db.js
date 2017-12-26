var MongoClient = require('mongodb').MongoClient;
var config = require('./config');
var common = require('./common');

var db;
module.exports = {
  connect: connect,
};

function connect(done) {
  MongoClient.connect(config.MongoURL, function (err, d) {
    if (err) {
      console.log(err);
      process.exit(1);
    }
    db = d;
    common.Initialize(db);
    done(db);
  })
}

function close(done) {
  if (db) {
    db.close(function (err, result) {
      db = null;
      done(err);
    })
  }
}

