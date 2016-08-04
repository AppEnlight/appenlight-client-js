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
        requestInfo: {},
        extraInfo: {},
        tags: {},

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

            for (var k in options) {
                this.options[k] = options[k];
            }

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

        clearRequestInfo: function () {
            this.requestInfo = {};
        },

        setRequestInfo: function (info) {
            assign(this.requestInfo, info);
        },

        clearGlobalExtra: function (keys) {
            if (keys) {
                for (var i = 0; i < keys.length; i++) {
                    delete this.extraInfo[keys[i]];
                }
            }
            else {
                this.extraInfo = {};
            }
        },

        addGlobalExtra: function (info) {
            assign(this.extraInfo, info);
        },

        clearGlobalTags: function (keys) {
            if (keys) {
                for (var i = 0; i < keys.length; i++) {
                    delete this.tags[keys[i]];
                }
            }
            else {
                this.tags = {};
            }
        },

        addGlobalTags: function (info) {
            assign(this.tags, info);
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
                'extra': toPairs(assign({}, this.extraInfo, options.extra)),
                'tags': toPairs(assign({}, this.tags, options.tags)),
                'url': window.location.href
            };
            report.user_agent = window.navigator.userAgent;
            report.start_time = new Date().toJSON();

            if (this.requestInfo !== null) {
                for (var i in this.requestInfo) {
                    report[i] = this.requestInfo[i];
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
        log: function (level, message, namespace, uuid, tags) {
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
            var logInfo = {
                'log_level': level.toUpperCase(),
                'message': message,
                'date': new Date().toJSON(),
                'namespace': namespace,
                'request_id': uuid,
                'tags': toPairs(assign({}, this.tags, tags))
            };

            if (this.requestInfo && typeof this.requestInfo.server !== 'undefined') {
                logInfo.server = this.requestInfo.server;
            }
            
            this.logBuffer.push(logInfo);
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

    // Shallow copy of own enumerable properties into the target object from
    // any number of source objects.
    function assign(target) {
        target = Object(target);
        for (var i = 1; i < arguments.length; i++) {
            var source = arguments[i];
            if (source) {
                for (var k in source) {
                    if (hasOwnProperty(source, k)) {
                        target[k] = source[k];
                    }
                }
            }
        }
        return target;
    }

    // Determine whether a property with the specified key is defined in the
    // object, ignoring properties inherited from the object's prototype
    function hasOwnProperty(obj, key) {
        return Object.prototype.hasOwnProperty.call(obj, key);
    }

    // Create a function that calls through to the log method with the
    // specified log level
    function logLevelMethod(logLevel) {
        return function() {
            var args = [].slice.call(arguments);
            args.unshift(logLevel);
            return this.log.apply(this, args);
        };
    }
    
    // Convert object to an array of [key, value] pairs
    function toPairs(obj) {
        var pairs = [];
        for (var k in obj) {
            if (hasOwnProperty(obj, k)) {
                pairs.push([k, obj[k]]);
            }
        }
        return pairs;
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
