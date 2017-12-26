/*
"c:/program files/mongodb/bin/mongoimport" --db Realtime --collection People --drop --file "C:\Code Projects\Realtime\client\Realtime\importdata.json"
"c:/program files/mongodb/bin/mongoimport" --db Realtime --collection Jobs --drop --file "C:\Code Projects\Realtime\client\Realtime\importdata.json"
"c:/program files/mongodb/bin/mongoimport" --db Realtime --collection Cars --drop --file "C:\Code Projects\Realtime\client\Realtime\importdata.json"

db.People.find().forEach(function (x) {
    x.Balance = parseFloat(x.Balance.replace(",", ""));
    x.Registered = ISODate(x.Registered).valueOf();
    db.People.save(x);
});

db.Jobs.find().forEach(function (x) {
    x.Balance = parseFloat(x.Balance.replace(",", ""));
    x.Registered = ISODate(x.Registered).valueOf();
    db.Jobs.save(x);
});

db.Cars.find().forEach(function (x) {
    x.Balance = parseFloat(x.Balance.replace(",", ""));
    x.Registered = ISODate(x.Registered).valueOf();
    db.Cars.save(x);
});

db.People.find({ Balance: { $gte: 3900, $lt: 4000 } }).pretty()
db.People.count({ Balance: { $gte: 3900, $lt: 4000 } })
db["Change Log"].find({matchingID: ObjectId("5a25ef662893c72d58b7997b")}).sort( { "Updated On": -1 } ).pretty()
db.People.findOneAndUpdate({Test:"12345"}, {$set: {Balance: "$1"}});
db["Change Log"].findOneAndUpdate({_id:ObjectId("5a2c53712d261c30b829837e")}, {$set: {To: "$ 1"}});
db["Change Log"].find({_id:ObjectId("5a2c53712d261c30b829837e")}).pretty()
*/

module.exports = {
    SetupEvents: SetupEvents,
};

var express = require('express');
var router = express.Router();
var db = require('../../server/db');
var mongo = require('mongodb');
var shared = require('../../shared/shared');
var common = require('../../server/common');

var collectionNameList = [{
    "CollectionName": shared.ChangeLogCollectionName,
    "TheModule": require("./Collections/" + shared.ChangeLogCollectionName),
}];

var io;
function SetupEvents(i, collNameList, connectedCallback) {
    io = i;
    for (var i in collNameList) {
        var file = collNameList[i];
        collectionNameList.push({
            "CollectionName": file,
            "TheModule": require("./Collections/" + file),
        });
    }
    // Connect to Mongo on start
    db.connect(function (d) {
        db = d;
        connectedCallback(db);
        GetExistingCollections(function (existingCollList) {
            DeleteCollectionIfNoFileExistsAndHasNoData(0, existingCollList, function () {
                CreateCollectionIfNotExists(0, function () {
                    io.on('connection', function (client) {
                        AttachClientConnectEvent(client);
                        AttachClientDisconnectEvent(client);
                        AttachGlobalRealtimeRefreshEvent(client);
                        for (var i in collectionNameList) {
                            (function (key) {
                                AttachGetColumnsEvent(client, key);
                                AttachGetRecordsEvent(client, key);
                                AttachUpsertRecordsEvent(client, key);
                                AttachDeactivateRecordsEvent(client, key);
                                AttachReactivateRecordsEvent(client, key);
                                AttachDeleteRecordsEvent(client, key);
                            })(collectionNameList[i].CollectionName);
                        }
                    });
                });
            });
        });
    });
}

function GetExistingCollections(callback) {
    db.listCollections().toArray(function (err, collInfos) {
        if (err) {
            common.InsertErrorLog(new Error(err.message), err);
        }
        var existingCollList = [];
        for (var i in collInfos) {
            existingCollList.push(collInfos[i].name);
        }
        callback(existingCollList);
    });
}

