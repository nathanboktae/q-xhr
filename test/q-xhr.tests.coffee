require('mocha-as-promised')()

describe 'q-xhr', ->
  sinon = require 'sinon'
  Q = require 'Q'
  chai = require 'chai'
  chai.should()
  chai.use require 'sinon-chai'

  qXhr = require '../q-xhr'
  xhr = null
  XHR = ->
    @open = sinon.spy()
    @send = sinon.spy()
    @abort = sinon.spy()
    @setRequestHeader = sinon.spy()
    @getAllResponseHeaders = sinon.spy -> @headers
    xhr = this

  scenario = (opts) ->
    Q.delay(1).then ->
      opts.inFlight?()
      xhr.readyState = 4
      xhr.onreadystatechange()
      opts.afterComplete?()

  beforeEach ->
    qXhr XHR, Q

  it 'should register itself as an AMD module if an AMD loader is present'

  it 'should do basic request', ->
    Q.xhr
      url: '/foo',
      method: 'GET'

    scenario
      inFlight: ->
        xhr.send.should.have.been.called
      afterComplete: ->
        xhr.open.should.have.been.calledWith 'GET', '/foo', true

  it 'should pass data if specified', ->
    Q.xhr
      url: '/foo',
      method: 'POST',
      data: 'some-data'

    scenario
      afterComplete: ->
        xhr.send.should.have.been.calledWith 'some-data'

  it 'should by default not set withCredentials', ->
    Q.xhr
      url: 'http://bar.com/foo',
      method: 'POST',
      data: 'some-data',

    scenario
      inFlight: ->
        xhr.should.not.have.property 'withCredentials'

  it 'should set withCredentials from the config', ->
    Q.xhr
      url: 'http://bar.com/foo',
      method: 'POST',
      data: 'some-data',
      withCredentials: true

    scenario
      inFlight: ->
        xhr.withCredentials.should.be.true

  it 'should use withCredentials from default', ->
    Q.xhr.defaults.withCredentials = true
    Q.xhr
      url: 'http://bar.com/foo',
      method: 'POST',
      data: 'some-data',

    scenario
      inFlight: ->
        xhr.withCredentials.should.be.true

  describe 'params', ->
    it 'should do basic request with params and encode', ->
      Q.xhr
        url: '/url',
        params:
          'a=': '?&',
          b: 2

      scenario
        inFlight: ->
          xhr.open.should.have.been.calledWith 'GET', '/url?a%3D=%3F%26&b=2'

    it 'should merge params if url contains some already', ->
      Q.xhr
        url: '/url?c=3',
        params:
          a: 1,
          b: 2

      scenario
        inFlight: ->
          xhr.open.should.have.been.calledWith 'GET', '/url?c=3&a=1&b=2'

    it 'should jsonify objects in params map', ->
      Q.xhr
        url: '/url',
        params:
          a: 1,
          b:
            c: 3

      scenario
        inFlight: ->
          xhr.open.should.have.been.calledWith 'GET', '/url?a=1&b=%7B%22c%22%3A3%7D'

    it 'should expand arrays in params map'

  describe 'callbacks', ->
    it 'should pass in the response object when a request is successful', ->
      scenario
        inFlight: ->
          xhr.responseType = 'string'
          xhr.response = 'hi!'
          xhr.status = 200

      Q.xhr(
        url: '/foo',
        method: 'GET'
      ).then (resp) ->
        resp.data.should.equal 'hi!'
        resp.status.should.equal 200

    it 'should pass in the response object when a request failed', ->
      scenario
        inFlight: ->
          xhr.responseType = 'string'
          xhr.response = 'oops!'
          xhr.status = 500

      Q.xhr(
        url: '/foo',
        method: 'GET'
      ).then null, (resp) ->
        resp.data.should.equal 'oops!'
        resp.status.should.equal 500

    it 'should set the response from xhr.responseText if xhr.responseType isnt available', ->
      scenario
        inFlight: ->
          xhr.responseText = 'hi!'
          xhr.status = 200

      Q.xhr(
        url: '/foo',
        method: 'GET'
      ).then (resp) ->
        resp.data.should.equal 'hi!'
        resp.status.should.equal 200

  describe 'response headers', ->
    headersScenario = ->
      scenario
        inFlight: ->
          xhr.responseText = 'data'
          xhr.status = 200
          xhr.getAllResponseHeaders = sinon.spy ->
            'content-type': 'text/plain'
            'content-length': '4'
            'x-frame-options': 'nosniff'

    it 'should return single header', ->
      headersScenario()

      Q.xhr(
        url: '/foo',
        method: 'GET'
      ).then (resp) ->
        xhr.getAllResponseHeaders.should.have.been.calledOnce
        resp.headers('X-Frame-Options').should.equal 'nosniff'

    it 'should return null when single header does not exist', ->
      headersScenario()

      Q.xhr(
        url: '/foo',
        method: 'GET'
      ).then (resp) ->
        (typeof resp.headers('etag')).should.equal 'undefined'

    it 'should return all headers as object', ->
      headersScenario()

      Q.xhr(
        url: '/foo',
        method: 'GET'
      ).then (resp) ->
        resp.headers().should.deep.equal
          'content-type': 'text/plain'
          'content-length': '4'
          'x-frame-options': 'nosniff'

    describe 'parsing', ->
      parseHeaders = (rawHeaders, expect) ->
        scenario
          inFlight: ->
            xhr.status = 200
            xhr.getAllResponseHeaders = -> rawHeaders

        Q.xhr({ url: '/foo' }).then (resp) ->
          expect resp.headers()

      it 'should parse basic', ->
        parseHeaders 'date: Thu, 04 Aug 2011 20:23:08 GMT\n' + 'content-encoding: gzip\n' + 'transfer-encoding: chunked\n' + 'x-cache-info: not cacheable; response has already expired, not cacheable; response has already expired\n' + 'connection: Keep-Alive\n' + 'x-backend-server: pm-dekiwiki03\n' + 'pragma: no-cache\n' + 'server: Apache\n' + 'x-frame-options: DENY\n' + 'content-type: text/html; charset=utf-8\n' + 'vary: Cookie, Accept-Encoding\n' + 'keep-alive: timeout=5, max=1000\n' + 'expires: Thu: , 19 Nov 1981 08:52:00 GMT\n'
        , (headers) ->
          headers['date'].should.equal 'Thu, 04 Aug 2011 20:23:08 GMT'
          headers['content-encoding'].should.equal 'gzip'
          headers['transfer-encoding'].should.equal 'chunked'
          headers['keep-alive'].should.equal 'timeout=5, max=1000'

      it 'should parse lines without space after colon', ->
        parseHeaders 'key:value', (headers) ->
          headers.key.should.equal 'value'

      it 'should trim the values', ->
        parseHeaders 'key:     value ', (headers) ->
          headers.key.should.equal 'value'

      it 'should allow headers without value', ->
        parseHeaders 'key:', (headers) ->
          headers.key.should.equal ''

      it 'should merge headers with same key', ->
        parseHeaders 'key: a\nkey:b\n', (headers) ->
          headers.key.should.equal 'a, b'

      it 'should normalize keys to lower case', ->
        parseHeaders 'KeY: value', (headers) ->
          headers.key.should.equal 'value'

      it 'should parse CRLF as delimiter', ->
        parseHeaders 'a: b\r\nc: d\r\n', (headers) ->
          headers.should.deep.equal
            a: 'b'
            c: 'd'

      it 'should parse tab after semi-colon', ->
        parseHeaders 'a:\tb\nc: \td\n', (headers) ->
          headers.should.deep.equal
            a: 'b'
            c: 'd'

  describe 'request headers', ->
    it 'should send custom headers', ->
      Q.xhr
        url: '/foo',
        method: 'GET'
        headers:
          Custom: 'header'

      scenario
        inFlight: ->
          xhr.setRequestHeader.should.have.been.calledWith 'Custom', 'header'

    it 'should set default headers for GET request', ->
      Q.xhr
        url: '/foo',
        method: 'GET'

      scenario
        inFlight: ->
          xhr.setRequestHeader.should.have.been.calledWith 'Accept', 'application/json, text/plain, */*'

    it 'should set default headers for POST request', ->
      Q.xhr
        url: '/foo',
        method: 'POST',
        data: 
          foo: 'bar'

      scenario
        inFlight: ->
          xhr.setRequestHeader.should.have.been.calledTwice
            .and.calledWith('Accept', 'application/json, text/plain, */*')
            .and.calledWith('Content-Type', 'application/json;charset=utf-8')

    it 'should set default headers for PUT request', ->
      Q.xhr
        url: '/foo',
        method: 'PUT',
        data: 
          foo: 'bar'

      scenario
        inFlight: ->
          xhr.setRequestHeader.should.have.been.calledWith 'Accept', 'application/json, text/plain, */*'
          xhr.setRequestHeader.should.have.been.calledWith 'Content-Type', 'application/json;charset=utf-8'

    it 'should set default headers for PATCH request', ->
      Q.xhr
        url: '/foo',
        method: 'PATCH',
        data: 
          foo: 'bar'

      scenario
        inFlight: ->
          xhr.setRequestHeader.should.have.been.calledWith 'Accept', 'application/json, text/plain, */*'
          xhr.setRequestHeader.should.have.been.calledWith 'Content-Type', 'application/json;charset=utf-8'

    it 'should set default headers for custom HTTP method', ->
      Q.xhr
        url: '/foo',
        method: 'CUSTOM',
        data: 
          foo: 'bar'

      scenario
        inFlight: ->
          xhr.setRequestHeader.should.have.been.calledOnce
            .and.calledWith 'Accept', 'application/json, text/plain, */*'

    it 'should override default headers with custom in a case insensitive manner', ->
      Q.xhr
        url: '/foo',
        method: 'POST',
        headers:
          accept: 'text/xml'
          'content-type': 'xml'
        data: '<foo>bar</foo>'

      scenario
        inFlight: ->
          xhr.setRequestHeader.should.have.been.calledWith 'accept', 'text/xml'
          xhr.setRequestHeader.should.have.been.calledWith 'content-type', 'xml'

    it 'should not send Content-Type header if request data/body is undefined', ->
      Q.xhr
        url: '/foo',
        method: 'POST',
        headers:
          'content-type': 'xml'

      scenario
        inFlight: ->
          xhr.setRequestHeader.should.have.not.been.calledWith 'content-type'

    it 'should send execute result if header value is function', ->
      Q.xhr
        url: '/foo',
        method: 'POST',
        headers:
          'x-csrf': -> 'my-csrf-token'

      scenario
        inFlight: ->
          xhr.setRequestHeader.should.have.been.calledWith 'x-csrf', 'my-csrf-token'

  describe 'short methods', ->
    it 'should have get that calls xhr with GET as the method', ->
      Q.xhr.get '/foo'

      scenario
        inFlight: ->
          xhr.open.should.have.been.calledWith 'GET', '/foo'
          xhr.send.should.have.been.calledWith null

    it 'should have delete that calls xhr with DELETE as the method', ->
      Q.xhr.delete '/foo/1'

      scenario
        inFlight: ->
          xhr.open.should.have.been.calledWith 'DELETE', '/foo/1'
          xhr.send.should.have.been.calledWith null

    it 'should have head that calls xhr with HEAD as the method', ->
      Q.xhr.head '/foo'

      scenario
        inFlight: ->
          xhr.open.should.have.been.calledWith 'HEAD', '/foo'
          xhr.send.should.have.been.calledWith null

    it 'should have post that calls xhr with POST as the method', ->
      Q.xhr.post '/foo',
        book: 1,
        author: 'John Doe'

      scenario
        inFlight: ->
          xhr.open.should.have.been.calledWith 'POST', '/foo'
          xhr.send.should.have.been.calledWith '{"book":1,"author":"John Doe"}'

    it 'should have put that calls xhr with PUT as the method', ->
      Q.xhr.put '/foo/1',
        author: 'John Doe'
      ,
        headers:
          'x-csrf': 'my-csrf-token'

      scenario
        inFlight: ->
          xhr.open.should.have.been.calledWith 'PUT', '/foo/1'
          xhr.send.should.have.been.calledWith '{"author":"John Doe"}'
          xhr.setRequestHeader.should.have.been.calledWith 'x-csrf', 'my-csrf-token'

    it 'should have patch that calls xhr with PATCH as the method', ->
      Q.xhr.patch '/foo/2',
        tags: ['apple', 'banana']

      scenario
        inFlight: ->
          xhr.open.should.have.been.calledWith 'PATCH', '/foo/2'
          xhr.send.should.have.been.calledWith '{"tags":["apple","banana"]}'

  describe 'transformData', ->
    describe 'request', ->
      describe 'default', ->
        it 'should transform object into json', ->
          Q.xhr
            url: '/book',
            method: 'POST',
            data:
              book: 1,
              author: 'John Doe'

          scenario
            inFlight: ->
              xhr.open.should.have.been.calledWith 'POST', '/book'
              xhr.send.should.have.been.calledWith '{"book":1,"author":"John Doe"}'

        it 'should ignore strings', ->
          Q.xhr
            url: '/book/1/comments',
            method: 'POST',
            data: 'awesome!'

          scenario
            inFlight: ->
              xhr.send.should.have.been.calledWith 'awesome!'

        it 'should ignore File objects', ->
          file = 
            toString: -> '[object File]'

          Q.xhr
            url: '/book/1/images',
            method: 'POST',
            data: file

          scenario
            inFlight: ->
              xhr.send.should.have.been.calledWith file

      it 'should have access to request headers', ->
        transform = sinon.spy (data, headers) ->
          headers('accept').should.equal '*'

        Q.xhr.post('/foo', 'data',
          headers:
            'accept': '*'
          transformRequest: transform
        ).done ->
          transform.should.have.been.calledOnce

      it 'should pipeline more functions', ->
        first = (data, headers) -> data + '-first' + ':' + headers('h1')
        second = (data) -> data.toUpperCase()

        Q.xhr.post '/foo', 'data',
          headers:
            h1: 'v1'
          transformRequest: [first, second]

        scenario
          inFlight: ->
            xhr.send.should.have.been.calledWith 'DATA-FIRST:V1'

    describe 'response', ->
      describe 'default', ->
        it 'should deserialize json when Content-Type is json'

      it 'should have access to response headers'
      it 'should pipeline more functions'

  describe 'timeout', ->
    it 'should abort the request when the timeout expires'
    it 'should cancel timeout on completion'

  describe 'pendingRequests', ->
    it 'should be an array of pending requests'
    it 'should remove the request before firing callbacks'

  describe 'interceptors', ->
    it 'should accept injected rejected response interceptor'
    it 'should chain request, requestReject, response and responseReject interceptors'
    it 'should verify order of execution'

    describe 'response interceptors', ->
      it 'should default to an empty array', ->
        Q.xhr.interceptors.should.be.an('array').and.be.empty

      it 'should pass the responses through interceptors'

    describe 'request interceptors', ->
      it 'should pass request config as a promise'
      it 'should allow manipulation of request'
      it 'should allow replacement of the headers object'
      it 'should reject the http promise if an interceptor fails'
      it 'should not manipulate the passed-in config'
      it 'should support complex interceptors based on promises'
 
