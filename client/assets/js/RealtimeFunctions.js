var refreshGridInterval = null;
var columnFilters = {};
var comboDateOptions = {
    firstItem: 'name',
    minuteStep: 1,
};

$(function () {
    socket.on(shared.GetEventName('WS_GetRecords', CollectionName), WS_GetRecords);
    socket.on(shared.GetEventName('WS_LoadColumns', CollectionName), WS_LoadColumns);
    socket.on(shared.GetEventName('WS_ForceSearch', CollectionName), DoSearch);
    socket.on('WS_GlobalRealtimeRefresh', DoSearch);

    if (CollectionName == shared.ChangeLogCollectionName) {
        socket.on(shared.GetEventName('WS_RefreshChangeLog', CollectionName), WS_RefreshChangeLog);
    }

    if (CollectionName == shared.UserCollectionName) {
        //We need to refresh the User page, when the user updates their password
        socket.on('WS_RefreshRealtimeUserTable', DoSearch);
    }

    $("#btnAddRecord").click(AddRecord);
    $("#btnDeleteRecord").click(DeleteRecord);
    $("#btnToggleInactiveRecords").click(ToggleInactiveRecords);

    UpdateBootstrapTableFunctions();
    UpdateXEditableFunctions();
    socket.emit(shared.GetEventName('WS_LoadColumns', CollectionName));
});

function WS_RefreshChangeLog(data) {
    if (ChangeLogRecordID == "" ||
        (data.CollectionName.toLowerCase() == ChangeLogCollectionName.toLowerCase() && data.ID.toLowerCase() == ChangeLogRecordID.toLowerCase())) {
        DoSearch();
    }
}

function WS_GetRecords(dataList) {
    if (dataList != null) {
        if (dataList.RefreshGrid == true) {
            var match = GetMatchingRecord(dataList["guid"] != null ? dataList.guid : dataList.rows[0]._id);
            if (match != null && match.data != null) {
                if (dataList["guid"] != null) {
                    match.data._id = dataList.rows[0]._id;
                    $("#" + dataList.guid).attr('id', match.data._id);
                }
            }
            DoSearch();
        }
        else {
            $('#Realtime_Table').bootstrapTable('load', dataList);
        }
    }
    $('#LoadingIcon').hide();
}

function WS_LoadColumns(dataList) {
    $('#Realtime_Table').bootstrapTable({
        columns: GetColumnList(dataList.cols),
        data: [],
        checkboxHeader: true,
        pagination: true,
        striped: true,
        showColumns: true,
        editable: true,
        editableMode: "inline",
        onEditableShown: XEditableShown,
        showMultiSort: true,
        reorderableColumns: true,
        maxMovingRows: 1,
        sortName: dataList.firstSortedColumn,
        sortOrder: dataList.firstSortedOrder == null ? "asc" : dataList.firstSortedOrder,
        trimOnSearch: true,
        toolbar: ".Realtime_Table_Toolbar",
        searchTimeOut: 1000,
        pageSize: dataList.pageSize || 10,
        sidePagination: "server",
        undefinedText: "",
        customSort: DoSearch,
        onPageChange: DeleteAnyNewRows,
        onPostHeader: function () {
            $(".column-filter-link").off("click").on("click", ShowColumnFilterModal);
            $(".filter-show-clear").off("click").on("click", ClearFilterButton);
        },
    });
    $('.fixed-table-toolbar > .columns').prepend('<span id="SearchTimer"></span><i id="LoadingIcon" style="display: none;" class="fa fa-spinner fa-pulse fa-2x fa-fw"></i>');
    $('.fixed-table-toolbar > .columns').append('<button class="btn btn-default filter-show-clear" type="button" title="Clear Filters"><i class="glyphicon glyphicon-ban-circle icon-clear"></i></button>');
    $('#SearchTimer').hide();
    AttachTableEvents();
}

function DeleteAnyNewRows() {
    var ids = $.map($('#Realtime_Table').bootstrapTable('getData'), function (row) {
        return row._id;
    });
    DeleteNewRows(ids);
}

