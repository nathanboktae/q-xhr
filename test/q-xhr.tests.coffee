describe 'q-xhr', ->
  it 'should register itself as an AMD module if an AMD loader is present'

  describe 'interceptors', ->
    it 'should accept injected rejected response interceptor'
    it 'should chain request, requestReject, response and responseReject interceptors'
    it 'should verify order of execution'

    describe 'response interceptors', ->
      it 'should default to an empty array'
      it 'should pass the responses through interceptors'

    describe 'request interceptors', ->
      it 'should pass request config as a promise'
      it 'should allow manipulation of request'
      it 'should allow replacement of the headers object'
      it 'should reject the http promise if an interceptor fails'
      it 'should not manipulate the passed-in config'
      it 'should support complex interceptors based on promises'
 
  describe 'xhr', ->
    it 'should do basic request'
    it 'should pass data if specified'
    it 'should pass timeout, withCredentials and responseType'
    it 'should use withCredentials from default'

    describe 'params', ->
      it 'should do basic request with params and encode'
      it 'should merge params if url contains some already'
      it 'should jsonify objects in params map'
      it 'should expand arrays in params map'

    describe 'callbacks', ->
      it 'should pass in the response object when a request is successful'
      it 'should pass in the response object when a request failed'

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

    describe 'pendingRequests', ->
      it 'should be an array of pending requests'
      it 'should remove the request before firing callbacks'
