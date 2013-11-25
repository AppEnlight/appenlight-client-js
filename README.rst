appenlight_client_javascript
============================

.. image:: https://appenlight.com/static/images/logos/js_small.png
   :alt: JS Logo


**WARNING THIS IS STILL ALPHA CODE - USE AT YOUR OWN RISK**

Latest version of documentation is present on http://appenlight.com/page/javascript/client-configuration.

Installation and Setup
======================

**Load the script asynchroneously**::

    var init_appenlight = function () {
          var err_client = new Appenlight();
          window.err_client = err_client;
          err_client.init({
              api_key:'PUBLIC_API_KEY',
              window_on_error: 1 // enable to hook to window.onerror
          });
          // setting request info is completly optional
          err_client.setRequestInfo({
              server:'servername',
              username:'i_am_mario',
              ip: "127.0.0.1",
              request_id:"server_generated_uuid"
          });
    };
    //  load the script asynchroneously
    var app_enlight = document.createElement('script');
    app_enlight.type = 'text/javascript';
    app_enlight.async = true;
    app_enlight.onload = emator.onreadystatechange = init_appenlight;
    app_enlight.src = "/path/to/appenlight-client.js";
    var p = document.getElementsByTagName('script')[0];
    p.parentNode.insertBefore(app_enlight, p);


At this point client is configured and will automaticly stream all data to
our servers every 1 second if it has anything in its buffers.

If `window_on_error` config option is enabled the client will process all unhandled
exceptions for you. Remember though that window.onerror stacks contain minimal amount
of information, for best results you want to do explict exception catching.

Please *avoid* throwing string exceptions, if possible use `throw new Error()` instead.

** EXPLICIT ERROR CATCHING - EXAMPLE**::

    try{
      1 + vcvx1;
    }catch(exc){
      err_client.grabError(exc);
    }



**LOGGING - EXAMPLE**::

    err_client.log('error',"some test message");
    err_client.log('info',"some info message");
    err_client.log('warning',"some warn message");