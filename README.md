## q-xhr: Do ajax with powerful [Q] promises

[![Build Status](https://secure.travis-ci.org/nathanboktae/q-xhr.png?branch=master)](https://travis-ci.org/nathanboktae/q-xhr)

### Why q-xhr and not $.ajax?
jQuery promises [have flaws](http://domenic.me/2012/10/14/youre-missing-the-point-of-promises/) that make them Promises/A+ compliant and [they are not going to be fixed](http://esdiscuss.org/topic/a-challenge-problem-for-promise-designers-was-re-futures#content-43). Q also has a lot more functions for promise manipluation and management.

Once you have a good MVC framework, taking a dependency on a 94kb minified (1.11) library just for `$.ajax` is alot, expecially when [Q] is 19k minified (probably half if you remove the node.js specifics). For example, [Knockout 3.0](http://knockoutjs.com) is 45k minified, and includes support all the way back to IE6 - and you can structure your code properly with it instead of creating spaghetti code coupled to the DOM.

### Basis of q-xhr

On the topic of MVC frameworks not needing jQuery, The [Angular] devs have adopted [Q] throught, and their [http service](http://docs.angularjs.org/api/ng/service/$http) uses [Q]. q-xhr is a fork of that, with the following differences:

- **No caching.** Caching is a [separate responsibility](http://blog.codinghorror.com/curlys-law-do-one-thing/) outside of doing ajax calls.
- **No JSONP.** JSONP has all sorts of security flaws and limitations and causes lots of burden on both client side and server side code. Given that [XDomainRequest is available for IE8 and 9](http://blogs.msdn.com/b/ieinternals/archive/2010/05/13/xdomainrequest-restrictions-limitations-and-workarounds.aspx), and IE6 and 7 [are dead](http://gs.statcounter.com/#desktop-browser_version_partially_combined-ww-monthly-201302-201402), it should be avoided IMO. If you want XDomainRequest support (which jQuery never did), let me know or submit a pull request!
- **Interceptors are applied in order.** I guess [angular] had some backward compatibility they were tied to do so something funky by applying request handlers in reverse but response handlers in order, but I don't have backward compatibility issues so it works like you'd expect.
- **The default JSON transform is only applied if the response content is `application/json`**. [Angular] was doing something odd by sniffing all content via regex matching and then converting it to JSON if it matched. Why? Geez people set your `Content-Type` correctly already. Not to mention content sniffing leads to [security issues](http://blogs.msdn.com/b/ie/archive/2008/09/02/ie8-security-part-vi-beta-2-update.aspx).
- **Progress support**. [Coming soon](https://github.com/nathanboktae/q-xhr/issues/2)


[Q]: https://github.com/kriskowal/q
[Angular]: http://angularjs.org/
