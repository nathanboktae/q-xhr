## q-xhr: Do ajax with powerful [Q] promises
### Deprecation Notice

In 2014, [Q] was an amazing library pushing promises and helping us all do asyncronous programming better. Now however that `Promise` is part of ES6, and widely available natively in modern browsers and Node.js, and that [Q] has a vastly different API, we should just use the standard `Promise` library. [Axios](https://github.com/mzabriskie/axios) does that using the same API inspired from [Angular's $http](http://docs.angularjs.org/api/ng/service/$http), so I encorage you to migrate to that library. It's great.

[![Build Status](https://secure.travis-ci.org/nathanboktae/q-xhr.png?branch=master)](https://travis-ci.org/nathanboktae/q-xhr)

[![SauceLabs Test Status](https://saucelabs.com/browser-matrix/q-xhr.svg)](https://saucelabs.com/u/nathanboktae)

### Why q-xhr and not $.ajax?

jQuery promises [have flaws](http://domenic.me/2012/10/14/youre-missing-the-point-of-promises/) that make them Promises/A+ compliant and [they are not going to be fixed](http://esdiscuss.org/topic/a-challenge-problem-for-promise-designers-was-re-futures#content-43). Q also has a lot more functions for promise manipluation and management.

Once you have a good MVC framework, taking a dependency on a 94kb minified (1.11) library just for `$.ajax` is alot, expecially when [Q] is 19k minified (probably half if you remove the node.js specifics). For example, [Knockout 3.0](http://knockoutjs.com) is 45k minified, and includes support all the way back to IE6 - and you can structure your code properly with it instead of creating spaghetti code coupled to the DOM.

### Examples

Get some JSON:
```javascript
  Q.xhr.get('/status').done(function(resp) {
    console.log('status is ' + resp.data)
  })
```

Post some JSON:

```javascript
  Q.xhr.post('/greet', {
    say: 'hello'
  }).then(function(resp) {
    console.log('success!')
  }, function(resp) {
    console.log('request failed with status' + resp.status)
  })
```

Listen to progress:

```javascript

  var someLargeData = getSomeLargeData();

  Q.xhr.post('/processLargeData', someLargeData).progress(function(progress) {
    if (progress.upload) {
      console.log('Uploaded: '+progress.loaded+' bytes')
    } else {
      console.log('Downloaded: '+progress.loaded+' bytes')
    }
  }).then(function(resp) {
    console.log('success!')
  })
```

With modern web applications in mind, `application/json` is the default mime type.

### Differences from [Angular's $http][$http]

On the topic of MVC frameworks not needing jQuery, The [Angular] devs have adopted [Q] throught, and their [http service][$http] uses [Q]. q-xhr is a fork of that, with the following differences:

- **No built-in caching.** Caching is a [separate responsibility](http://blog.codinghorror.com/curlys-law-do-one-thing/) outside of doing ajax calls. Hooks are provided to bring your own caching library or mechanism - see below.
- **No JSONP.** JSONP has all sorts of security flaws and limitations and causes lots of burden on both client side and server side code. Given that [XDomainRequest is available for IE8 and 9](http://blogs.msdn.com/b/ieinternals/archive/2010/05/13/xdomainrequest-restrictions-limitations-and-workarounds.aspx), and IE6 and 7 [are dead](http://gs.statcounter.com/#desktop-browser_version_partially_combined-ww-monthly-201302-201402), it should be avoided IMO. If you want XDomainRequest support (which jQuery never did), let me know or submit a pull request!
- **Interceptors are applied in order.** I guess [angular] had some backward compatibility they were tied to do so something funky by applying request handlers in reverse but response handlers in order, but I don't have backward compatibility issues so it works like you'd expect.
- **The default JSON transform is only applied if the response content is `application/json`**. [Angular] was doing something odd by sniffing all content via regex matching and then converting it to JSON if it matched. Why? Geez people set your `Content-Type` correctly already. Not to mention content sniffing leads to [security issues](http://blogs.msdn.com/b/ie/archive/2008/09/02/ie8-security-part-vi-beta-2-update.aspx).
- **Progress support**. Supply a progress listener function to recieve [ProgressEvent](https://developer.mozilla.org/en-US/docs/Web/API/ProgressEvent)s. q-xhr listens to both upload and download progress. To help you detect the type of progress, q-xhr adds the boolean property `upload` to the `ProgressEvent` object.

### Installation

#### Bower

```
bower install q-xhr
```

#### npm

```
npm install q-xhr
```

### Usage

#### browserify

```
var Q = require('q-xhr')(window.XMLHttpRequest, require('q'))
Q.xhr.get('https://api.github.com/users/nathanboktae/events').then(.....)
```

#### AMD

Assuming that `q-xhr.js` and `q.js` are [in your `baseUrl`](http://requirejs.org/docs/api.html#config-baseUrl)

```
require(['q-xhr'], function(Q) {
  Q.xhr.get('https://api.github.com/users/nathanboktae/events').then(.....)
})
```

#### Plain old scripts

```
<script src="q.js"></script>
<script src="q-xhr.js"></script>
<script>
  Q.xhr.get('https://api.github.com/users/nathanboktae/events').then(.....)
</script>
```

#### Cache Hooks

A cache object can be provided either as defaults on `Q.xhr.defaults` or per-request (with the per-request object preferred). The object must have a `get` function that returns the response object for a url, and a `put` function given the url and response object to save it. The most trival implementation would be this:

```javascript
var cache = {}
Q.xhr.defaults.cache = {
  get: function(url) {
    return cache[url]
  },
  put: function(url, response) {
    cache[url] = response
  }
}
```

Unlike `$http`, `q-xhr` will not put pending requests in the cache - only successful responses, and before transforms are applied (they will be re-applied each retrieval).

#### Upload Progress

Assigning a handler to `xhr.upload.onprogress` in Chrome causes it to issue a preflight request which requires additional handling on the part of the server. If you don't track upload progress and want to avoid this incompatibility, add option `disableUploadProgress: true` to your q-xhr options.


[Q]: https://github.com/kriskowal/q
[Angular]: http://angularjs.org/
[$http]: http://docs.angularjs.org/api/ng/service/$http
