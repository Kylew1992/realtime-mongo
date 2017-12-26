var fs = require('fs');
var extend = require('util')._extend;
var nodemailer = require('nodemailer');
var config = require('./config');
var transporter = nodemailer.createTransport(config.EmailTransporter);
var cookie = require('cookie');
var shared = require('../shared/shared');
var db;

function Initialize(d) {
    db = d;
}

function SendMail(mailOptions, callback) {
    mailOptions.from = config.EmailTransporter.auth.user;
    transporter.sendMail(mailOptions, function (err, info) {
        if (err) {
            InsertErrorLog(new Error(err.response), err);
        } else {
            callback(info.response);
        }
    });
}

function GetSourceByJSONObj(obj) {
    var source = []
    for (var i in obj) {
        var val = obj[i];
        source.push({ value: val, text: val });
    }
    return source;
}

function GetCurrentTime(secondsToAdd = 0) {
    var timestamp = +new Date();
    if (secondsToAdd > 0) {
        timestamp += secondsToAdd;
    }
    return timestamp;
}

function GetExactMatchRegex(str) {
    return new RegExp("^(" + str + ")$", "i")
}

function GetParsedCookies(req) {
    return cookie.parse(req.headers.cookie);
}

function InsertErrorLog(err, trueErr) {
    var toInsert = {
        Timestamp: GetCurrentTime(),
        Message: err.message,
        Stack: (err.stack).replaceAll("\n", "<br>"),
    };
    toInsert[shared.CodeNameProperty] = trueErr.codeName || trueErr.code;
    toInsert[shared.ActiveProperty] = true;
    db.collection(shared.ErrorLogCollectionName).insertOne(toInsert);
}

var yesNoList = { 'No': 'No', 'Yes': 'Yes' };

module.exports = {
    Initialize: Initialize,
    SendMail: SendMail,
    GetSourceByJSONObj: GetSourceByJSONObj,
    GetCurrentTime: GetCurrentTime,
    extend: extend,
    GetExactMatchRegex: GetExactMatchRegex,
    GetParsedCookies: GetParsedCookies,
    InsertErrorLog: InsertErrorLog,
    DistinctYesNo: "json:" + JSON.stringify(yesNoList),
    YesNoSource: GetSourceByJSONObj(yesNoList),
};