appenlight_client_javascript
============================

.. image:: http://getappenlight.com/static/images/logos/js_small.png
   :alt: JS Logo


**BETA CLIENT - feel free to submit pull requests**

Usage Example
-------------

## Include the script on your page

First, please obtain latest copy of javascript client from our [**Github repository**](https://github.com/AppEnlight/appenlight-client-js).

Or use CDN hosted version from jsDelivr (http://www.jsdelivr.com/#!appenlight).

Next you can include the file on your pages directly or asynchroneously:

Installation and Setup
======================

**Load the script asynchroneously**::

    var initAppEnlight = function () {
      if(this.readyState!='loading'){
          AppEnlight.init({
              apiKey:'PUBLIC_API_KEY',
              windowOnError: 1 // enable to hook to window.onerror
          });
          // setting request info is completly optional
          AppEnlight.setRequestInfo({
              server:'servername',
              username:'i_am_mario',
              ip: "127.0.0.1",
              request_id:"server_generated_uuid"
          });
      }
    };
    //  load the script asynchroneously
    var scrElem = document.createElement('script');
    scrElem.type = 'text/javascript';
    scrElem.async = true;
    scrElem.onload = scrElem.onreadystatechange = initAppEnlight;
    scrElem.src = "//cdn.jsdelivr.net/appenlight/0.2.0/appenlight-client.min.js";
    var p = document.getElementsByTagName('script')[0];
    p.parentNode.insertBefore(scrElem, p);


At this point client is configured and will automaticly stream all data to
our servers every 1 second if it has anything in its buffers.

If `windowOnError` config option is enabled the client will process all unhandled
exceptions for you. Remember though that window.onerror stacks contain minimal amount
of information, for best results you want to do explict exception catching.

Please *avoid* throwing string exceptions, if possible use `throw new Error()` instead.

** EXPLICIT ERROR CATCHING - EXAMPLE**::

    try{
      1 + non_existing_var;
    }catch(exc){
      AppEnlight.grabError(exc);
    }



**LOGGING - EXAMPLE**::

    AppEnlight.log('error',"some test message");
    AppEnlight.log('info',"some info message");
    AppEnlight.log('warning',"some warn message");
