var shared = require('../../../shared/shared');
var common = require('../../../server/common');

module.exports = {
    GetColsForCollection: GetColsForCollection,
};

function GetColsForCollection(params) {
    var options = {
    };
    params.callback(ReturnColumns(options), false, false);
}

function ReturnColumns(options) {
    return {
        firstSortedColumn: "Timestamp",
        firstSortedOrder: "desc",
        cols: [{
            field: "Timestamp",
            sortable: true,
            switchable: false,
            visible: true,
            filterControl: "combodate",
        }, {
            field: "Message",
            sortable: true,
            switchable: true,
            visible: true,
            filterControl: "input",
        }, {
            field: shared.CodeNameProperty,
            sortable: true,
            switchable: true,
            visible: true,
            filterControl: "input",
        }, {
            field: "Stack",
            sortable: true,
            switchable: true,
            visible: true,
            filterControl: "input",
            isErrorLogStack: true,
        },]
    };
}