appenlight_client_javascript
============================

.. image:: https://appenlight.com/static/images/logos/js_small.png
   :alt: JS Logo


**BETA CLIENT - feel free to submit pull requests**

Latest version of documentation is present on http://appenlight.com/page/javascript/client-configuration.

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
    scrElem.src = "/static/js/appenlight-client.js";
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