function DeleteCollectionIfNoFileExistsAndHasNoData(i, existingCollList, callback) {
    if (i == existingCollList.length) {
        callback();
    }
    else {
        var fn = function () {
            DeleteCollectionIfNoFileExistsAndHasNoData(++i, existingCollList, callback);
        }
        var collName = existingCollList[i];
        db.collection(collName).find({}, { _id: 1 }, {}).count(function (err, nbDocs) {
            if (err) {
                common.InsertErrorLog(new Error(err.message), err);
            }
            if (nbDocs == 0) {
                db.collection(collName).drop(function (err, delOK) {
                    if (err) {
                        common.InsertErrorLog(new Error(err.message), err);
                    }
                    fn();
                });
            }
            else {
                fn();
            }
        });
    }
}

function CreateCollectionIfNotExists(i, callback) {
    if (i == collectionNameList.length) {
        callback();
    }
    else {
        db.createCollection(collectionNameList[i].CollectionName, function (err, res) {
            if (err) {
                common.InsertErrorLog(new Error(err.message), err);
            }
            CreateCollectionIfNotExists(++i, callback);
        });
    }
}

function AttachClientConnectEvent(client) {

}

function AttachClientDisconnectEvent(client) {
    client.on('disconnect', function () {

    });
}

function AttachGetRecordsEvent(client, CollectionName) {
    client.on(shared.GetEventName('WS_GetRecords', CollectionName), function (data) {
        GetRecordsForCollection(data, {}, client);
    });
}

function AttachGlobalRealtimeRefreshEvent(client) {
    client.on('WS_GlobalRealtimeRefresh', function () {
        io.emit('WS_GlobalRealtimeRefresh');
    });
}

function AttachGetColumnsEvent(client, CollectionName) {
    client.on(shared.GetEventName('WS_LoadColumns', CollectionName), function () {
        GetColsForCollection(CollectionName, function (cols, includeUpdatedOn = true) {
            cols.cols.unshift({
                field: "_id",
                sortable: true,
                switchable: false,
                visible: false,
            });
            if (includeUpdatedOn == true) {
                cols.cols.unshift({
                    field: shared.UpdatedOnProperty,
                    sortable: true,
                    switchable: false,
                    visible: true,
                    filterControl: "combodate",
                });
            }
            if (CollectionName != shared.ChangeLogCollectionName) {
                cols.cols.unshift({
                    field: "IsChecked",
                    checkbox: true,
                }, {
                        title: "",
                        isChangeLog: true,
                        switchable: false,
                    });
            }
            client.emit(shared.GetEventName('WS_LoadColumns', CollectionName), cols);
        });
    });
}

function AttachDeactivateRecordsEvent(client, CollectionName) {
    client.on(shared.GetEventName('WS_DeactivateRecords', CollectionName), function (data) {
        DeactivateRecords(client, data);
    });
}

function AttachReactivateRecordsEvent(client, CollectionName) {
    client.on(shared.GetEventName('WS_ReactivateRecords', CollectionName), function (data) {
        ReactivateRecords(client, data);
    });
}

function AttachDeleteRecordsEvent(client, CollectionName) {
    client.on(shared.GetEventName('WS_DeleteRecords', CollectionName), function (data) {
        DeleteRecords(client, data);
    });
}

function AttachUpsertRecordsEvent(client, CollectionName) {
    client.on(shared.GetEventName('WS_UpsertRecords', CollectionName), function (data) {
        var toUpdate = {};
        toUpdate[data.property] = data.value;
        if (data._id.indexOf("NewRow") > -1) {
            InsertRecord(client, data, toUpdate);
        }
        else {
            UpdateRecord(client, mongo.ObjectID(data._id), data, toUpdate);
        }
    });
}

function escapeRegExp(str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$]/g, "\\$&");
}

function GetSortOptions(data) {
    var tempSortOptions = data.SortOptions;
    delete data.SortOptions;
    var sortOptions = {};
    for (var i in tempSortOptions) {
        var so = tempSortOptions[i];
        sortOptions[so.sortName] = so.sortOrder == "desc" ? -1 : 1;
    }
    return sortOptions;
}

