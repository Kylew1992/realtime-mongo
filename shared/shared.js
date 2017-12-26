function guid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function GetEventName(eventName, moreInfo) {
  return moreInfo == null || moreInfo == "" ? eventName : eventName + "_" + moreInfo;
}

String.prototype.replaceAll = function (search, replacement) {
  var target = this;
  return target.replace(new RegExp(search, 'g'), replacement);
};

function RemoveFromArrayByValue(array, element) {
  var index = array.indexOf(element);
  if (index !== -1) {
    array.splice(index, 1);
  }
}

(function (exports) {
  exports = {
    guid: guid,
    GetEventName: GetEventName,
    RemoveFromArrayByValue: RemoveFromArrayByValue,
    ActiveProperty: "Is Active",
    UpdatedOnProperty: "Updated On",
    ResetSessionProperty: "Reset Session",
    CodeNameProperty: "Code Name",
    IsAdminProperty: "Is Admin",
    UserNameProperty: "User Name",
    ChangeLogCollectionName: "Change Log",
    UserCollectionName: "User",
    ErrorLogCollectionName: "Error Log",
    RecordDeletedString: "Record Deleted",
  };
  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = exports;
  }
  else {
    if (typeof define === 'function' && define.amd) {
      define([], function () {
        return exports;
      });
    }
    else {
      window.shared = exports;
    }
  }
}(typeof exports === 'undefined' ? this.shared = {} : exports));