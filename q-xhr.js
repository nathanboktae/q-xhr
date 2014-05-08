// Currently requires polyfills for
// Array#forEach
// Object.keys
// String#trim

(function(factory) {
  if (typeof define === 'function' && define.amd) {
    define(['q'], function(Q) {
      return factory(XMLHttpRequest, Q)
    })
  } else if (typeof exports === 'object' && typeof module === 'object') {
    // CommonJS, mainly for testing
    module.exports = factory
  } else {
    if (typeof Q !== 'undefined') {
      factory(XMLHttpRequest, Q)
    }
  }
})(function(XHR, Q) {
  // shallow extend with varargs
  function extend(dst) {
    Array.prototype.forEach.call(arguments, function(obj) {
      if (obj && obj !== dst) {
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
      key = lowercase(line.substr(0, i).trim())
      val = line.substr(i + 1).trim()

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
        return headersObj[lowercase(name)]
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
    var defaults = Q.xhr.defaults,
    config = {
      transformRequest: defaults.transformRequest,
      transformResponse: defaults.transformResponse
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

    promise = Q.when(config)

    // build a promise chain with request interceptors first, then the request, and response interceptors
    Q.xhr.interceptors.filter(function(interceptor) {
        return !!interceptor.request || !!interceptor.requestError
      }).map(function(interceptor) {
        return { success: interceptor.request, failure: interceptor.requestError }
      })
    .concat({ success: serverRequest })
    .concat(Q.xhr.interceptors.filter(function(interceptor) {
        return !!interceptor.response || !!interceptor.responseError
      }).map(function(interceptor) {
        return { success: interceptor.response, failure: interceptor.responseError }
      })
    ).forEach(function(then) {
      promise = promise.then(then.success, then.failure)
    })

    return promise
  }


  var contentTypeJson = { 'Content-Type': 'application/json;charset=utf-8' }

  Q.xhr.defaults = {
    transformResponse: [function(data, headers) {
      if (typeof data === 'string' && (headers('content-type') || '').indexOf('json') >= 0) {
        data = JSON.parse(data)
      }
      return data
    }],

    transformRequest: [function(data) {
      return !!data && typeof data === 'object' && data.toString() !== '[object File]' ?
        JSON.stringify(data) : data
    }],

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

        // cancel timeout and subsequent timeout promise resolution
        timeoutId && clearTimeout(timeoutId)
        status = status || xhr.status
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

    xhr.onprogress = function (progress) {
      deferred.notify(progress)
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

  ['get', 'delete', 'head'].forEach(function(name) {
    Q.xhr[name] = function(url, config) {
      return Q.xhr(extend(config || {}, {
        method: name,
        url: url
      }))
    }
  });

  ['post', 'put', 'patch'].forEach(function(name) {
    Q.xhr[name] = function(url, data, config) {
      return Q.xhr(extend(config || {}, {
        method: name,
        url: url,
        data: data
      }))
    }
  })

  return Q
})