function DoSearch() {
    $("#Realtime_Table").bootstrapTable('initServer');
}

function AddRecord(e) {
    if (AreActiveRecords()) {
        if ($("[id^='NewRow']").length == 0) {
            var newRow = {};
            var columnList = $("#Realtime_Table").bootstrapTable('getColumns');
            for (var i in columnList) {
                newRow[columnList[i].field] = null;
            }
            newRow._id = "NewRow" + shared.guid();
            $('#Realtime_Table').bootstrapTable('insertRow', { index: 0, row: newRow });
        }
    }
    else {
        var ids = $.map($('#Realtime_Table').bootstrapTable('getSelections'), function (row) {
            return row._id;
        });
        socket.emit(shared.GetEventName('WS_ReactivateRecords', CollectionName), {
            ids: ids,
            CollectionName: CollectionName,
        });
    }
}

function DateTimeColumnFormatter(value, row, index) {
    if (value != null) {
        value = moment(value).format(defaultDateTimeFormat);
    }
    return value;
}

function CurrencyColumnFormatter(value, row, index) {
    if (value != null) {
        value = "$ " + parseFloat(value).toFixed(2);
    }
    return value;
}

function ChangeLogFormatter(value, row, index) {
    if (row._id.indexOf("NewRow") > -1) {
        return '';
    }
    return '<a href="javascript:void(0)" title="View Change Log"><i class="changeLogIcon fa fa-history"></i></a>';
}

function ViewChangeLog(e, value, row, index) {
    BootstrapDialog.show({
        title: "Change Log",
        cssClass: "ChangeLogDialog",
        message: '<iframe style="border: none; height: 630px; width: 100%;" src="/' + ChangeLogURL + '?id=' + row._id + '&collection=' + CollectionName + '"></iframe>',
    });
}

function StackFormatter(value, row, index) {
    if (row._id.indexOf("NewRow") > -1) {
        return '';
    }
    return '<a href="javascript:void(0)" title="View Stack Trace"><i class="stackIcon fa fa-stack-exchange"></i></a>';
}

function ViewStackTrace(e, value, row, index) {
    ShowTruncatedModal(value);
}

function JSONFormatter(value, row, index) {
    if (row._id.indexOf("NewRow") > -1 || row.Field != shared.RecordDeletedString) {
        return '';
    }
    return '<a href="javascript:void(0)" title="View JSON"><i class="jsonIcon fa fa-code"></i></a>';
}

function ViewJSON(e, value, row, index) {
    ShowTruncatedModal(value);
}

function DeleteNewRows(ids) {
    var newIDsToDelete = [];
    for (var i = 0; i < ids.length; i++) {
        var theID = ids[i];
        if (theID.indexOf("NewRow") > -1) {
            //these haven't been created in the DB yet so its ok to remove them
            newIDsToDelete.push(theID);
            ids.splice(i, 1);
            --i;
        }
    }
    if (newIDsToDelete.length > 0) {
        $('#Realtime_Table').bootstrapTable('remove', {
            field: '_id',
            values: newIDsToDelete,
        });
    }
}

function AreActiveRecords() {
    return $("#btnToggleInactiveRecords").hasClass("activerecords");
}

function ToggleInactiveRecords(e) {
    DeleteAnyNewRows();
    var text = "Show Inactive Records";
    if ($(e.currentTarget).text() == text) {
        $(e.currentTarget).text("Show Active Records");
        $(e.currentTarget).removeClass("activerecords").addClass("inactiverecords");
        $("#btnAddRecordIcon").removeClass("glyphicon-plus").addClass("glyphicon-off");
        $("#btnDeleteRecordIcon").removeClass("glyphicon-off").addClass("glyphicon-trash");
        $("#btnAddRecord").attr("title", "Re-activate Records");
        $("#btnDeleteRecord").attr("title", "Delete Records");
    }
    else {
        $(e.currentTarget).text(text);
        $(e.currentTarget).removeClass("inactiverecords").addClass("activerecords");
        $("#btnAddRecordIcon").removeClass("glyphicon-off").addClass("glyphicon-plus");
        $("#btnDeleteRecordIcon").removeClass("glyphicon-trash").addClass("glyphicon-off");
        $("#btnAddRecord").attr("title", "Add a New Record");
        $("#btnDeleteRecord").attr("title", "Deactivate Records");
    }
    DoSearch();
}

