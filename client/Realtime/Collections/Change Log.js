var shared = require('../../../shared/shared');

module.exports = {
    GetColsForCollection: GetColsForCollection,
};

function GetColsForCollection(params) {
    params.callback(ReturnColumns(params));
}

function ReturnColumns(params) {
    var colInfo = {
        firstSortedColumn: shared.UpdatedOnProperty,
        firstSortedOrder: "desc",
        cols: [{
            field: "Collection",
            sortable: true,
            switchable: true,
            visible: true,
            filterControl: "input",
        }, {
            field: "User",
            sortable: true,
            switchable: true,
            visible: true,
            filterControl: "input",
        }, {
            field: "Field",
            sortable: true,
            switchable: true,
            visible: true,
            filterControl: "input",
        }, {
            field: "From",
            sortable: true,
            switchable: true,
            visible: true,
            filterControl: "input",
        }, {
            field: "To",
            sortable: true,
            switchable: true,
            visible: true,
            filterControl: "input",
        }, {
            field: "JSON",
            sortable: true,
            switchable: true,
            visible: true,
            filterControl: "input",
            isChangeLogJSON: true,
        },]
    };
    return colInfo;
}