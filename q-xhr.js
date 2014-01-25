//jshint asi:true
(function(factory) {
  if (typeof define === 'function' && define.amd) {
    define(['Q'], function(Q) {
      return factory(XMLHttpRequest, Q)
    })
  } else {
    if (typeof Q !== 'undefined') {
      factory(XMLHttpRequest, Q)
    }
  }
})(function(XHR, Q) {
  // shallow extend with varargs
  function extend(dst) {
    Array.prototype.forEach.call(arguments, function(obj) {
      if (obj !== dst) {
        Object.keys(obj).forEach(function(key) {
          dst[key] = obj[key]
        })
      }
    })

    return dst
  }

  function lowercase(str) {
    return (str || '').toLowerCase()
  }

  function parseHeaders(headers) {
    var parsed = {}, key, val, i

    if (!headers) return parsed

    headers.split('\n').forEach(function(line) {
      i = line.indexOf(':')
      key = lowercase(line.substr(0, i))
      val = line.substr(i + 1)

      if (key) {
        if (parsed[key]) {
          parsed[key] += ', ' + val
        } else {
          parsed[key] = val
        }
      }
    })

    return parsed
  }

  function headersGetter(headers) {
    var headersObj = typeof headers === 'object' ? headers : undefined;

    return function(name) {
      if (!headersObj) headersObj = parseHeaders(headers)

      if (name) {
        return headersObj[lowercase(name)] || null;
      }

      return headersObj
    }
  }

  function transformData(data, headers, fns) {
    if (typeof fns === 'function') {
      return fns(data, headers)
    }

    fns.forEach(function(fn) {
      data = fn(data, headers)
    })

    return data
  }

  function isSuccess(status) {
    return 200 <= status && status < 300
  }

  function forEach(obj, iterator, context) {
    var keys = Object.keys(obj)
    keys.forEach(function(key) {
      iterator.call(context, obj[key], key)
    })
    return keys
  }

  function forEachSorted(obj, iterator, context) {
    var keys = Object.keys(obj).sort()
    keys.forEach(function(key) {
      iterator.call(context, obj[key], key)
    })
    return keys
  }

  function buildUrl(url, params) {
    if (!params) return url
    var parts = []
    forEachSorted(params, function(value, key) {
      if (value == null) return
      if (!Array.isArray(value)) value = [value]

      value.forEach(function(v) {
        if (typeof v === 'object') {
          v = JSON.stringify(v)
        }
        parts.push(encodeURIComponent(key) + '=' +
                   encodeURIComponent(v))
      })
    })
    return url + ((url.indexOf('?') == -1) ? '?' : '&') + parts.join('&')
  }

  Q.xhr = function (requestConfig) {
    var defaults = this.defaults,
    config = {
      transformRequest: defaults.transformRequest,
      transformResponse: defaults.transformResponse
    },
    headers = mergeHeaders(requestConfig)

    extend(config, requestConfig)
    config.headers = headers
    config.method = (config.method || 'GET').toUpperCase()

    var serverRequest = function(config) {
      headers = config.headers
      var reqData = transformData(config.data, headersGetter(headers), config.transformRequest)

      // strip content-type if data is undefined TODO does it really matter?
      if (config.data == null) {
        forEach(headers, function(value, header) {
          if (lowercase(header) === 'content-type') {
              delete headers[header]
          }
        })
      }

      if (config.withCredentials == null && defaults.withCredentials != null) {
        config.withCredentials = defaults.withCredentials
      }

      // send request
      return sendReq(config, reqData, headers).then(transformResponse, transformResponse)
    },

    transformResponse = function(response) {
      response.data = transformData(response.data, response.headers, config.transformResponse)
      return isSuccess(response.status) ? response : Q.reject(response)
    },

    mergeHeaders = function(config) {
      var defHeaders = defaults.headers,
          reqHeaders = extend({}, config.headers),
          defHeaderName, lowercaseDefHeaderName, reqHeaderName,

      execHeaders = function(headers) {
        forEach(headers, function(headerFn, header) {
          if (typeof headerFn === 'function') {
            var headerContent = headerFn()
            if (headerContent != null) {
              headers[header] = headerContent
            } else {
              delete headers[header]
            }
          }
        })
      }

      defHeaders = extend({}, defHeaders.common, defHeaders[lowercase(config.method)]);

      // execute if header value is function
      execHeaders(defHeaders);
      execHeaders(reqHeaders);

      // using for-in instead of forEach to avoid unecessary iteration after header has been found
      defaultHeadersIteration:
      for (defHeaderName in defHeaders) {
        lowercaseDefHeaderName = lowercase(defHeaderName);

        for (reqHeaderName in reqHeaders) {
          if (lowercase(reqHeaderName) === lowercaseDefHeaderName) {
            continue defaultHeadersIteration;
          }
        }

        reqHeaders[defHeaderName] = defHeaders[defHeaderName];
      }

      return reqHeaders;
    },

    chain = [serverRequest, undefined],
    promise = Q.when(config)

    // apply interceptors
    this.interceptors.forEach(function(interceptor) {
      if (interceptor.request || interceptor.requestError) {
        chain.unshift(interceptor.request, interceptor.requestError)
      }
      if (interceptor.response || interceptor.responseError) {
        chain.push(interceptor.response, interceptor.responseError)
      }
    })

    while (chain.length) {
      var thenFn = chain.shift()
      var rejectFn = chain.shift()

      promise = promise.then(thenFn, rejectFn)
    }

    return promise
  }


  var jsonStart = /^\s*(\[|\{[^\{])/,
      jsonEnd = /[\}\]]\s*$/,
      contentTypeJson = { 'Content-Type': 'application/json;charset=utf-8' }

  Q.xhr.defaults = {
    // transform incoming response data
    transformResponse: [function(data) {
      // TODO: use Content-Type not regex tests
      if (typeof data === 'string' && jsonStart.test(data) && jsonEnd.test(data)) {
        data = JSON.parse(data)
      }
      return data
    }],

    // transform outgoing request data
    transformRequest: [function(data) {
      return !!data && typeof data === 'object' && data.toString() !== '[object File]' ?
        JSON.stringify(data) : data
    }],

    // default headers
    headers: {
      common: {
        'Accept': 'application/json, text/plain, */*'
      },
      post:   contentTypeJson,
      put:    contentTypeJson,
      patch:  contentTypeJson
    },
  }

  Q.xhr.interceptors = []
  Q.xhr.pendingRequests = []

  function sendReq(config, reqData, reqHeaders) {
    var deferred = Q.defer(),
        promise = deferred.promise,
        url = buildUrl(config.url, config.params),
        xhr = new XHR(),
        aborted = -1,
        status,
        timeoutId

    Q.xhr.pendingRequests.push(config)

    // $httpBackend(config.method, url, reqData, done, reqHeaders, config.timeout, config.withCredentials, config.responseType)
    // function(method, url, post, callback, headers, timeout, withCredentials, responseType)

    xhr.open(config.method, url, true)
    forEach(config.headers, function(value, key) {
      if (value) {
        xhr.setRequestHeader(key, value)
      }
    })

    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {
        var response, responseHeaders
        if (status !== aborted) {
          responseHeaders = xhr.getAllResponseHeaders()
          // responseText is the old-school way of retrieving response (supported by IE8 & 9)
          // response/responseType properties were introduced in XHR Level2 spec (supported by IE10)
          response = xhr.responseType ? xhr.response : xhr.responseText
        }

        // completeRequest(callback,
        //     status || xhr.status,
        //     response,
        //     responseHeaders);
        // completeRequest(callback, status, response, headersString) 

        // cancel timeout and subsequent timeout promise resolution
        timeoutId && clearTimeout(timeoutId)
        xhr = null

        // normalize status, including accounting for IE bug (http://bugs.jquery.com/ticket/1450)
        status = Math.max(status == 1223 ? 204 : status, 0)

        var idx = Q.xhr.pendingRequests.indexOf(config)
        if (idx !== -1) Q.xhr.pendingRequests.splice(idx, 1)

        ;(isSuccess(status) ? deferred.resolve : deferred.reject)({
          data: response,
          status: status,
          headers: headersGetter(responseHeaders),
          config: config
        })
      }
    }

    if (config.withCredentials) {
      xhr.withCredentials = true
    }

    if (config.responseType) {
      xhr.responseType = config.responseType;
    }

    xhr.send(reqData || null)

    if (config.timeout > 0) {
      timeoutId = setTimeout(function() {
        status = aborted;
        xhr && xhr.abort()
      }, config.timeout)
    }

    return promise
  }

})