function DeleteRecord(e) {
    var ids = $.map($('#Realtime_Table').bootstrapTable('getSelections'), function (row) {
        return row._id;
    });
    if (AreActiveRecords()) {
        DeleteNewRows(ids);
        socket.emit(shared.GetEventName('WS_DeactivateRecords', CollectionName), {
            ids: ids,
            CollectionName: CollectionName,
        });
    }
    else {
        ConfirmModal("Delete Record(s)?", "Are you sure you want to delete these record(s)?<br>This operation cannot be undone.", function (result) {
            if (result) {
                socket.emit(shared.GetEventName('WS_DeleteRecords', CollectionName), {
                    ids: ids,
                    CollectionName: CollectionName,
                });
            }
        });
    }
}

function UpdateXEditableFunctions() {
    //This is important! without it edit mode will end when the user clicks another element on the screen
    //This forces them to either click the X or checkmark in order to finish editing
    $.fn.editable.defaults.onblur = "";
    $.fn.combodate.defaults.maxYear = new Date().getFullYear();
    $.fn.combodate.defaults.minYear = 1800;
    $.fn.editabletypes.combodate.prototype.value2html = function (value, element) {
        var text = value;
        if (this.options.viewformat) {
            text = moment(text).format(this.options.viewformat)
        }
        $.fn.editabletypes.combodate.superclass.value2html.call(this, text, element);
    };

    $.fn.editabletypes.combodate.prototype.value2input = function (value) {
        this.$input.combodate('setValue', value != null && value.hasOwnProperty("_i") ? value._i : value);
    };

    $.fn.editabletypes.combodate.prototype.input2value = function () {
        return this.$input.combodate('getValue', null);
    };
}

function UpdateBootstrapTableFunctions() {
    $.fn.bootstrapTable.defaults.icons.clear = 'glyphicon-ban-circle icon-clear';
    var BootstrapTable = $.fn.bootstrapTable.Constructor;
    BootstrapTable.prototype.initServer = function () {
        var that = this;
        var firstItem = that.data.length > 0 ? that.data[0] : null;
        if (firstItem != null && firstItem._id.indexOf("NewRow") > -1) {
            $("#SearchTimer").text("Cannot search with a new row.");
            $("#SearchTimer").show();
        }
        else {
            if (refreshGridInterval == null) {
                refreshGridInterval = setInterval(function () {
                    if ($(".editable-input").length == 0) {
                        clearInterval(refreshGridInterval);
                        refreshGridInterval = null;
                        $("#SearchTimer").hide();
                        $('#LoadingIcon').show();
                        var options = {
                            CollectionName: CollectionName,
                            query: GetQuery(),
                            SortOptions: GetSortOptions(that.options),
                            PageNumber: that.options.pageNumber,
                            PageSize: that.options.pageSize,
                        };
                        socket.emit(shared.GetEventName('WS_GetRecords', CollectionName), options);
                    }
                }, 0);
            }
        }
    };
    BootstrapTable.prototype.getColumns = function () {
        return this.columns;
    };
    $.fn.bootstrapTable.methods.push('getColumns', 'initServer');
}

function GetQuery() {
    var query = {};
    for (var key in columnFilters) {
        var item = columnFilters[key];
        var value = item.value;
        if (value != null) {
            if (value.constructor === Array) {
                value = $.extend(true, [], value);
                value = value.join("|");
            }
            else if (value.hasOwnProperty("FromDate")) {
                value = $.extend(true, {}, value);
                if (value.FromDate != "") {
                    value.FromDate = +moment(value.FromDate, value.DateTimeFormat) - 59999;
                }
                if (value.ToDate != "") {
                    if (value.IsDateOnly == true) {
                        value.ToDate = +moment(value.ToDate, value.DateTimeFormat) + ((24 * 60 * 60 * 1000) - 1); //add 23 hrs, 59 minutes, 59 seconds
                    }
                    else {
                        value.ToDate = +moment(value.ToDate, value.DateTimeFormat) + 59999;
                    }
                }
            }
        }
        query[key] = {
            value: value,
            searchMode: item.SearchMode,
        };
    }
    if (CollectionName == shared.ChangeLogCollectionName) {
        if (ChangeLogRecordID != "") {
            query.Collection = {
                value: ChangeLogCollectionName,
                searchMode: "Exact Match",
            };
            query.matchingID = ChangeLogRecordID;
        }
    }
    else {
        query[shared.ActiveProperty] = AreActiveRecords();
    }
    return query;
}

