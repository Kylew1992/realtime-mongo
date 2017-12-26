var defaultDateFormat = "MM/DD/YYYY";
var defaultDateTimeFormat = defaultDateFormat + " hh:mm a";
var spinIcon = '<i class="fa fa-spinner fa-pulse fa-fw"></i>';
var upArrow = '&#9650;';
var downArrow = '&#x25BC;';
var socket = io.connect('/');

function FormatDate(dateVal) {
    return moment(new Date(dateVal)).format(defaultDateTimeFormat);
}

function GetCharCode(e) {
    e = (e) ? e : window.event;
    return (e.which) ? e.which : e.keyCode;
}

function OnKeyPress_IsNumber(e) {
    var charCode = GetCharCode(e)
    if (charCode > 31 && (charCode < 48 || charCode > 57)) {
        return false;
    }
    return true;
}

function OnPaste_IsNumber(e, isFloat) {
    var clipboardData, pastedData;
    // Get pasted data via clipboard API
    clipboardData = e.clipboardData || window.clipboardData;
    pastedData = clipboardData.getData('Text');
    var result = isNaN(parseFloat(pastedData));
    var stopPaste = isFloat == true ? isNaN(parseFloat(pastedData)) : isNaN(parseInt(pastedData));
    if (stopPaste) {
        e.stopPropagation();
        e.preventDefault();
    }
}

//modal functions
function ShowModal(title, message) {
    BootstrapDialog.show({
        title: title,
        message: '<div style="max-height:600px; overflow: auto;">' + message + '</div>',
    });
}

function ShowErrorModal(errorMessage) {
    if (errorMessage != null && errorMessage != '') {
        ShowModal("An Error has Occurred", errorMessage);
    }
}

function ConfirmModal(title, message, callback) {
    BootstrapDialog.confirm({
        title: title,
        message: '<div style="max-height:600px; overflow: auto;">' + message + '</div>',
        btnCancelLabel: 'No',
        btnOKLabel: 'Yes',
        onshow: function (dialog) {
            var yesButton = $(dialog.getModalFooter()).find('.btn-primary')[0];
            yesButton.id = "btnConfirmYes";
        },
        callback: callback
    });
}

function ShowWaitModal(title, message, buttonLabel, callback) {
    var dialog = new BootstrapDialog({
        title: title,
        message: message,
        closable: false,
        buttons: [{
            label: buttonLabel + ' ' + spinIcon,
            cssClass: 'btn-primary',
            action: function (dialogRef) {
                dialogRef.enableButtons(false);
                callback(dialogRef);
            }
        },],
        onshow: function (dialogRef) {
            var btn = $(dialogRef.getModalFooter()).find('.btn-primary')[0];
            btn.click();
        }
    });
    dialog.realize();
    if (message == "") {
        dialog.getModalBody().hide();
    }
    dialog.open();
}

function GetCountDownButtonText(originalButtonText, totalSeconds) {
    return originalButtonText.replace("{SECONDS}", totalSeconds);
}

function ShowCountDownModal(totalSeconds, title, message, buttonText, callback) {
    var originalButtonText = buttonText;
    buttonText = GetCountDownButtonText(originalButtonText, totalSeconds);
    var countDownFunction = function (dialogRef) {
        setInterval(function () {
            totalSeconds--;
            if (totalSeconds < 0) {
                callback(dialogRef);
            } else {
                $(dialogRef.getModalFooter()).find('.btn-primary').html(GetCountDownButtonText(originalButtonText, totalSeconds) + ' ' + spinIcon);
            }
        }, 1000);
    }
    ShowWaitModal(title, message, buttonText, countDownFunction);
}

function CloseWaitModal(dialogRef) {
    setTimeout(function () {
        dialogRef.close();
    }, 100);
}

function ShowTruncatedModal(content) {
    BootstrapDialog.show({
        size: BootstrapDialog.SIZE_WIDE,
        cssClass: "bootstrapDialogNoHeader",
        message: content,
    });
}