function GetValueFromSearchMode(searchMode, value) {
    switch (searchMode) {
        case "Starts With":
            value = "^(" + value + ")";
            break;
        case "Ends With":
            value = "(" + value + ")$";
            break;
        case "Exact Match":
            value = "^(" + value + ")$";
            break;
        case "!Start With":
            value = "^(?!(" + value + "))";
            break;
        case "!Contain":
            value = "^((?!(" + value + ")).)*$";
            break;
        case "!End With":
            value = "(?<!(" + value + "))$";
            break;
        case "!Exact Match":
            value = "^((?!((" + value + "))).)*$";
            break;
        default:
            //Contains
            value = "(" + value + ")";
            break;
    }
    return value;
}

function GetQueryForDateRange(data) {
    var result = {};
    if (data.FromDate != "") {
        result["$gte"] = data.FromDate;
    }
    if (data.ToDate != "") {
        result["$lte"] = data.ToDate;
    }
    return result;
}

function GetQueryForNumberRange(data) {
    var result = {};
    if (data.GTE != "") {
        result["$gte"] = data.GTE;
    }
    if (data.LTE != "") {
        result["$lte"] = data.LTE;
    }
    return result;
}

function GetQuery(data) {
    var query = data.query != null ? data.query : {};
    for (var i in query) {
        var filterOption = query[i];
        if (i != "_id" && i != "matchingID" && i != shared.ActiveProperty) {
            if (filterOption.value != null && filterOption.value.hasOwnProperty("FromDate")) {
                query[i] = GetQueryForDateRange(filterOption.value);
            }
            else if (filterOption.value != null && filterOption.value.hasOwnProperty("GTE")) {
                query[i] = GetQueryForNumberRange(filterOption.value);
            }
            else {
                if (filterOption.value == "FilterEmpty") {
                    query[i] = { '$in': [null, ""] };
                }
                else {
                    var value = escapeRegExp(filterOption.value == null ? "" : filterOption.value);
                    //value = value.replace(new RegExp("\|", 'g'), "|");
                    query[i] = {
                        "$regex": GetValueFromSearchMode(filterOption.searchMode, value),
                        "$options": "isx"
                    };
                }
            }
        }
    }
    if (query.hasOwnProperty("_id")) {
        query._id = mongo.ObjectID(query._id);
    }
    if (query.hasOwnProperty("matchingID")) {
        query.matchingID = mongo.ObjectID(query.matchingID);
    }
    return query;
}

function GetRecordsList(data, callback) {
    var sortOptions = GetSortOptions(data);
    var query = GetQuery(data);
    db.collection(data.CollectionName).find(query, { _id: 1 }, {}).count(function (err, nbDocs) {
        if (err) {
            common.InsertErrorLog(new Error(err.message), err);
        }
        var limitCount = data.PageSize;
        var options = {
            limit: limitCount,
        };
        if (data.PageNumber > 1) {
            options.skip = limitCount * (data.PageNumber - 1);
        }
        db.collection(data.CollectionName).find(query, {}, options).collation({ locale: 'en_US' }).sort(sortOptions).toArray(function (err, resultList) {
            if (err) {
                common.InsertErrorLog(new Error(err.message), err);
            }
            callback({
                total: nbDocs,
                error: err,
                rows: resultList,
                RefreshGrid: data.RefreshGrid == true,
            });
        });
    });
}

var GetDistinctProperty = function (CollectionName, property, activeOnly, callback) {
    var query = {};
    if (activeOnly) {
        query[shared.ActiveProperty] = true;
    }
    db.collection(CollectionName).distinct(property, query, function (err, arr) {
        if (err) {
            common.InsertErrorLog(new Error(err.message), err);
        }
        arr.sort();
        var json = {};
        for (var i in arr) {
            var val = arr[i];
            json[val] = val;
        }
        callback(json);
    });
}

function CheckIfDifferent(toUpdate, previousValue) {
    var isDifferent = false;
    for (var key in toUpdate) {
        if (toUpdate[key] != previousValue[key]) {
            isDifferent = true;
            break;
        }
    }
    return isDifferent;
}

