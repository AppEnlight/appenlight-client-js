(function (window) {
    "use strict";

    var AppEnlight = {
        version: '0.2.0',
        options: {
            apiKey: ""
        },
        errorReportBuffer: [],
        slowReportBuffer: [],
        logBuffer: [],
        requestInfo: null,

        init: function (options) {
            var self = this;
            if (typeof options.server == 'undefined') {
                options.server = "https://api.appenlight.com";
            }
            if (typeof options.apiKey == 'undefined') {
                options.apiKey = "undefined";
            }
            if (typeof options.protocol_version == 'undefined') {
                options.protocol_version = "0.4";
            }
            if (typeof options.windowOnError == 'undefined' ||
                options.windowOnError == false) {
                TraceKit.collectWindowErrors = false;
            }
            if (typeof options.sendInterval == 'undefined') {
                options.sendInterval = 1000;
            }
            if (options.sendInterval >= 1000) {
                this.createSendInterval(options.sendInterval);
            }
            this.options = options;
            this.requestInfo = {url:window.location.href};
            this.reportsEndpoint = options.server
                + '/api/reports?public_api_key=' + this.options.apiKey
                + "&protocol_version=" + this.options.protocol_version;
            this.logsEndpoint = options.server
                + '/api/logs?public_api_key=' + this.options.apiKey
                + "&protocol_version=" + this.options.protocol_version;
            TraceKit.remoteFetching = false;
            TraceKit.report.subscribe(function (errorReport) {
                self.handleError(errorReport);
            });
        },

        createSendInterval: function (time_iv) {
            var self = this;
            this.send_iv = setInterval(function () {
                self.sendReports();
                self.sendLogs();
            }, time_iv);
        },

        setRequestInfo: function (info) {
            for (var i in info) {
                this.requestInfo[i] = info[i];
            }
        },

        grabError: function (exception) {
            // we need to catch rethrown exception but throw an error from TraceKit
            try {
                TraceKit.report(exception);
            } catch (new_exception) {
                if (exception !== new_exception) {
                    throw new_exception;
                }
            }

        },

        handleError: function (errorReport) {
            if (errorReport.mode == 'stack') {
                var error_type = errorReport.name + ': ' + errorReport.message;
            }
            else {
                var error_type = errorReport.message;
            }
            // console.log(errorReport);
            var report = {
                "client": "javascript",
                "language": "javascript",
                "error_type": error_type,
                "occurences": 1,
                "priority": 5,
                "server": '',
                "http_status": 500,
                'report_details': []
            }
            if (this.requestInfo != null && typeof this.requestInfo.server != 'undefined') {
                report.server = this.requestInfo.server;
            }
            var detail = this.collectDetails();
            for (var i = errorReport.stack.length - 1; i >= 0; i--) {
                // console.log(errorReport.stack[i])
                var stackline = {'cline': '',
                    'file': errorReport.stack[i].url,
                    'fn': errorReport.stack[i].func,
                    'line': errorReport.stack[i].line,
                    'vars': []}
                detail.frameinfo.push(stackline);
            }
            detail.frameinfo[detail.frameinfo.length - 1].cline = error_type
            report.report_details.push(detail);
            this.errorReportBuffer.push(report);
        },
        log: function (level, message, namespace, uuid) {
            if (typeof namespace == 'undefined') {
                var namespace = window.location.pathname;
            }
            if (typeof uuid == 'undefined') {
                var uuid = null;
            }
            this.logBuffer.push(
                {
                    "log_level": level.toUpperCase(),
                    "message": message,
                    "date": new Date().toJSON(),
                    "namespace": namespace
                })
            if (this.requestInfo != null && typeof this.requestInfo.server != 'undefined') {
                this.logBuffer[this.logBuffer.length - 1].server = this.requestInfo.server;
            }
        },

        genUUID4: function () {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
                /[xy]/g, function (c) {
                    var r = Math.random() * 16 | 0, v = c == 'x' ? r : r & 0x3 | 0x8;
                    return v.toString(16);
                }
            );
        },

        sendReports: function () {
            if (this.errorReportBuffer.length < 1) {
                return true;
            }
            var data = this.errorReportBuffer;
            this.submitData(this.reportsEndpoint, data);
            this.errorReportBuffer = [];
            return true;
        },
        sendLogs: function () {
            if (this.logBuffer.length < 1) {
                return true;
            }
            var data = this.logBuffer;
            this.submitData(this.logsEndpoint, data);
            this.logBuffer = [];
            return true;
        },

        submitData: function (endpoint, data) {
            var xhr = new window.XMLHttpRequest();
            if (!xhr && window.ActiveXObject) {
                xhr = new window.ActiveXObject("Microsoft.XMLHTTP");
            }
            xhr.open("POST", endpoint, true);
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.send(JSON.stringify(data));
        },

        collectDetails: function () {
            var detail = {
                user_agent: window.navigator.userAgent,
                start_time: new Date().toJSON(),
                frameinfo: []
            };
            if (this.requestInfo != null) {
                for (var i in this.requestInfo) {
                    detail[i] = this.requestInfo[i];
                }
            }
            if (typeof detail.request_id == 'undefined' || !detail.request_id) {
                detail.request_id = this.genUUID4();
            }
            return detail

        }
    }
    window.AppEnlight = AppEnlight;

    if ( typeof define === "function" && define.amd ) {
        define( "appenlight", [], function() {
            return AppEnlight;
        });
    }

}(window));