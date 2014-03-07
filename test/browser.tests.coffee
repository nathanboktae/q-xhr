describe 'q-xhr', ->
  it 'should do basic request', (done) ->
    Q.xhr(
      url: '/json/foo/bar'
      method: 'GET'
    ).then (resp) ->
      resp.status.should.equal 200
      done()
    , (resp) -> done new Error JSON.stringify resp