function UpdateRecord(client, o_id, data, toUpdate) {
    GetUserInfoFromClientSocket(client, function (userInfo) {
        db.collection(data.CollectionName).find({ _id: o_id }, {}, { limit: 1 }).toArray(function (err, resultList) {
            if (err) {
                common.InsertErrorLog(new Error(err.message), err);
            }
            var previousValue = resultList[0];
            var isDifferent = CheckIfDifferent(toUpdate, previousValue);
            var callback = function () {
                data.RefreshGrid = true;
                data.query = {
                    _id: o_id,
                };
                GetRecordsForCollection(data);
            };
            if (isDifferent) {
                if (data.CollectionName == shared.UserCollectionName && toUpdate.hasOwnProperty('Password')) {
                    toUpdate.needToResetPassword = true;
                }
                toUpdate[shared.UpdatedOnProperty] = common.GetCurrentTime();
                if (data.CollectionName == shared.UserCollectionName && toUpdate.hasOwnProperty(shared.ResetSessionProperty)) {
                    toUpdate[shared.ResetSessionProperty] = "No";
                }
                db.collection(data.CollectionName).updateOne({ "_id": o_id }, { $set: toUpdate }, {}, function (err, result) {
                    if (err) {
                        common.InsertErrorLog(new Error(err.message), err);
                    }
                    delete toUpdate[shared.UpdatedOnProperty];
                    delete toUpdate.needToResetPassword;
                    var keyList = Object.keys(toUpdate);
                    for (var i in keyList) {
                        (function (i) {
                            var key = keyList[i];
                            var toInsert = {
                                matchingID: o_id,
                                Field: key,
                                From: previousValue[key],
                                To: toUpdate[key],
                                User: userInfo[shared.UserNameProperty],
                                Collection: data.CollectionName,
                            };
                            toInsert[shared.UpdatedOnProperty] = common.GetCurrentTime();
                            InsertChangeLogRecord(toInsert, function () {
                                if (i == keyList.length - 1) {
                                    RefreshChangeLog(toInsert.Collection, toInsert.matchingID);
                                    UserDataChanged(data.CollectionName, previousValue[shared.UserNameProperty], userInfo[shared.UserNameProperty], toUpdate);
                                    callback();
                                }
                            });
                        }(i));
                    }
                });
            }
            else {
                callback();
            }
        });
    });
}

function UserDeactivated(CollectionName, obj_ids, userWhoMadeChanges) {
    if (CollectionName == shared.UserCollectionName) {
        db.collection(CollectionName).find({ _id: { $in: obj_ids } }).toArray(function (err, resultList) {
            if (err) {
                common.InsertErrorLog(new Error(err.message), err);
            }
            for (var i in resultList) {
                UserDataChanged(CollectionName, resultList[i][shared.UserNameProperty], userWhoMadeChanges, "Your account was deactivated.", true)
            }
        });
    }
}

function UserDataChanged(CollectionName, username, userWhoMadeChanges, fieldsChanged, deleteSession = false) {
    if (CollectionName == shared.UserCollectionName) {
        if (fieldsChanged.hasOwnProperty("Password")) {
            deleteSession = true;
        }
        if (fieldsChanged.hasOwnProperty(shared.ResetSessionProperty)) {
            deleteSession = true;
            fieldsChanged[shared.ResetSessionProperty] = "Yes";
        }
        var cb = function () {
            io.emit(shared.GetEventName('WS_UserDataChanged', username), userWhoMadeChanges, fieldsChanged);
        }
        if (deleteSession) {
            //if the user was assigned a temporary password or if their session was reset, then we need to log them out
            DeleteUserSession(username, cb);
        }
        else {
            cb();
        }
    }
}

function RefreshChangeLog(CollectionName, ID) {
    var options = {
        CollectionName: CollectionName,
    };
    if (ID != null) {
        options.ID = ID;
    }
    io.emit(shared.GetEventName('WS_RefreshChangeLog', shared.ChangeLogCollectionName), options);
}

function GetRecordsForCollection(data, moreOptions, client) {
    GetRecordsList(data, function (result) {
        if (moreOptions != null) {
            for (var i in moreOptions) {
                result[i] = moreOptions[i];
            }
        }
        var toUse = client != null ? client : io;
        toUse.emit(shared.GetEventName('WS_GetRecords', data.CollectionName), result);
    });
}

