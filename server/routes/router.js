var express = require('express');
var router = express.Router();
var mongo = require('mongodb');
var bcrypt = require('bcrypt');
var shared = require('../../shared/shared');
var config = require('../config');
var common = require('../common');
var userCollection = require('../../client/Realtime/Collections/User');

function GetUserCollection(db) {
  return db.collection(shared.UserCollectionName);
}

function CreateUserIfNoneExist(db) {
  GetUserCollection(db).find({}).count(function (err, nbDocs) {
    if (err) {
      common.InsertErrorLog(new Error(err.message), err);
    }
    if (nbDocs == 0) {
      var toInsert = {
        Password: "ADMIN",
        needToResetPassword: true,
      };
      toInsert[shared.UserNameProperty] = "ADMIN";
      toInsert[shared.IsAdminProperty] = "Yes";
      toInsert[shared.ActiveProperty] = true;
      toInsert[userCollection.Fields.ResetSession] = "No";
      GetUserCollection(db).insertOne(toInsert);
    }
  });
}

function UpdateUserPassword(db, username, password, callback) {
  bcrypt.hash(password, 7, function (err, encryptedPassword) {
    if (err) {
      common.InsertErrorLog(new Error(err.message), err);
    }
    else {
      var findObj = {};
      findObj[shared.UserNameProperty] = common.GetExactMatchRegex(username);
      GetUserCollection(db).updateOne(findObj, { $set: { Password: encryptedPassword }, $unset: { needToResetPassword: 1 } }, {}, callback);
    }
  });
}

function AuthenticateUser(db, username, password, callback) {
  var findObj = {};
  findObj[shared.UserNameProperty] = common.GetExactMatchRegex(username);
  GetUserCollection(db).findOne(findObj, function (err, user) {
    if (err) {
      common.InsertErrorLog(new Error(err.message), err);
      return callback(err);
    } else if (!user) {
      return callback(new Error('User not found.'));
    }
    if (password == user.Password) {
      return callback(null, user);
    }
    else {
      bcrypt.compare(password, user.Password, function (err, result) {
        if (err) {
          common.InsertErrorLog(new Error(err.message), err);
        }
        if (result === true) {
          return callback(null, user);
        } else {
          return callback();
        }
      })
    }
  });
}

function SendResetPasswordCode(req, userInfo, callback) {
  var ipAddress = req.body.ipAddress;
  var geoLocation = req.body.geoLocation;
  var passCode = shared.guid().toUpperCase().substring(0, 6);
  var html = ['Dear ', userInfo[shared.UserNameProperty], ',<br><br>We received a reset password request'];
  if (ipAddress != "" && ipAddress != null) {
    html.push(' from the following IP address: <b>', ipAddress, '</b>');
    if (geoLocation != "" && geoLocation != null) {
      html.push('.<br>According to our records, the request was made from <b>', geoLocation, '</b>');
    }
  }
  html.push('.<br><br>', 'Your pass code is <b>', passCode, '</b>.<br><br>If you did not attempt this action, please disregard this email.<br><br>Thanks,<br><br>Realtime');
  html = html.join("");
  var mailOptions = {
    to: userInfo.Email,
    subject: 'Realtime Password Reset Request',
    html: html,
  };
  common.SendMail(mailOptions, function (info) {
    callback(info, passCode);
  });
}

