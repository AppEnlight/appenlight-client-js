(function (window) {
    'use strict';

    var logLevels = ['debug', 'info', 'warning', 'error', 'critical'];

    var AppEnlight = {
        version: '<%= pkg.version %>',
        options: {
            apiKey: 'undefined',
            protocolVersion: '0.5',
            sendInterval: 1000,
            server: 'https://api.appenlight.com',
            tracekitContextLines: 11,
            tracekitRemoteFetching: true,
            windowOnError: false
        },
        errorReportBuffer: [],
        slowReportBuffer: [],
        logBuffer: [],
        requestInfo: {},
        extraInfo: {},
        tags: {},

        init: function (options) {
            var self = this;

            assign(this.options, options);

            if (this.options.sendInterval >= 1000) {
                this.createSendInterval(this.options.sendInterval);
            }

            this.reportsEndpoint = this.options.server +
                '/api/reports?public_api_key=' + this.options.apiKey +
                '&protocolVersion=' + this.options.protocolVersion;
            this.logsEndpoint = this.options.server +
                '/api/logs?public_api_key=' + this.options.apiKey +
                '&protocolVersion=' + this.options.protocolVersion;

            TraceKit.collectWindowErrors = this.options.windowOnError;
            TraceKit.remoteFetching = this.options.tracekitRemoteFetching;
            TraceKit.linesOfContext = this.options.tracekitContextLines;
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
            options = options || {};
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

            assign(report, this.requestInfo);

            if (!report.request_id) {
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

                        // Add the error message to the last frame
                        if (j === stackSlice.length - 1) {
                            context += '\n' + errorMsg;
                        }
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

    // Given an array of context lines, format as a string with one per lines
    function buildContextString(contextLines) {
        if (contextLines) {
            var context = new Array(contextLines.length + 1);
            
            for (var k = 0; k < contextLines.length; k++) {
                try{
                    var line = contextLines[k];
                    if (line.length > 300) {
                        context[k] = '<minified-context>';
                    }
                    else {
                        context[k] = line;
                    }

                }
                catch(exc){
                    context[k] = '<error-parsing-context>';
                }
            }
            // Join will include a trailing \n if there are context lines
            context[k] = '';

            return context.join('\n');
        }
        return '';
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
    for (var i = 0; i < logLevels.length; i++) {
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
