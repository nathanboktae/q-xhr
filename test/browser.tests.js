var Q = require('q'),
    chai = require('chai')

chai.should()
mocha.timeout(10000)

require('../q-xhr')(XMLHttpRequest, Q)

describe('q-xhr', function() {
  it('should do basic request', function(done) {
    Q.xhr({
      url: 'http://echo.jsontest.com/foo/bar',
      method: 'GET'
    }).done(function(resp) {
      resp.status.should.equal(200)
      done()
    })
  })
})