function Initialize(io, CollectionNameList, db) {
  CreateUserIfNoneExist(db);
  router.get("*", function (req, res, next) {
    res.locals.PageName = req.originalUrl.replace("/", "");
    if (req.session && req.session.LoggedInUser) {
      res.locals.LoggedInUser = req.session.LoggedInUser;
      res.locals.IsAdmin = res.locals.LoggedInUser[shared.IsAdminProperty] == "Yes";
      res.locals.CollectionNameList = common.extend([], CollectionNameList);
      if (res.locals.IsAdmin != true) {
        shared.RemoveFromArrayByValue(res.locals.CollectionNameList, shared.UserCollectionName);
        shared.RemoveFromArrayByValue(res.locals.CollectionNameList, shared.ErrorLogCollectionName);
      }
      res.locals.shared = {
        UserNameProperty: shared.UserNameProperty,
      };
    }
    if (req.path == "/Logout"
      || req.path == "/Login"
      || req.path == "/UpdatePassword"
      || req.path == "/ForgotPassword") {
      return next();
    }
    else {
      if (req.session.LoggedInUser == null) {
        return res.redirect('/Login');
      }
      else {
        GetUserCollection(db).findOne({ _id: mongo.ObjectID(req.session.LoggedInUser._id) }, function (err, user) {
          if (err) {
            common.InsertErrorLog(new Error(err.message), err);
            return next(err);
          } else {
            if (user === null) {
              return res.redirect("/Login");
            } else {
              if (user.needToResetPassword) {
                delete req.session.LoggedInUser;
                req.session.UserNameToLogin = user[shared.UserNameProperty];
                return res.redirect('/UpdatePassword');
              }
              else {
                req.session.LoggedInUser = user;
                res.locals.LoggedInUser = user;
                return next();
              }
            }
          }
        });
      }
    }
  });

  router.get("/", function (req, res) {
    if (req.session && req.session.LoggedInUser) {
      if (req.session.HomeMessage != null) {
        res.locals.HomeMessage = req.session.HomeMessage;
        delete req.session.HomeMessage;
      }
      res.locals.PageName = "Dashboard";
      res.locals.CollectionName = shared.ChangeLogCollectionName;
      res.locals.ChangeLogInfo = {};
      res.render("Realtime/index");
    } else {
      res.redirect('/Login');
    }
  });

  for (var i in CollectionNameList) {
    (function (file) {
      var changeLog = (file + "_" + shared.ChangeLogCollectionName).replaceAll(" ", "_");
      router.get("/" + file.replaceAll(" ", "_"), function (req, res) {
        if (req.session && req.session.LoggedInUser) {
          if (req.session.LoggedInUser[shared.IsAdminProperty] != "Yes" && (file == shared.UserCollectionName || file == shared.ErrorLogCollectionName)) {
            res.redirect("/");
          }
          else {
            res.locals.CollectionName = file;
            res.locals.Title = file;
            res.locals.ChangeLogInfo = {
              ChangeLogURL: changeLog,
            };
            res.render("Realtime/index");
          }
        } else {
          res.redirect('/Login');
        }
      });

      router.get("/" + changeLog, function (req, res) {
        if (req.session && req.session.LoggedInUser) {
          res.locals.CollectionName = shared.ChangeLogCollectionName;
          res.locals.ChangeLogInfo = {
            ChangeLogRecordID: req.query.id,
            ChangeLogCollectionName: req.query.collection,
          };
          res.render("Realtime/index");
        } else {
          res.redirect('/Login');
        }
      });
    })(CollectionNameList[i]);
  }

  router.get('/Login', function (req, res, next) {
    if (req.session && req.session.LoggedInUser) {
      io.emit(shared.GetEventName('WS_UserLoggedInOrOut', req.session.LoggedInUser[shared.UserNameProperty]));
      res.redirect('/');
    }
    else {
      if (req.session.LogInErrorMessage != null) {
        res.locals.LogInErrorMessage = req.session.LogInErrorMessage;
        delete req.session.LogInErrorMessage;
      }
      res.render('Login');
    }
  });

  router.get('/ForgotPassword', function (req, res, next) {
    res.locals.PageName = "Forgot Password";
    if (req.session && req.session.LoggedInUser) {
      res.redirect('/');
    }
    else {
      res.render('ForgotPassword');
    }
  });

  router.get('/UpdatePassword', function (req, res, next) {
    res.locals.PageName = "Update Password";
    if (req.session && req.session.UserNameToLogin != null) {
      if (req.session.UpdatePasswordErrorMessage != null) {
        res.locals.UpdatePasswordErrorMessage = req.session.UpdatePasswordErrorMessage;
        delete req.session.UpdatePasswordErrorMessage;
      }
      res.render('UpdatePassword');
    }
    else {
      res.redirect('/');
    }
  });

  router.post('/Login', function (req, res, next) {
    var logusername = req.body.logusername || req.session.logusername;
    var logpassword = req.body.logpassword || req.session.logpassword;
    if (logusername && logpassword) {
      AuthenticateUser(db, logusername, logpassword, function (err, user) {
        if (err) {
          common.InsertErrorLog(new Error(err.message), err);
        }
        if (err || !user) {
          req.session.LogInErrorMessage = 'Wrong user name or password.';
          return res.redirect('/Login');
        } else if (user[shared.ActiveProperty] != true) {
          req.session.LogInErrorMessage = 'Your account has been deactivated.';
          return res.redirect('/Login');
        }
        else {
          delete req.session.logusername;
          delete req.session.logpassword;
          req.session.LoggedInUser = user;
          return res.redirect('/');
        }
      });
    } else {
      req.session.LogInErrorMessage = 'All fields are required.';
      return res.redirect('/Login');
    }
  });

  router.post('/UpdatePassword', function (req, res, next) {
    if (req.body.password && req.body.confirmpassword) {
      if (req.body.password != req.body.confirmpassword) {
        req.session.UpdatePasswordErrorMessage = 'Passwords do not match.';
        return res.redirect('/UpdatePassword');
      }
      UpdateUserPassword(db, req.session.UserNameToLogin, req.body.password, function (err, numAffected) {
        if (err) {
          common.InsertErrorLog(new Error(err.message), err);
        }
        req.session.logusername = req.session.UserNameToLogin;
        req.session.logpassword = req.body.password;
        delete req.session.UserNameToLogin;
        io.emit('WS_RefreshRealtimeUserTable');
        res.redirect(307, '/Login');
      });
    } else {
      req.session.UpdatePasswordErrorMessage = 'All fields are required.';
      return res.redirect('/UpdatePassword');
    }
  });

  router.post('/ForgotPasswordSendCode', function (req, res, next) {
    if (req.body.email) {
      GetUserCollection(db).findOne({ "Email": common.GetExactMatchRegex(req.body.email) }, function (err, user) {
        if (err) {
          common.InsertErrorLog(new Error(err.message), err);
        }
        if (err || user == null) {
          res.send('There are no users with this Email Address.');
        }
        else {
          SendResetPasswordCode(req, user, function (response, passCode) {
            if (response.indexOf('250') > -1) {
              GetUserCollection(db).updateOne({ _id: user._id }, { $set: { ResetPasswordPassCode: passCode } }, {}, function (err, num) {
                if (err) {
                  common.InsertErrorLog(new Error(err.message), err);
                  res.send('Failed to update user.');
                }
                else {
                  res.send("");
                }
              });
            }
            else {
              res.send('An error occurred when trying to send the email.');
            }
          });
        }
      });
    } else {
      res.send('All fields are required.');
    }
  });

  router.post('/ForgotPasswordEnterCode', function (req, res, next) {
    if (req.body.email && req.body.passcode) {
      GetUserCollection(db).findOne({ Email: common.GetExactMatchRegex(req.body.email), ResetPasswordPassCode: common.GetExactMatchRegex(req.body.passcode) }, function (err, user) {
        if (err) {
          common.InsertErrorLog(new Error(err.message), err);
        }
        if (err || user == null) {
          res.send('Invalid Passcode.');
        }
        else {
          GetUserCollection(db).updateOne({ _id: user._id }, { $set: { needToResetPassword: 1 }, $unset: { ResetPasswordPassCode: 1 } }, {}, function (err, num) {
            if (err) {
              common.InsertErrorLog(new Error(err.message), err);
              res.send('Failed to update user.');
            }
            else {
              req.session.UserNameToLogin = user[shared.UserNameProperty];
              res.send("");
            }
          });
        }
      });
    } else {
      res.send('All fields are required.');
    }
  });

  router.get('/Logout', function (req, res, next) {
    if (req.session) {
      var theUser = req.session.LoggedInUser[shared.UserNameProperty];
      req.session.destroy(function (err) {
        if (err) {
          common.InsertErrorLog(new Error(err.message), err);
          next(err);
        } else {
          io.emit(shared.GetEventName('WS_UserLoggedInOrOut', theUser));
          res.redirect('/Login');
        }
      });
    } else {
      res.redirect('/Login');
    }
  });

  router.get('/*', function (req, res) {
    req.session.HomeMessage = "Page does not exist";
    res.redirect('/');
  });
}

module.exports = {
  router: router,
  Initialize: Initialize,
};