function GetSortOptions(options) {
    var sortOptions = options.sortPriority;
    if (options.sortName != "") {
        sortOptions = {
            0: {
                sortName: options.sortName,
                sortOrder: options.sortOrder,
            },
        };
    }
    return sortOptions;
}

function ValidateEditableCell(elem, value, col) {
    var tempVal = $.trim(value);
    if (col.isrequired == true && !tempVal) {
        return 'This field is required';
    }
    if (col.filterControl == "number") {
        tempVal = tempVal.replaceAll("\\$", "").replaceAll(" ", "").replaceAll(",", "");
        if (isNaN(tempVal)) {
            return 'This field must be numeric';
        }
        else {
            tempVal = parseFloat(tempVal);
        }
    }
    if (tempVal && col.editable && col.editable.combodate) {
        value = new moment(value).valueOf()
    }
    else {
        value = tempVal;
    }
    var data = GetMatchingRecord($(elem).parents('tr').attr('id')).data;
    var key = col.field;
    socket.emit(shared.GetEventName('WS_UpsertRecords', CollectionName), {
        _id: data._id,
        CollectionName: CollectionName,
        property: key,
        value: value,
    });
    return '';
}

function AttachTableEvents() {
    $('#Realtime_Table').on('focus', '.editable-input > input', function (e) {
        if ($(e.currentTarget).hasClass("x-editable-phone")) {
            $(e.currentTarget).inputmask({ mask: "(999) 999-9999" });
        }
        if ($(e.currentTarget).hasClass("x-editable-email")) {
            $(e.currentTarget).inputmask({ alias: "email" });
        }
        if ($(e.currentTarget).hasClass("x-editable-currency")) {
            $(e.currentTarget).inputmask({ alias: "currency" });
        }
    });
    //AttachGetOffsetEvent();
}

function ClearFilterButton(e) {
    e.stopPropagation();
    columnFilters = {};
    $(".column-filter-link").removeClass("text-danger");
    DoSearch();
}

function GetSearchModeSelectHTML(col) {
    var html = [];
    if (col.filterControl != "number") {
        if (col.filterControl == "input" || col.filterControl == "select") {
            html.push('<select id="Column-Filter-SearchMode" class="form-control pull-right filter-control-searchmode selectpicker filter-control-selectpicker" data-style="filter-control-selectpicker" data-width="130px">');
            if (col.filterControl == "input") {
                html.push('<option>Starts With</option>',
                    '<option>Contains</option>',
                    '<option>Ends With</option>');
            }
            html.push('<option>Exact Match</option>');
            if (col.filterControl == "input") {
                html.push('<option>!Start With</option>',
                    '<option>!Contain</option>',
                    '<option>!End With</option>');
            }
            html.push('<option>!Exact Match</option>',
                '</select>');
        }
    }
    return html.join("");
}