function InsertRecord(client, data, toInsert) {
    GetUserInfoFromClientSocket(client, function (userInfo) {
        toInsert[shared.ActiveProperty] = true;
        toInsert[shared.UpdatedOnProperty] = common.GetCurrentTime();
        if (data.CollectionName == shared.UserCollectionName) {
            if (!toInsert.hasOwnProperty(shared.IsAdminProperty)) {
                toInsert[shared.IsAdminProperty] = "No";
            }
            toInsert[shared.ResetSessionProperty] = "No";
        }
        db.collection(data.CollectionName).insertOne(toInsert, function (err, result) {
            if (err) {
                common.InsertErrorLog(new Error(err.message), err);
            }
            data.RefreshGrid = true;
            data.query = {
                _id: mongo.ObjectID(result.insertedId),
            };
            var changeLogToInsert = {
                matchingID: result.insertedId,
                Field: "Record Created",
                From: "",
                To: "",
                User: userInfo[shared.UserNameProperty],
                Collection: data.CollectionName,
            };
            changeLogToInsert[shared.UpdatedOnProperty] = common.GetCurrentTime();
            InsertChangeLogRecord(changeLogToInsert, function () {
                var keyList = Object.keys(toInsert);
                var key = keyList[0];
                delete changeLogToInsert._id;
                changeLogToInsert.Field = key;
                changeLogToInsert.From = "";
                changeLogToInsert.To = toInsert[key];
                changeLogToInsert[shared.UpdatedOnProperty] = common.GetCurrentTime(1);
                InsertChangeLogRecord(changeLogToInsert, function () {
                    RefreshChangeLog(changeLogToInsert.Collection, changeLogToInsert.matchingID);
                    GetRecordsForCollection(data, {
                        guid: data._id
                    });
                });
            });
        });
    });
}

function DeactivateRecords(client, data) {
    GetUserInfoFromClientSocket(client, function (userInfo) {
        var obj_ids = data.ids.map(function (id) { return mongo.ObjectId(id); });
        var set = {};
        set[shared.ActiveProperty] = false;
        set[shared.UpdatedOnProperty] = common.GetCurrentTime();
        db.collection(data.CollectionName).updateMany({ _id: { $in: obj_ids } }, { $set: set }, function (err, result) {
            if (err) {
                common.InsertErrorLog(new Error(err.message), err);
            }
            for (var i in data.ids) {
                (function (i) {
                    var toInsert = {
                        matchingID: mongo.ObjectID(data.ids[i]),
                        Field: "Record Deactivated",
                        From: "",
                        To: "",
                        User: userInfo[shared.UserNameProperty],
                        Collection: data.CollectionName,
                    };
                    toInsert[shared.UpdatedOnProperty] = common.GetCurrentTime();
                    InsertChangeLogRecord(toInsert, function () {
                        if (i == data.ids.length - 1) {
                            RefreshChangeLog(toInsert.Collection, toInsert.matchingID);
                            UserDeactivated(data.CollectionName, obj_ids, userInfo[shared.UserNameProperty]);
                            io.emit(shared.GetEventName('WS_ForceSearch', data.CollectionName), data.ids);
                        }
                    });
                }(i));
            }
        });
    });
}

function ReactivateRecords(client, data) {
    GetUserInfoFromClientSocket(client, function (userInfo) {
        var obj_ids = data.ids.map(function (id) { return mongo.ObjectId(id); });
        var set = {};
        set[shared.ActiveProperty] = true;
        set[shared.UpdatedOnProperty] = common.GetCurrentTime();
        db.collection(data.CollectionName).updateMany({ _id: { $in: obj_ids } }, { $set: set }, function (err, result) {
            if (err) {
                common.InsertErrorLog(new Error(err.message), err);
            }
            for (var i in data.ids) {
                (function (i) {
                    var toInsert = {
                        matchingID: mongo.ObjectID(data.ids[i]),
                        Field: "Record Re-activated",
                        From: "",
                        To: "",
                        User: userInfo[shared.UserNameProperty],
                        Collection: data.CollectionName,
                    };
                    toInsert[shared.UpdatedOnProperty] = common.GetCurrentTime();
                    InsertChangeLogRecord(toInsert, function () {
                        if (i == data.ids.length - 1) {
                            RefreshChangeLog(toInsert.Collection, toInsert.matchingID);
                            io.emit(shared.GetEventName('WS_ForceSearch', data.CollectionName), data.ids);
                        }
                    });
                }(i));
            }
        });
    });
}

