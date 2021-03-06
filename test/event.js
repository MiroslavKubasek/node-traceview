var helper = require('./helper')
var should = require('should')
var tv = require('..')
var addon = tv.addon
var Event = tv.Event

describe('event', function () {
  var emitter
  var event

  //
  // Intercept tracelyzer messages for analysis
  //
  before(function (done) {
    emitter = helper.tracelyzer(done)
    tv.sampleRate = tv.addon.MAX_SAMPLE_RATE
    tv.traceMode = 'always'
  })
  after(function (done) {
    emitter.close(done)
  })

  it('should construct valid event', function () {
    event = new Event('test', 'entry')
    event.should.have.property('Layer', 'test')
    event.should.have.property('Label', 'entry')
    event.should.have.property('taskId').and.not.match(/^0*$/)
    event.should.have.property('opId').and.not.match(/^0*$/)
  })

  it('should enter the event context', function () {
    var context = addon.Context.toString()
    event.enter()
    addon.Context.toString().should.not.equal(context)
  })

  it('should send the event', function (done) {
    var event2 = new Event('test', 'exit', event.event)

    emitter.on('message', function (msg) {
      msg = msg.toString()
      msg.should.match(new RegExp('X-Trace\\W*' + event2))
      msg.should.match(new RegExp('Edge\\W*' + event.opId))
      msg.should.match(/Layer\W*test/)
      msg.should.match(/Label\W*exit/)
      done()
    })

    // NOTE: events must be sent within a request store context
    tv.requestStore.run(function () {
      event2.send()
    })
  })
})