function GetColumnFilterInputElementHTML(col, value) {
    var html = GetSearchModeSelectHTML(col);
    if (value == "FilterEmpty") {
        value = "";
    }
    if (col.filterControl == "select") {
        html += '<select id="Column-Filter-Input" class="form-control selectpicker filter-control-selectpicker" multiple data-style="filter-control-selectpicker">';
        var options = col.filterData.replace("json:", "");
        options = JSON.parse(options);
        for (var key in options) {
            html += '<option value="' + options[key] + '">' + key + "</option>";
        }
        html += '</select>';
    }
    else if (col.filterControl == "combodate") {
        html += ['<p style="margin: 0px;">From Date:</p>',
            '<div class="form-inline">',
            '<input id="Column-Filter-Input-FromDate" type="text" data-format="' + col.filterControlFormat + '" data-template="' + col.filterControlTemplate + '">',
            '<button class="btn btn-info" style="margin-left: 5px;" id="Column-Filter-Input-FromDate-Clear">Clear</button>',
            '<p style="margin: 10px 0px 0px 0px; display: none;" id="Column-Filter-Input-FromDate-Invalid"></p>',
            '</div>',
            '<p style="margin: 10px 0px 0px 0px;">To Date:</p>',
            '<div class="form-inline">',
            '<input id="Column-Filter-Input-ToDate" type="text" data-format="' + col.filterControlFormat + '" data-template="' + col.filterControlTemplate + '">',
            '<button class="btn btn-info" style="margin-left: 5px;" id="Column-Filter-Input-ToDate-Clear">Clear</button>',
            '<p style="margin: 10px 0px 0px 0px; display: none;" id="Column-Filter-Input-ToDate-Invalid"></p>',
            '</div>',
        ].join("");
    }
    else if (col.filterControl == "number") {
        var GTE = value != null ? value.GTE : null;
        var LTE = value != null ? value.LTE : null;
        html += ['<div class="row">',
            '<div class="col-sm-6">Greater Than Or Equal To',
            '<input id="Column-Filter-Input-GTE" type="number" class="form-control" ' + (GTE != null ? 'value="' + GTE + '"' : '') + '>',
            '<p style="margin: 10px 0px 0px 0px; display: none;" id="Column-Filter-Input-GTE-Invalid"></p>',
            '</div>',
            '<div class="col-sm-6">Less Than Or Equal To',
            '<input id="Column-Filter-Input-LTE" type="number" class="form-control" ' + (LTE != null ? 'value="' + LTE + '"' : '') + '>',
            '<p style="margin: 10px 0px 0px 0px; display: none;" id="Column-Filter-Input-LTE-Invalid"></p>',
            '</div>',
            '</div>',
        ].join("");
    }
    else {
        html += '<input id="Column-Filter-Input" type="text" class="form-control" value="' + value + '">';
    }
    html = '<label class="no-highlight"><input id="Column-Filter-Empty" type="checkbox"> Filter Empty Records</label>' + '<div id="Column-Filter-Form">' + html + '</div>';
    return html;
}

function ClearFilterDate($el) {
    $el.closest(".form-inline").removeClass("has-error");
    $el.combodate('clearValue');
    $("#" + $el.attr("id") + "-Invalid").hide();
}

function ClearFilterNumber($el) {
    $el.closest(".col-sm-6").removeClass("has-error");
    $el.val("");
    $("#" + $el.attr("id") + "-Invalid").hide();
}

function ColumnFilterClear(col, originalSearchMode) {
    if (col.filterControl == "select") {
        $("#Column-Filter-Input").selectpicker('val', null);
    }
    else if (col.filterControl == "combodate") {
        ClearFilterDate($("#Column-Filter-Input-FromDate"));
        ClearFilterDate($("#Column-Filter-Input-ToDate"));
    }
    else if (col.filterControl == "number") {
        ClearFilterNumber($("#Column-Filter-Input-GTE"));
        ClearFilterNumber($("#Column-Filter-Input-LTE"));
    }
    else {
        $("#Column-Filter-Input").val("");
    }
    $("#Column-Filter-SearchMode").selectpicker('val', originalSearchMode);
    $('#Column-Filter-Empty').attr('checked', false);
    ShowHideColumnFilterForm();
}

function CombodateFilterIsValid($el, value) {
    var $parentDiv = $el.closest(".form-inline");
    $parentDiv.removeClass("has-error");
    var $invalidEl = $("#" + $el.attr("id") + "-Invalid");
    $invalidEl.hide();
    if (value == "") {
        var selectList = $el.siblings(".combodate").find(("select"));
        for (var i = 0; i < selectList.length; i++) {
            var val = $(selectList[i]).val();
            if (val != "" && val != "am" && val != "pm") {
                $invalidEl.text("This is not a valid date!");
                $parentDiv.addClass("has-error");
                $invalidEl.show();
                return true;
            }
        }
    }
    return false;
}