function DeleteRecords(client, data) {
    GetUserInfoFromClientSocket(client, function (userInfo) {
        var obj_ids = data.ids.map(function (id) { return mongo.ObjectId(id); });
        db.collection(data.CollectionName).find({ _id: { $in: obj_ids } }).toArray(function (err, results) {
            if (err) {
                common.InsertErrorLog(new Error(err.message), err);
            }
            for (var i in results) {
                (function (i) {
                    var record = results[i];
                    var toInsert = {
                        matchingID: record._id,
                        Field: shared.RecordDeletedString,
                        From: "",
                        To: "",
                        User: userInfo[shared.UserNameProperty],
                        Collection: data.CollectionName,
                        JSON: JSON.stringify(record, null, "\t"),
                    };
                    toInsert[shared.UpdatedOnProperty] = common.GetCurrentTime();
                    InsertChangeLogRecord(toInsert, function () {
                        if (i == data.ids.length - 1) {
                            db.collection(data.CollectionName).deleteMany({ _id: { $in: obj_ids } }, function (err, result) {
                                if (err) {
                                    common.InsertErrorLog(new Error(err.message), err);
                                }
                                RefreshChangeLog(toInsert.Collection, toInsert.matchingID);
                                io.emit(shared.GetEventName('WS_ForceSearch', data.CollectionName), data.ids);
                            });
                        }
                    });
                }(i));
            }
        });
    });
}

function GetColsForCollection(CollectionName, callback) {
    var found = false;
    var params = {
        CollectionName: CollectionName,
        GetDistinctProperty: GetDistinctProperty,
        callback: callback,
    };
    for (var i in collectionNameList) {
        var coll = collectionNameList[i];
        if (coll.CollectionName == CollectionName) {
            found = true;
            coll.TheModule.GetColsForCollection(params);
            break;
        }
    }
    if (!found) {
        callback([{ field: "No Columns defined for this collection!" }]);
    }
}

function InsertChangeLogRecord(toInsert, callback) {
    if (toInsert.Collection == shared.UserCollectionName && toInsert.Field == shared.ResetSessionProperty) {
        callback();
    }
    else {
        db.collection(shared.ChangeLogCollectionName).insertOne(toInsert, function (err, result) {
            if (err) {
                common.InsertErrorLog(new Error(err.message), err);
            }
            callback();
        });
    }
}

function FindSessionByQuery(query, callback) {
    db.collection("sessions").findOne(query, function (err, session) {
        if (err) {
            common.InsertErrorLog(new Error(err.message), err);
        }
        callback(session);
    });
}

function GetSessionFromClietSocket(client, callback) {
    var parsed_cookies = common.GetParsedCookies(client.request);
    var connect_sid = parsed_cookies['connect.sid'];
    if (connect_sid) {
        var startIDX = connect_sid.indexOf("s:") + 2;
        var endIDX = connect_sid.indexOf(".");
        connect_sid = connect_sid.substr(startIDX, endIDX - startIDX);
        FindSessionByQuery({ _id: connect_sid }, callback);
    }
}

function GetUserInfoFromClientSocket(client, callback) {
    GetSessionFromClietSocket(client, function (session) {
        var userInfo = JSON.parse(session.session).LoggedInUser;
        callback(userInfo);
    });
}

function DeleteUserSession(username, callback) {
    var query = {
        "session": {
            "$regex": GetValueFromSearchMode("Contains", "\"User Name\":\"" + username + "\""),
            "$options": "$i",
        }
    };
    FindSessionByQuery(query, function (session) {
        if (session != null) {
            db.collection("sessions").deleteOne({ _id: session._id }, function (err, result) {
                if (err) {
                    common.InsertErrorLog(new Error(err.message), err);
                }
                callback();
            });
        }
        else {
            callback();
        }
    });
}

