appenlight_client_javascript
============================

.. image:: http://getappenlight.com/static/images/logos/js_small.png
   :alt: JS Logo


**BETA CLIENT - feel free to submit pull requests**

Usage Example
-------------

Include the script on your page
===============================

First, please obtain latest copy of javascript client from our [**Github repository**](https://github.com/AppEnlight/appenlight-client-js).

Or use CDN hosted version from jsDelivr (http://www.jsdelivr.com/#!appenlight).

Next you can include the file on your pages directly or asynchronously:

Installation and Setup
======================

**Load the script asynchronously**::

    var initAppEnlight = function () {
      if(this.readyState!='loading'){
          AppEnlight.init({
              apiKey: 'PUBLIC_API_KEY',
              windowOnError: 1 // enable to hook to window.onerror
          });
          // setting request info is completly optional
          AppEnlight.setRequestInfo({
              server: 'servername',
              username: 'i_am_mario',
              ip: '127.0.0.1',
              request_id: 'server_generated_uuid'
          });
      }
    };
    //  load the script asynchronously
    var scrElem = document.createElement('script');
    scrElem.type = 'text/javascript';
    scrElem.async = true;
    scrElem.onload = scrElem.onreadystatechange = initAppEnlight;
    scrElem.src = '//cdn.jsdelivr.net/appenlight/0.2.0/appenlight-client.min.js';
    var p = document.getElementsByTagName('script')[0];
    p.parentNode.insertBefore(scrElem, p);


At this point client is configured and will automatically stream all data to
our servers every 1 second if it has anything in its buffers.

If `windowOnError` config option is enabled the client will process all unhandled
exceptions for you. Remember though that window.onerror stacks contain a minimal amount
of information; for best results you want to do explicit exception catching.

Please *avoid* throwing string exceptions; if possible use `throw new Error()` instead.

**EXPLICIT ERROR CATCHING - EXAMPLE**::

    try{
      1 + non_existing_var;
    }catch(exc){
      AppEnlight.grabError(exc);
    }



**LOGGING**

The log level (one of ``debug``, ``info``, ``warning``, ``error``, or
``critical``) and a message are required for each log call::

    AppEnlight.log('error','some test message');
    AppEnlight.log('info','some info message');
    AppEnlight.log('warning','some warn message');


The ``log`` method supports three additional arguments for customization of
the namespace, a unique ID for grouping logs, and tags. To avoid overriding
global values, use ``undefined`` for the namespace value::

    AppEnlight.log('info', 'Message A');                       // Default namespace, window.location.pathname
    AppEnlight.setGlobalNamespace('my_script');
    AppEnlight.log('info', 'Message B');                       // Global namespace, my_script
    AppEnlight.log('info', 'Message C', 'script_main');        // Custom namespace script_main
    AppEnlight.log('info', 'Message C', null, requestID);      // null namespace
    AppEnlight.log('info', 'Message C', undefined, requestID); // Global namespace, my_script


**GLOBAL CONFIGURATION**

**Namespace**

The namespace can be provided on each ``log`` call or applied to all logging
via the global ``namespace`` option. Set the ``namespace`` option at
initialization or manage it at runtime with
``AppEnlight.[set|clear]GlobalNamespace``::
    
    AppEnlight.init({
        apiKey: 'PUBLIC_API_KEY',
        namespace: 'my_script'
    });
    // OR
    AppEnlight.setGlobalNamespace('my_script');


**Tags and Extra**

Tags and extra can be specified globally or on the individual ``log`` and
``grabError`` level::

    AppEnlight.addGlobalTags({ widget: 'A', mobile: true });
    AppEnlight.log('info', undefined, undefined, { widget: 'B', button: 'send' });
    // Log will include the tags mobile: true, widget: 'B', button: 'send'

    try{
      1 + non_existing_var;
    }catch(exc){
      AppEnlight.grabError(exc, { tags: { widget: 'B' } });
    }


If a key already exists its value will be overridden::

    AppEnlight.addGlobalTags({ widget: 'A' });
    AppEnlight.addGlobalTags({ widget: 'B' });
    // Logs and reports will send the tag widget: 'B'


Use ``clearGlobal[Tags|Extra]`` to remove keys and their corresponding values.
Individual keys and values can be removed by passing an array with the keys to
remove::

    AppEnlight.clearGlobalTags([ 'widget' ]); // Remove only the widget key
    AppEnlight.clearGlobalExtra();            // Remove all keys and values