function NumberFilterIsValid($el, theNumber, cssClass) {
    var $parentDiv = $el.closest(".col-sm-6");
    $parentDiv.removeClass("has-error");
    var $invalidEl = $("#" + $el.attr("id") + "-Invalid");
    $invalidEl.hide();
    if ($el.val() != "" && isNaN(theNumber)) {
        $invalidEl.text("This is not a valid number!");
        $parentDiv.addClass("has-error");
        $invalidEl.show();
        return true;
    }
    return false;
}

function FilterRangeIsValid($fromEl, $toEl, fromVal, toVal, cssClass, errMessage) {
    if (toVal != "" && fromVal > toVal) {
        var $toInvalidEl = $("#" + $toEl.attr("id") + "-Invalid");
        $toInvalidEl.text(errMessage);
        $fromEl.closest(cssClass).addClass("has-error");
        $toEl.closest(cssClass).addClass("has-error");
        $toInvalidEl.show();
        return true;
    }
    return false;
}

function ColumnFilterAccept(dialogRef, col, columnFilterLink) {
    var value = $.trim($("#Column-Filter-Input").val());
    if ($("#Column-Filter-Empty").is(':checked')) {
        value = "FilterEmpty";
    }
    else {
        if (col.filterControl == "combodate") {
            var $fromDateEl = $("#Column-Filter-Input-FromDate");
            var $toDateEl = $("#Column-Filter-Input-ToDate");
            var fromDateValue = $.trim($fromDateEl.combodate('getValue'));
            var toDateValue = $.trim($toDateEl.combodate('getValue'));
            var hasError = false;
            if (CombodateFilterIsValid($fromDateEl, fromDateValue)) {
                hasError = true;
            }
            if (CombodateFilterIsValid($toDateEl, toDateValue)) {
                hasError = true;
            }
            if (!hasError && FilterRangeIsValid($fromDateEl, $toDateEl, moment(fromDateValue), moment(toDateValue), ".form-inline", "From Date cannot be greater than the To Date")) {
                hasError = true;
            }
            if (hasError == true) {
                return;
            }
            if (fromDateValue != "" || toDateValue != "") {
                value = {
                    DateTimeFormat: col.filterControlFormat,
                    FromDate: fromDateValue,
                    ToDate: toDateValue,
                    IsDateOnly: col.IsDateOnly,
                };
            }
            else {
                value = null;
            }
        }
        else if (col.filterControl == "number") {
            var $GTEEl = $("#Column-Filter-Input-GTE");
            var $LTEEl = $("#Column-Filter-Input-LTE");
            var GTE = $.trim($GTEEl.val());
            if (GTE != "") {
                GTE = parseFloat(GTE);
            }
            var LTE = $.trim($LTEEl.val());
            if (LTE != "") {
                LTE = parseFloat(LTE);
            }
            var hasError = false;
            if (NumberFilterIsValid($GTEEl, GTE)) {
                hasError = true;
            }
            if (NumberFilterIsValid($LTEEl, LTE)) {
                hasError = true;
            }
            if (!hasError && FilterRangeIsValid($GTEEl, $LTEEl, GTE, LTE, ".col-sm-6", "Invalid Range")) {
                hasError = true;
            }
            if (hasError == true) {
                return;
            }
            if (GTE != "" || LTE != "") {
                value = {
                    GTE: GTE,
                    LTE: LTE,
                };
            }
            else {
                value = null;
            }
        }
    }
    if (value == "" || value == null) {
        delete columnFilters[col.field];
        $(columnFilterLink).removeClass("text-danger");
    }
    else {
        columnFilters[col.field] = {
            value: value,
            SearchMode: $("#Column-Filter-SearchMode").val(),
        };
        if (!$(columnFilterLink).hasClass("text-danger")) {
            $(columnFilterLink).addClass("text-danger");
        }
    }
    DoSearch();
    dialogRef.close();
}

