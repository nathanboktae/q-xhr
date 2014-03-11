describe('q-xhr', function() {
  it('should do basic request', function() {
    return Q.xhr({
      url: '/json/foo/bar',
      method: 'GET'
    }).then(function(resp) {
      resp.status.should.equal(200)
    })
  })

  it('should transform content with Content-Type: application/json to json by default', function() {
    return Q.xhr({
      url: '/json/foo/bar',
      method: 'GET'
    }).then(function(resp) {
      resp.headers()['content-type'].should.equal('application/json')
      resp.data.foo.should.equal('bar')
    })
  })

  it('should send Accepts and Content-Type default headers for POSTs', function() {
    return Q.xhr.post('/headers', {
      ignored: true
    }).then(function(resp) {
      resp.data['accept'].toLowerCase().should.contain('application/json')
      resp.data['content-type'].toLowerCase().should.equal('application/json;charset=utf-8')
    })
  })
})