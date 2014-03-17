module.exports = function(grunt) {
  grunt.initConfig({
    connect: {
      server: {
        options: {
          base: '',
          port: 9999,
          middleware: function(connect, options, middlewares) {
            var URL = require('url')
            middlewares.push(function(req, res, next) {
              var url = URL.parse(req.url, true), closed = false

              req.once('close', function() {
                closed = true
              })
              var handle = function () {
                var status = parseInt(url.query.status || '200', 10)
                if (url.pathname === '/headers') {
                  if (closed) return
                  res.setHeader('Content-Type', 'application/json')
                  res.writeHead(status)
                  res.write(JSON.stringify(req.headers))
                  res.end()
                } else if (url.pathname === '/echo/url') {
                  if (closed) return
                  res.setHeader('Content-Type', 'text/plain')
                  res.writeHead(status)
                  res.write(req.url)
                  res.end()
                } else if (url.pathname === '/echo/body') {
                  if (closed) return
                  res.setHeader('Content-Type', req.headers['content-type'])
                  res.writeHead(status)

                  var body = ''
                  req.on('data', function (data) {
                    body += data
                  })
                  req.on('end', function () {
                    res.write(body)
                    res.end()
                  })
                } else if (url.pathname.indexOf('/json/') === 0) {
                  if (closed) return
                  res.setHeader('Content-Type', 'application/json')
                  res.writeHead(status)

                  var pieces = url.pathname.split('/').splice(2),
                      data = {}

                  for (var i = 0; i < pieces.length; i += 2) {
                    data[pieces[i]] = pieces[i + 1]
                  }

                  res.write(JSON.stringify(data))
                  res.end()
                } else {
                  next()
                }
              }

              if (url.query.latency)
                setTimeout(handle, parseInt(url.query.latency, 10))
              else
                handle()
            })

            return middlewares
          },
        }
      }
    },
    'saucelabs-custom': {
      all: {
        options: {
          urls: ['http://127.0.0.1:9999/test/browser.html'],
          tunnelTimeout: 5,
          build: process.env.TRAVIS_JOB_ID || 0,
          concurrency: 3,
          browsers: [{
            browserName:"iphone",
            platform: "OS X 10.8",
            version: "6"
          }, {
            browserName:"iphone",
            platform: "OS X 10.6",
            version: "5.0"
          }, {
            browserName:"safari",
            platform: "OS X 10.8",
            version: "6"
          }, {
            browserName:"safari",
            platform: "OS X 10.6",
            version: "5"
          }, {
            browserName:"android",
            platform: "Linux",
            version: "4.0"
          }, {
            browserName: 'googlechrome',
            platform: 'linux'
          }, {
            browserName: 'firefox',
            platform: 'WIN7',
          }, {
            browserName: 'firefox',
            version: '19',
            platform: 'XP',
          },{
            browserName: 'internet explorer',
            platform: 'WIN8.1',
            version: '11'
          }, {
            browserName: 'internet explorer',
            platform: 'WIN8',
            version: '10'
          }, {
            browserName: 'internet explorer',
            platform: 'WIN7',
            version: '9'
          }, {
            browserName: 'internet explorer',
            platform: 'XP',
            version: '8'
          }, {
            browserName: "opera",
            platform: "linux"
          }],
          testname: 'q-xhr browser tests',
          tags: [process.env.TRAVIS_BRANCH || 'local']
        }
      }
    }
  })

  grunt.loadNpmTasks('grunt-saucelabs')
  grunt.loadNpmTasks('grunt-contrib-connect')

  grunt.registerTask('test', ['connect', 'saucelabs-custom'])
}