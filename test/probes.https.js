var debug = require('debug')('probes-https')
var helper = require('./helper')
var should = require('should')
var tv = require('..')
var addon = tv.addon

var request = require('request')
var https = require('https')

describe('probes.https', function () {
  var emitter

  var options = {
    key: "-----BEGIN RSA PRIVATE KEY-----\nMIICXQIBAAKBgQCsJU2dO/K3oQEh9wo60VC2ajCZjIudc8cqHl9kKNKwc9lP4Rw9\nKWso/+vHhkp6Cmx6Cshm6Hs00rPgZo9HmY//gcj0zHmNbagpmdvAmOudK8l5Npzd\nQwNROKN8EPoKjlFEBMnZj136gF5YAgEN9ydcLtS2TeLmUG1Y3RR6ADjgaQIDAQAB\nAoGBAJTD9/r1n5/JZ+0uTIzf7tx1kGJh7xW2xFtFvDIWhV0wAJDjfT/t10mrQNtA\n1oP5Fh2xy9YC+tZ/cCtw9kluD93Xhzg1Mz6n3h+ZnvnlMb9E0JCgyCznKSS6fCmb\naBz99pPJoR2JThUmcuVtbIYdasqxcHStYEXJH89Ehr85uqrBAkEA31JgRxeuR/OF\n96NJFeD95RYTDeN6JpxJv10k81TvRCxoOA28Bcv5PwDALFfi/LDya9AfZpeK3Nt3\nAW3+fqkYdQJBAMVV37vFQpfl0fmOIkMcZKFEIDx23KHTjE/ZPi9Wfcg4aeR4Y9vt\nm2f8LTaUs/buyrCLK5HzYcX0dGXdnFHgCaUCQDSc47HcEmNBLD67aWyOJULjgHm1\nLgIKsBU1jI8HY5dcHvGVysZS19XQB3Zq/j8qMPLVhZBWA5Ek41Si5WJR1EECQBru\nTUpi8WOpia51J1fhWBpqIbwevJ2ZMVz0WPg85Y2dpVX42Cf7lWnrkIASaz0X+bF+\nTMPuYzmQ0xHT3LGP0cECQQCqt4PLmzx5KtsooiXI5NVACW12GWP78/6uhY6FHUAF\nnJl51PB0Lz8F4HTuHhr+zUr+P7my7X3b00LPog2ixKiO\n-----END RSA PRIVATE KEY-----",
    cert: "-----BEGIN CERTIFICATE-----\nMIICWDCCAcGgAwIBAgIJAPIHj8StWrbJMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV\nBAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBX\naWRnaXRzIFB0eSBMdGQwHhcNMTQwODI3MjM1MzUwWhcNMTQwOTI2MjM1MzUwWjBF\nMQswCQYDVQQGEwJBVTETMBEGA1UECAwKU29tZS1TdGF0ZTEhMB8GA1UECgwYSW50\nZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKB\ngQCsJU2dO/K3oQEh9wo60VC2ajCZjIudc8cqHl9kKNKwc9lP4Rw9KWso/+vHhkp6\nCmx6Cshm6Hs00rPgZo9HmY//gcj0zHmNbagpmdvAmOudK8l5NpzdQwNROKN8EPoK\njlFEBMnZj136gF5YAgEN9ydcLtS2TeLmUG1Y3RR6ADjgaQIDAQABo1AwTjAdBgNV\nHQ4EFgQUTqL/t/yOtpAxKuC9zVm3PnFdRqAwHwYDVR0jBBgwFoAUTqL/t/yOtpAx\nKuC9zVm3PnFdRqAwDAYDVR0TBAUwAwEB/zANBgkqhkiG9w0BAQsFAAOBgQBn1XAm\nAsVdXKr3aiZIgOmw5q+F1lKNl/CHtAPCqwjgntPGhW08WG1ojhCQcNaCp1yfPzpm\niaUwFrgiz+JD+KvxvaBn4pb95A6A3yObADAaAE/ZfbEA397z0RxwTSVU+RFKxzvW\nyICDpugdtxRjkb7I715EjO9R7LkSe5WGzYDp/g==\n-----END CERTIFICATE-----"
  }

  var originalFlag

  //
  // Intercept tracelyzer messages for analysis
  //
  before(function (done) {
    // Awful hack
    originalFlag = process.env.NODE_TLS_REJECT_UNAUTHORIZED
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"
    emitter = helper.tracelyzer(done)
    tv.sampleRate = addon.MAX_SAMPLE_RATE
    tv.traceMode = 'always'
  })
  after(function (done) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalFlag
    emitter.close(done)
  })

  //
  // Helper to run checks against a server
  //
  function doChecks (checks, done) {
    emitter.on('message', function (msg) {
      var check = checks.shift()
      if (check) {
        check(msg.toString())
      }

      if ( ! checks.length) {
        emitter.removeAllListeners('message')
        done()
      }
    })
  }

  describe('https-server', function () {
    //
    // Test a simple res.end() call in an http server
    //
    it('should send traces for http routing and response layers', function (done) {
      var server = https.createServer(options, function (req, res) {
        debug('request started')
        res.end('done')
      })

      doChecks([
        function (msg) {
          msg.should.match(new RegExp('Layer\\W*nodejs', 'i'))
          msg.should.match(/Label\W*entry/)
          debug('entry is valid')
        },
        function (msg) {
          msg.should.match(new RegExp('Layer\\W*nodejs', 'i'))
          msg.should.match(/Label\W*exit/)
          debug('exit is valid')
        }
      ], function () {
        server.close(done)
      })

      server.listen(function () {
        var port = server.address().port
        debug('test server listening on port ' + port)
        request('https://localhost:' + port)
      })
    })

    //
    // Test multiple writes to the response in an http server
    //
    it('should send traces for each write to response stream', function (done) {
      var server = https.createServer(options, function (req, res) {
        debug('request started')
        res.write('wait...')
        res.end('done')
      })

      doChecks([
        function (msg) {
          msg.should.match(new RegExp('Layer\\W*nodejs', 'i'))
          msg.should.match(/Label\W*entry/)
          debug('entry is valid')
        },
        function (msg) {
          msg.should.match(new RegExp('Layer\\W*nodejs', 'i'))
          msg.should.match(/Label\W*exit/)
          debug('exit is valid')
        }
      ], function () {
        server.close(done)
      })

      server.listen(function () {
        var port = server.address().port
        debug('test server listening on port ' + port)
        request('https://localhost:' + port)
      })
    })

    //
    // Verify X-Trace header results in a continued trace
    //
    it('should continue tracing when receiving an xtrace id header', function (done) {
      var server = https.createServer(options, function (req, res) {
        debug('request started')
        res.end('done')
      })

      var origin = new tv.Event()

      doChecks([
        function (msg) {
          msg.should.match(new RegExp('Layer\\W*nodejs', 'i'))
          msg.should.match(new RegExp('Edge\\W*' + origin.opId, 'i'))
          msg.should.match(/Label\W*entry/)
          debug('entry is valid')
        }
      ], function () {
        server.close(done)
      })

      server.listen(function () {
        var port = server.address().port
        debug('test server listening on port ' + port)
        request({
          url: 'https://localhost:' + port,
          headers: {
            'X-Trace': origin.toString()
          }
        })
      })
    })

    //
    // Verify always trace mode forwards X-TV-Meta header and sampling data
    //
    it('should forward X-TV-Meta header and sampling data in always trace mode', function (done) {
      var server = https.createServer(options, function (req, res) {
        debug('request started')
        res.end('done')
      })

      doChecks([
        function (msg) {
          msg.should.match(new RegExp('Layer\\W*nodejs', 'i'))
          msg.should.match(/X-TV-Meta\W*foo/)
          msg.should.match(/SampleSource\W*/)
          msg.should.match(/SampleRate\W*/)
          msg.should.match(/Label\W*entry/)
          debug('entry is valid')
        },
        function (msg) {
          msg.should.match(new RegExp('Layer\\W*nodejs', 'i'))
          msg.should.match(/Label\W*exit/)
          debug('exit is valid')
        }
      ], function () {
        server.close(done)
      })

      server.listen(function () {
        var port = server.address().port
        debug('test server listening on port ' + port)
        request({
          url: 'https://localhost:' + port,
          headers: {
            'X-TV-Meta': 'foo'
          }
        })
      })
    })

    //
    // Verify behaviour of asyncrony within a request
    //
    it('should trace correctly within asyncrony', function (done) {
      var server = https.createServer(options, function (req, res) {
        debug('request started')
        setTimeout(function () {
          res.end('done')
        }, 10)
      })

      doChecks([
        function (msg) {
          msg.should.match(new RegExp('Layer\\W*nodejs', 'i'))
          msg.should.match(/Label\W*entry/)
          debug('entry is valid')
        },
        function (msg) {
          msg.should.match(new RegExp('Layer\\W*nodejs', 'i'))
          msg.should.match(/Label\W*exit/)
          debug('exit is valid')
        }
      ], function () {
        server.close(done)
      })

      server.listen(function () {
        var port = server.address().port
        debug('test server listening on port ' + port)
        request('https://localhost:' + port)
      })
    })

    //
    // Validate the various headers that get passed through to the event
    //
    var passthroughHeaders = {
      'X-Forwarded-For': 'Forwarded-For',
      'X-Forwarded-Host': 'Forwarded-Host',
      'X-Forwarded-Port': 'Forwarded-Port',
      'X-Forwarded-Proto': 'Forwarded-Proto',
      'X-Request-Start': 'Request-Start',
      'X-Queue-Start': 'Request-Start',
      'X-Queue-Time': 'Queue-Time'
    }

    Object.keys(passthroughHeaders).forEach(function (key) {
      var val = passthroughHeaders[key]

      var headers = {}
      headers[key] = 'test'

      it('should map ' + key + ' header to event.' + val, function (done) {
        var server = https.createServer(options, function (req, res) {
          debug('request started')
          res.end('done')
        })

        var checks = [
          function (msg) {
            msg.should.match(new RegExp('Layer\\W*nodejs', 'i'))
            msg.should.match(new RegExp(val + '\\W*test', 'i'))
            msg.should.match(/Label\W*entry/)
            debug('entry is valid')
          }
        ]

        emitter.on('message', function (msg) {
          var check = checks.shift()
          if (check) {
            check(msg.toString())
          }

          if ( ! checks.length) {
            emitter.removeAllListeners('message')
            server.close(done)
          }
        })

        server.listen(function () {
          var port = server.address().port
          debug('test server listening on port ' + port)
          var options = {
            url: 'https://localhost:' + port,
            headers: headers
          }
          request(options)
        })
      })
    })
  })

  describe('https-client', function () {
  	var check = {
  		'http-entry': function (msg) {
  			msg.should.match(/Layer\W*nodejs/)
  			msg.should.match(/Label\W*entry/)
  			debug('entry is valid')
  		},
  		'http-exit': function (msg) {
  			msg.should.match(/Layer\W*nodejs/)
  			msg.should.match(/Label\W*exit/)
  			debug('exit is valid')
  		}
  	}

  	function httpsTest (test, validations, done) {
  		var server = https.createServer(options, function (req, res) {
  			debug('request started')
  			test(function (err, data) {
  				if (err) return done(err)
  				res.end('done')
  			})
  		})

  		validations.unshift(check['http-entry'])
  		validations.push(check['http-exit'])
  		doChecks(validations, function () {
  			server.close(done)
  		})

  		server.listen(function () {
  			var port = server.address().port
  			debug('test server listening on port ' + port)
  			request('https://localhost:' + port)
  		})
  	}

    // TODO: Verify edges...kind of hard with all the regex matching...
    it('should trace https-client', function (done) {
      var server = https.createServer(options, function (req, res) {
        res.end('done')
        server.close()
      })

      server.listen(function () {
        var port = server.address().port
        var url = 'https://localhost:' + port + '/?foo=bar'

        // Escape regex characters in function
        function stringFn (fn) {
          return fn.toString().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")
        }

        httpsTest(function (done) {
          https.get(url, done.bind(null, null)).on('error', done)
        }, [
          function (msg) {
            msg.should.match(/Layer\W*https-client/)
            msg.should.match(new RegExp('RemoteURL\\W*' + stringFn(url)))
            msg.should.match(/IsService\W*yes/)
            msg.should.match(/Label\W*entry/)
          },
          function () {},
          function () {},
          function (msg) {
            msg.should.match(/Layer\W*https-client/)
            msg.should.match(/HTTPStatus\W*\d*/)
            msg.should.match(/Label\W*exit/)
          }
        ], done)
      })
    })
  })
})
