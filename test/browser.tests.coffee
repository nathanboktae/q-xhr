describe 'q-xhr', ->
  it 'should do basic request', (done) ->
    Q.xhr(
      url: 'http://echo.jsontest.com/foo/bar'
      method: 'GET'
    ).done (resp) ->
      resp.status.should.equal 200
      done()