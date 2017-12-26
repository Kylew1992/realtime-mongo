var express = require("express");
var app = express();
var bodyParser = require('body-parser');
var server = require('http').Server(app);
var io = require('socket.io')(server);
var routes = require('./routes/router.js');
var fs = require('fs');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var RealtimeFunctions = require('../client/Realtime/RealtimeFunctions');
var shared = require('../shared/shared');

fs.readdir('client/Realtime/Collections/', function (err, files) {
    var list = [];
    for (var i in files) {
        var file = files[i];
        var cleanFile = file.replace(/.js/ig, "");
        if (cleanFile != shared.ChangeLogCollectionName) {
            list.push(cleanFile);
        }
    }
    list.sort();
    RealtimeFunctions.SetupEvents(io, list, function (db) {
        routes.Initialize(io, list, db);
        app.use(session({
            secret: 'i wOnder whaTs for diNner mah boi',
            resave: false,
            saveUninitialized: false,
            cookie: {
                //maxAge: 1000 * 30, // 30 secs
            },
            store: new MongoStore({ db: db })
        }));

        app.use(express.static('client/assets'));
        app.use(express.static('shared'));
        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded({ extended: true }));
        app.set("view engine", "ejs");
        app.set('views', 'client');
        app.use('/', routes.router);
        server.listen(8000, function () {
            console.log('Listening on port 8000');
        });
    });
});