function ColumnFilterOnShown(col, value, searchMode) {
    if (col.filterControl == "select") {
        $("#Column-Filter-Input").selectpicker();
        $("#Column-Filter-Input").selectpicker('val', value);
    }
    else if (col.filterControl == "combodate") {
        $("#Column-Filter-Input-FromDate").combodate(comboDateOptions);
        $("#Column-Filter-Input-ToDate").combodate(comboDateOptions);
        $(".combodate").find('select').addClass('form-control');
        var fromDate = value != null && value.hasOwnProperty("FromDate") ? value.FromDate : "";
        var toDate = value != null && value.hasOwnProperty("ToDate") ? value.ToDate : "";
        $("#Column-Filter-Input-FromDate").combodate('setValue', fromDate);
        $("#Column-Filter-Input-ToDate").combodate('setValue', toDate);
        $("#Column-Filter-Input-FromDate-Clear").click(function () {
            ClearFilterDate($("#Column-Filter-Input-FromDate"));
        });
        $("#Column-Filter-Input-ToDate-Clear").click(function () {
            ClearFilterDate($("#Column-Filter-Input-ToDate"));
        });
    }
    $("#Column-Filter-SearchMode").selectpicker();
    $("#Column-Filter-SearchMode").selectpicker('val', searchMode);
    $("#Column-Filter-Empty").change(FilterEmptyRowsCheckChanged);
    if (value == "FilterEmpty") {
        $("#Column-Filter-Empty").attr('checked', true);
        ShowHideColumnFilterForm();
    }
}

function FilterEmptyRowsCheckChanged(e) {
    ShowHideColumnFilterForm();
}

function ShowHideColumnFilterForm() {
    if (!$("#Column-Filter-Empty").is(':checked')) {
        $("#Column-Filter-Form").show();
    }
    else {
        $("#Column-Filter-Form").hide();
    }
}

function GetColumnByField(field) {
    var columnList = $("#Realtime_Table").bootstrapTable('getColumns');
    var col = $.grep(columnList, function (col) {
        return col.field == field;
    })[0];
    return col;
}

function ShowColumnFilterModal(e) {
    e.stopPropagation();
    var field = $(e.currentTarget).closest("th").attr("data-field");
    var col = GetColumnByField(field);
    var value = columnFilters[col.field] != null && columnFilters[col.field].value != null ? columnFilters[col.field].value : "";
    var originalSearchMode = col.SearchMode != null ? col.SearchMode : "Starts With";
    var searchMode = columnFilters[col.field] != null ? columnFilters[col.field].SearchMode : originalSearchMode;
    var html = GetColumnFilterInputElementHTML(col, value);
    BootstrapDialog.show({
        size: BootstrapDialog.SIZE_WIDE,
        title: "Filter - " + field,
        message: '<div style="max-height: 600px;">' + html + '</div>',
        closable: false,
        buttons: [{
            label: 'Cancel',
            action: function (dialogRef) {
                dialogRef.close();
            },
        }, {
            label: 'Clear All',
            cssClass: 'btn-info',
            action: function (dialogRef) {
                ColumnFilterClear(col, originalSearchMode);
            },
        }, {
            label: 'Accept',
            cssClass: 'btn-primary',
            action: function (dialogRef) {
                ColumnFilterAccept(dialogRef, col, e.currentTarget);
            },
        },],
        onshown: function (dialog) {
            ColumnFilterOnShown(col, value, searchMode);
        },
    });
}

