describe('q-xhr', function() {
  it('should do basic request', function(done) {
    Q.xhr({
      url: '/json/foo/bar',
      method: 'GET'
    }).then(function(resp) {
      expect(resp.status).to.equal(200)
      done()
    }).fail(function(resp) { done(new Error(resp)) })
  })

  it('should transform content with Content-Type: application/json to json by default', function(done) {
    Q.xhr({
      url: '/json/foo/bar',
      method: 'GET'
    }).then(function(resp) {
      expect(resp.headers()['content-type']).to.contain('application/json')
      expect(resp.data.foo).to.equal('bar')
      done()
    }).fail(function(resp) { done(new Error(resp)) })
  })

  it('should send Accepts and Content-Type default headers for POSTs', function(done) {
    Q.xhr.post('/headers', {
      ignored: true
    }).then(function(resp) {
      expect(resp.data['accept'].toLowerCase()).to.contain('application/json')
      expect(resp.data['content-type'].toLowerCase()).to.contain('application/json')
      done()
    }).fail(function(resp) { done(new Error(resp)) })
  })
})