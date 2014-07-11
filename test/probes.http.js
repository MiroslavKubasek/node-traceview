var helper = require('./helper')
var should = require('should')
var oboe = require('..')
var addon = oboe.addon
oboe.sampleRate = oboe.addon.MAX_SAMPLE_RATE

var http = require('http')
var request = require('request')

function noop () {}

describe('probes.http', function () {
  var emitter

  //
  // Intercept tracelyzer messages for analysis
  //
  before(function (done) {
    emitter = helper.tracelyzer(1234, done)
  })
  after(function (done) {
    emitter.close(done)
  })

  //
  // Generic message checkers for response events
  //
  var checkers = {
    'http-response-write-entry': function (msg) {
      msg.should.match(new RegExp('Layer\\W*http-response-write', 'i'))
      msg.should.match(/Label\W*entry/)
    },
    'http-response-write-exit': function (msg) {
      msg.should.match(new RegExp('Layer\\W*http-response-write', 'i'))
      msg.should.match(/Label\W*exit/)
    },
    'http-response-end-entry': function (msg) {
      msg.should.match(new RegExp('Layer\\W*http-response-end', 'i'))
      msg.should.match(/Label\W*entry/)
    },
    'http-response-end-exit': function (msg) {
      msg.should.match(new RegExp('Layer\\W*http-response-end', 'i'))
      msg.should.match(/Label\W*exit/)
    },
  }

  //
  // Test a simple res.end() call in an http server
  //
  it('should send traces for http routing and response layers', function (done) {
    var server = http.createServer(function (req, res) {
      res.end('done')
    })

    var checks = [
      function (msg) {
        msg.should.match(new RegExp('Layer\\W*http', 'i'))
        msg.should.match(/Label\W*entry/)
      },

      // checkers['http-response-end-entry'],
      // checkers['http-response-write-entry'],
      // checkers['http-response-write-exit'],
      // checkers['http-response-end-exit'],

      function (msg) {
        msg.should.match(new RegExp('Layer\\W*http', 'i'))
        msg.should.match(/Label\W*exit/)
        emitter.removeAllListeners('message')
        server.close(done)
      }
    ]

    emitter.on('message', function (msg) {
      checks.shift()(msg.toString())
    })

    server.listen(function () {
      var port = server.address().port
      request('http://localhost:' + port)
    })
  })

  //
  // Test multiple writes to the response in an http server
  //
  it('should send traces for each write to response stream', function (done) {
    var server = http.createServer(function (req, res) {
      res.write('wait...')
      res.end('done')
    })

    var checks = [
      function (msg) {
        msg.should.match(new RegExp('Layer\\W*http', 'i'))
        msg.should.match(/Label\W*entry/)
      },

      // checkers['http-response-write-entry'],
      // checkers['http-response-write-exit'],

      // Note that, if the stream has been writtern to already,
      // calls to end will defer to calling write before ending
      // checkers['http-response-end-entry'],
      // checkers['http-response-write-entry'],
      // checkers['http-response-write-exit'],
      // checkers['http-response-end-exit'],

      function (msg) {
        msg.should.match(new RegExp('Layer\\W*http', 'i'))
        msg.should.match(/Label\W*exit/)
        emitter.removeAllListeners('message')
        server.close(done)
      }
    ]

    emitter.on('message', function (msg) {
      checks.shift()(msg.toString())
    })

    server.listen(function () {
      var port = server.address().port
      request('http://localhost:' + port)
    })
  })
})
