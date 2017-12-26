var shared = require('../../../shared/shared');
var common = require('../../../server/common');

module.exports = {
    GetColsForCollection: GetColsForCollection,
};

function GetColsForCollection(params) {
    var options = {
    };
    params.callback(ReturnColumns(options));
}

function ReturnColumns(options) {
    return {
        firstSortedColumn: shared.UpdatedOnProperty,
        firstSortedOrder: "desc",
        cols: [{
            field: "User Name",
            sortable: true,
            switchable: true,
            visible: true,
            filterControl: "input",
            editable: {
                type: "text",
            },
        }, {
            field: "Email",
            sortable: true,
            switchable: true,
            visible: true,
            filterControl: "input",
            editable: {
                type: "text",
                inputclass: 'x-editable-email',
            },
        }, {
            field: shared.IsAdminProperty,
            sortable: true,
            switchable: true,
            visible: true,
            filterControl: "select",
            filterData: common.DistinctYesNo,
            editable: {
                type: "select",
                source: common.YesNoSource,
            }
        }, {
            field: "Password",
            sortable: true,
            switchable: true,
            visible: true,
            filterControl: "input",
            editable: {
                type: "text",
            },
        }, {
            field: shared.ResetSessionProperty,
            sortable: true,
            switchable: true,
            visible: true,
            filterControl: "select",
            filterData: common.DistinctYesNo,
            editable: {
                type: "select",
                source: common.YesNoSource,
            }
        },]
    };
}