function AttachGetOffsetEvent() {
    var leftScrollOffset = 0;
    var topScrollOffset = 0;
    var isLastColumn = false;
    $('#Realtime_Table').on('pre-body.bs.table', function (e, arr) {
        //detach the get event
        $('#Realtime_Table').off('pre-body.bs.table');
        //get the scrollbar position before re-rendering
        leftScrollOffset = $(".fixed-table-body").scrollLeft();
        topScrollOffset = $(".fixed-table-body").scrollTop();
        var maxLeftScrollOffset = $(".fixed-table-body")[0].scrollWidth - $(".fixed-table-body")[0].clientWidth;
        if (leftScrollOffset == maxLeftScrollOffset) {
            isLastColumn = true;
        }
        else {
            isLastColumn = false;
        }
    });
    $('#Realtime_Table').on('all.bs.table', function (e, name, args) {
        //There isn't an easy way of figuring out what the last event to fire will be
        //so just run this logic on every event and when the last one runs it will be set correctly
        //We're done rendering, lets reset the scrollbar position
        if (isLastColumn) {
            leftScrollOffset = $(".fixed-table-body")[0].scrollWidth - $(".fixed-table-body")[0].clientWidth;
        }
        $(".fixed-table-body").scrollLeft(leftScrollOffset);
        $(".fixed-table-body").scrollTop(topScrollOffset);
    });
}

function XEditableShown(field, row, $el, editable) {
    //The user just clicked an edit link on the grid
    //Cancel all other fields that are currently being edited, so the user cannot edit more than 1 field at a time
    //Otherwise this can cause duplicate records to be created when inserting new rows, and possibly more side effects
    var toBeEdited = $el[0];
    $(".editable-open").each(function (i, el) {
        if (el != toBeEdited) {
            $(el).editable('hide');
        }
    });
}

function GetColumnList(cols) {
    for (var i in cols) {
        (function (col) {            
            if (col.title == null) {
                col.title = col.field;
            }
            if (!col.hasOwnProperty("isrequired")) {
                col.isrequired = true;
            }
            if (col.iscurrency == true) {
                col.formatter = CurrencyColumnFormatter;
            }
            if (col.filterControl == "select") {
                col.SearchMode = "Exact Match";
            }
            if (col.filterControl == "combodate" && col.filterControlTemplate == null) {
                if (col.IsDateOnly == true) {
                    col.filterControlTemplate = "MM / DD / YYYY";
                }
                else {
                    col.filterControlTemplate = "MM / DD / YYYY hh:mm A";
                }
            }
            if (col.filterControl == "combodate" && col.filterControlFormat == null) {
                if (col.IsDateOnly == true) {
                    col.filterControlFormat = defaultDateFormat;
                }
                else {
                    col.filterControlFormat = defaultDateTimeFormat;
                    col.formatter = DateTimeColumnFormatter;
                }
            }                      
            if (col.hasOwnProperty("editable")) {
                if (col.editable.isphone == true) {
                    col.editable.shown = function (e, editable, b, c, d) {
                        editable.input.$input.mask('+7(999)999-9999');
                    }
                }
                if (col.editable.type == "combodate") {
                    if (col.editable.combodate == null) {
                        col.editable.combodate = comboDateOptions;
                    }
                    if (col.filterControl == "combodate") {
                        col.editable.template = col.filterControlTemplate;
                        col.editable.format = col.filterControlFormat;
                    }
                }
                col.editable.validate = function (value) {
                    return ValidateEditableCell(this, value, col);
                }
            }
            if (col.isErrorLogStack == true) {
                col.formatter = StackFormatter;
                col.events = {
                    'click .stackIcon': ViewStackTrace,
                };
            }
            if (col.isChangeLogJSON == true) {
                col.formatter = JSONFormatter;
                col.events = {
                    'click .jsonIcon': ViewJSON,
                };
            }  
            if (col.isChangeLog == true) {
                col.formatter = ChangeLogFormatter;
                col.events = {
                    'click .changeLogIcon': ViewChangeLog,
                };
            }
        })(cols[i]);
    }
    if (CollectionName == shared.ChangeLogCollectionName && ChangeLogRecordID != "") {
        for (var i in cols) {
            if (cols[i].field == "Collection") {
                cols.splice(i, 1);
                break;
            }
        }
    }
    return cols;
}

function GetMatchingRecord(idToUse) {
    var recordList = $("#Realtime_Table").bootstrapTable('getData');
    var idx = null;
    for (var i in recordList) {
        if (recordList[i]._id == idToUse) {
            idx = i;
            break;
        }
    }
    var theRecord = recordList[idx];
    return {
        data: theRecord,
        idx: idx
    };
}