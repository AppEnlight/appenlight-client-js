(function (window) {
    'use strict';

    var buildContextString = function (contextLines) {
        var context = '';
        if (contextLines) {
            for (var k = 0; k < contextLines.length; k++) {
                try{
                    var line = contextLines[k];
                    if (line.length > 300) {
                        context += '<minified-context>';
                    }
                    else {
                        context += line;
                    }

                }
                catch(exc){
                    context += '<error-parsing-context>';
                }
                context += '\n';
            }
        }
        return context;
    };
    var logLevels = ['debug', 'info', 'warning', 'error', 'critical'];

    var AppEnlight = {
        version: '<%= pkg.version %>',
        options: {
            apiKey: ''
        },
        errorReportBuffer: [],
        slowReportBuffer: [],
        logBuffer: [],
        requestInfo: null,
        extraInfo: [],
        tags: [],

        init: function (options) {
            options = options || {};
            var self = this;
            if (typeof options.server === 'undefined') {
                options.server = 'https://api.appenlight.com';
            }
            if (typeof options.apiKey === 'undefined') {
                options.apiKey = 'undefined';
            }
            if (typeof options.protocolVersion === 'undefined') {
                options.protocolVersion = '0.5';
            }
            if (typeof options.windowOnError === 'undefined' ||
                options.windowOnError === false) {
                TraceKit.collectWindowErrors = false;
            }
            if (typeof options.sendInterval === 'undefined') {
                options.sendInterval = 1000;
            }
            if (typeof options.tracekitRemoteFetching === 'undefined') {
                options.tracekitRemoteFetching = true;
            }
            if (typeof options.tracekitContextLines === 'undefined') {
                options.tracekitContextLines = 11;
            }
            if (options.sendInterval >= 1000) {
                this.createSendInterval(options.sendInterval);
            }
            this.options = options;
            this.requestInfo = {url: window.location.href};
            this.reportsEndpoint = options.server +
                '/api/reports?public_api_key=' + this.options.apiKey +
                '&protocolVersion=' + this.options.protocolVersion;
            this.logsEndpoint = options.server +
                '/api/logs?public_api_key=' + this.options.apiKey +
                '&protocolVersion=' + this.options.protocolVersion;

            TraceKit.remoteFetching = options.tracekitRemoteFetching;
            TraceKit.linesOfContext = options.tracekitContextLines;
            TraceKit.report.subscribe(function (errorReport) {
                self.handleError(errorReport);
            });
        },

        createSendInterval: function (timeIv) {
            var self = this;
            this.sendIv = setInterval(function () {
                self.sendReports();
                self.sendLogs();
            }, timeIv);
        },

        setRequestInfo: function (info) {
            for (var i in info) {
                this.requestInfo[i] = info[i];
            }
        },

        clearGlobalExtra: function () {
            this.extraInfo = [];
        },

        addGlobalExtra: function (info) {
            for (var i in info) {
                this.extraInfo.push([i, info[i]]);
            }
        },

        clearGlobalTags: function () {
            this.tags = [];
        },

        addGlobalTags: function (info) {
            for (var i in info) {
                this.tags.push([i, info[i]]);
            }
        },

        clearGlobalNamespace: function () {
            this.options.namespace = undefined;
        },

        setGlobalNamespace: function (namespace) {
            this.options.namespace = namespace;
        },

        grabError: function (exception, options) {
            // we need to catch rethrown exception but throw an error from TraceKit
            try {
                var report = TraceKit.computeStackTrace(exception);
                this.handleError(report, options);
            } catch (newException) {
                if (exception !== newException) {
                    throw newException;
                }
            }

        },

        handleError: function (errorReport, options) {
            /*jshint camelcase: false */
            var errorMsg = '';
            if (errorReport.mode === 'stack') {
                errorMsg = errorReport.name + ': ' + errorReport.message;
            }
            else {
                errorMsg = errorReport.message;
            }
            var report = {
                'client': 'javascript',
                'language': 'javascript',
                'error': errorMsg,
                'occurences': 1,
                'priority': 5,
                'server': '',
                'http_status': 500,
                'request': {},
                'traceback': [],
                'extra': [],
                'tags': []
            };
            report.user_agent = window.navigator.userAgent;
            report.start_time = new Date().toJSON();

            if (this.requestInfo !== null) {
                for (var i in this.requestInfo) {
                    report[i] = this.requestInfo[i];
                }
            }

            if (this.extraInfo !== null) {
                report.extra = report.extra.concat(this.extraInfo);
            }

            if (this.tags !== null) {
                report.tags = report.tags.concat(this.tags);
            }

            if (options && typeof options.extra !== 'undefined'){
                for (var k in options.extra) {
                    report.extra.push([k, options.extra[k]]);
                }
            }

            if (options && typeof options.tags !== 'undefined'){
                for (var l in options.tags) {
                    this.tags.push([l, options.tags[l]]);
                }
            }

            if (typeof report.request_id === 'undefined' || !report.request_id) {
                report.request_id = this.genUUID4();
            }
            // grab last 100 frames in reversed order
            var stackSlice = errorReport.stack.reverse().slice(-100);
            for (var j = 0; j < stackSlice.length; j++) {
                var context = '';
                var frame = stackSlice[j];
                try {
                    if (typeof frame.context !== 'undefined') {
                        context = buildContextString(frame.context);
                    }
                }
                catch (e) {
                }
                var stackline = {
                    'cline': context,
                    'file': frame.url,
                    'fn': frame.func,
                    'line': frame.line,
                    'vars': []
                };
                report.traceback.push(stackline);
            }
            if (report.traceback.length > 0) {
                var lastFrame = stackSlice[stackSlice.length - 1];
                if (typeof lastFrame.context !== 'undefined') {
                    var ctxString = buildContextString(lastFrame.context);
                    var msg = ctxString + '\n' + errorMsg;
                    report.traceback[report.traceback.length - 1].cline = msg;
                }
            }
            this.errorReportBuffer.push(report);
        },
        log: function (level, message, namespace, uuid) {
            if (typeof namespace === 'undefined') {
                if (typeof this.options.namespace !== 'undefined') {
                    namespace = this.options.namespace;
                }
                else {
                    namespace = window.location.pathname;
                }
            }
            if (typeof uuid === 'undefined') {
                uuid = null;
            }
            this.logBuffer.push(
                {
                    'log_level': level.toUpperCase(),
                    'message': message,
                    'date': new Date().toJSON(),
                    'namespace': namespace,
                    'request_id': uuid
                });
            if (this.requestInfo !== null && typeof this.requestInfo.server !== 'undefined') {
                this.logBuffer[this.logBuffer.length - 1].server = this.requestInfo.server;
            }
        },

        genUUID4: function () {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
                /[xy]/g, function (c) {
                    var r = Math.random() * 16 | 0, v = c === 'x' ? r : r & 0x3 | 0x8;
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
                xhr = new window.ActiveXObject('Microsoft.XMLHTTP');
            }
            xhr.open('POST', endpoint, true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(JSON.stringify(data));
        }
    };

    // Create a function that calls through to the log method with the
    // specified log level
    function logLevelMethod(logLevel) {
        return function() {
            var args = [].slice.call(arguments);
            args.unshift(logLevel);
            return this.log.apply(this, args);
        };
    }

    // Add methods for each log level
    for (var i in logLevels) {
        var logLevel = logLevels[i];
        AppEnlight[logLevel] = logLevelMethod(logLevel);
    }

    window.AppEnlight = AppEnlight;

    if (typeof define === 'function' && define.amd) {
        define('appenlight', [], function () {
            return AppEnlight;
        });
    }

}(window));
