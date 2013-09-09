errormator_client_javascript
============================

.. image:: https://errormator.com/static/images/logos/js_small.png
   :alt: JS Logo


**WARNING THIS IS STILL ALPHA CODE - USE AT YOUR OWN RISK**


Installation and Setup
======================

**Load the script asynchroneously**::

    var init_errormator = function () {
          var err_client = new Errormator();
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
    var emator = document.createElement('script');
    emator.type = 'text/javascript';
    emator.async = true;
    emator.onload = emator.onreadystatechange = init_errormator;
    emator.src = "/path/to/errormator-client.js";
    var p = document.getElementsByTagName('script')[0];
    p.parentNode.insertBefore(emator, p);


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