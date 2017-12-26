var common = require('../../../server/common');

module.exports = {
    GetColsForCollection: GetColsForCollection,
};

var eyeColorList = {
    'Amber': 'Amber',
    'Blue': 'Blue',
    'Brown': 'Brown',
    'Gray': 'Gray',
    'Green': 'Green',
    'Hazel': 'Hazel',
    'Red': 'Red',
    'Violet': 'Violet'
};

var genderList = {
    'Female': 'Female',
    'Male': 'Male',
};

function GetColsForCollection(params){
    var options = {
        DistinctEyeColors: "json:" + JSON.stringify(eyeColorList),
        EyeColorSource: common.GetSourceByJSONObj(eyeColorList),
        DistinctGender: "json:" + JSON.stringify(genderList),
        GenderSource: common.GetSourceByJSONObj(genderList),
    }
    params.callback(ReturnColumns(options));
}

function ReturnColumns(options) {
    return {
        firstSortedColumn: "Name",
        firstSortedOrder: "asc",
        pageSize: 10,
        cols: [{
            field: "Test",
            sortable: true,
            switchable: true,
            visible: true,
            filterControl: "input",
            editable: {
                type: "text",
            },
        }, {
            field: "Balance",
            sortable: true,
            switchable: true,
            visible: true,
            iscurrency: true,
            filterControl: "number",
            editable: {
                type: "text",
                inputclass: 'x-editable-currency',
            },
        }, {
            field: "Picture",
            sortable: true,
            switchable: true,
            visible: true,
            filterControl: "input",
            editable: {
                type: "text",
            },
        }, {
            field: "Age",
            sortable: true,
            switchable: true,
            visible: true,
            filterControl: "number",
            editable: {
                type: "number",
                min: 1,
                max: 130,
            },
        }, {
            field: "Eye Color",
            sortable: true,
            switchable: true,
            visible: true,
            filterControl: "select",
            filterData: options.DistinctEyeColors,
            editable: {
                type: "select",
                source: options.EyeColorSource,
            }
        }, {
            field: "Name",
            sortable: true,
            switchable: true,
            visible: true,
            filterControl: "input",
            editable: {
                type: "text",
            },
        }, {
            field: "Gender",
            sortable: true,
            switchable: true,
            visible: true,
            filterControl: "select",
            filterData: options.DistinctGender,
            editable: {
                type: "select",
                source: options.GenderSource,
            }
        }, {
            field: "Company",
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
            field: "Phone",
            sortable: true,
            switchable: true,
            visible: true,
            filterControl: "input",
            editable: {
                type: "text",
                inputclass: 'x-editable-phone',
            },
        }, {
            field: "Address",
            sortable: true,
            switchable: true,
            visible: true,
            filterControl: "input",
            editable: {
                type: "textarea",
            },
        }, {
            field: "About",
            sortable: true,
            switchable: true,
            visible: true,
            filterControl: "input",
            editable: {
                type: "textarea",
            },
        }, {
            field: "Registered",
            sortable: true,
            switchable: true,
            visible: true,
            filterControl: "combodate",            
            editable: {
                type: "combodate",
            },
        },]
    };
}