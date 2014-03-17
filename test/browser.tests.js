describe('q-xhr', function() {
  var failTest = function(done) {
    return function(respOrError) {
      done(respOrError instanceof Error ? respOrError : new Error(JSON.stringify(respOrError)))
      return respOrError
    }
  }

  it('should do basic request', function(done) {
    Q.xhr({
      url: '/json/foo/bar',
      method: 'GET'
    }).then(function(resp) {
      expect(resp.status).to.equal(200)
      done()
    }).fail(failTest(done))
  })

  it('should transform param object for a get into query params', function(done) {
    Q.xhr({
      method: 'get',
      url: '/echo/url',
      params: {
        foo: 'bar',
        baz: [1,2]
      }
    }).then(function(resp) {
      expect(resp.data).to.equal('/echo/url?baz=1&baz=2&foo=bar')
      done()
    }).fail(failTest(done))
  })

  it('should fail on non-200 status codes', function(done) {
    Q.xhr.get('/bleargh').then(function(resp) {
      done(new Error('Request should have failed, but it did not: ' + JSON.stringify(resp)))
    }, function(resp) {
      expect(resp.status).to.equal(404)
      done()
      return Q('ok')
   }).fail(failTest(done))
  })

  it('should fail the request on timeout', function(done) {
    Q.xhr.get('/json/foo/bar', {
      params: {
        latency: 700
      },
      timeout: 100
    }).then(function(resp) {
      done(new Error('response was successful when it should have timed out. ' + JSON.stringify(resp)))
    }, function(resp) {
      expect(resp.status).to.equal(0)
      expect(resp.status).to.not.be.ok()
      done()
      return Q('ok')
    }).fail(failTest(done))
  })

  describe('data transformation', function() {
    it('should transform content with Content-Type: application/json to json by default', function(done) {
      Q.xhr({
        url: '/json/foo/bar',
        method: 'GET'
      }).then(function(resp) {
        expect(resp.headers()['content-type']).to.contain('application/json')
        expect(resp.data.foo).to.equal('bar')
        done()
      }).fail(failTest(done))
    })

    it('should be able to post json by default', function(done) {
      Q.xhr.post('/echo/body', {
        foo: 'bar'
      }).then(function(resp) {
        expect(resp.data.foo).to.equal('bar')
        expect(resp.headers('Content-Type').toLowerCase()).to.contain('application/json')
        done()
      }).fail(failTest(done))
    })

    it('should be able to post non-JSON by explictly specifying the Content-Type', function(done) {
      var xml = '<book><author>John Doe</author><title>A Lovely Children\'s book</title></book>'

      Q.xhr({
        method: 'PUT',
        url: '/echo/body',
        data: xml,
        headers: {
          'Content-Type': 'text/xml'
        }
      }).then(function(resp) {
        expect(resp.data).to.equal(xml)
        expect(resp.headers('CONTENT-Type')).to.contain('text/xml')
        done()
      }).fail(failTest(done))
    })

    xit('should be able to upload files', function() {
    })    
  })

  describe('headers', function() {
    it('should send Accepts and Content-Type default headers for POSTs', function(done) {
      Q.xhr.post('/headers', {
        ignored: true
      }).then(function(resp) {
        expect(resp.data['accept'].toLowerCase()).to.contain('application/json')
        expect(resp.data['content-type'].toLowerCase()).to.contain('application/json')
        done()
      }).fail(failTest(done))
    })

    it('should send custom headers', function(done) {
      Q.xhr({
        url: '/headers',
        headers: {
          'X-CSRF': 'my-secret-token'
        }
      }).then(function(resp) {
        expect(resp.data['x-csrf'].toLowerCase()).to.equal('my-secret-token')
        done()
      }).fail(failTest(done))
    })
  })
})