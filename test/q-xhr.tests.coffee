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

    it 'should pass in the response object when a request failed'
    it 'should pass in the response object when a request is successful', ->
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
    it 'should return single header'
    it 'should return null when single header does not exist'
    it 'should return all headers as object'

    describe 'parsing', ->
      it 'should parse basic'
      it 'should parse lines without space after colon'
      it 'should trim the values'
      it 'should allow headers without value'
      it 'should merge headers with same key'
      it 'should normalize keys to lower case'
      it 'should parse CRLF as delimiter'
      it 'should parse tab after semi-colon'

  describe 'request headers', ->
    it 'should send custom headers'
    it 'should set default headers for GET request'
    it 'should set default headers for POST request'
    it 'should set default headers for PUT request'
    it 'should set default headers for PATCH request'
    it 'should set default headers for custom HTTP method'
    it 'should override default headers with custom in a case insensitive manner'
    it 'should not send Content-Type header if request data/body is undefined'
    it 'should send execute result if header value is function'

  describe 'short methods', ->
    it 'should have get that calls xhr with GET as the method'
    it 'should have delete that calls xhr with DELETE as the method'
    it 'should have head that calls xhr with HEAD as the method'
    it 'should have post that calls xhr with POST as the method'
    it 'should have put that calls xhr with PUT as the method'
    it 'should have patch that calls xhr with PATCH as the method'

  describe 'transformData', ->
    describe 'request', ->
      describe 'default', ->
        it 'should transform object into json'
        it 'should ignore strings'
        it 'should ignore File objects'

      it 'should have access to request headers'
      it 'should pipeline more functions'

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
 
