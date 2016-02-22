/*global describe, it, beforeEach*/
'use strict';

var chai          = require('chai'),
    Stream        = require('stream'),
    childProcess  = require('child_process'),
    constants     = require('../lib/constants'),
    gutil         = require('gulp-util'),
    expect        = chai.expect;

chai.use(require('sinon-chai'));
require('mocha-sinon');

var commandBuilder = require('../lib/msbuild-command-builder');
var msbuildRunner = require('../lib/msbuild-runner');

var defaults;

var events;

function simulateEvent(name, data) {
  events.push({ name: name, data: data });
}

describe('msbuild-runner', function () {

  beforeEach(function () {
    defaults = JSON.parse(JSON.stringify(constants.DEFAULTS));
    events = [];

    function spawn(command, args, options) {
      var listeners = {};

      process.nextTick(function() {
        events.forEach(function(e) {
          listeners[e.name](e.data);
        });
      });

      return {
        on: function(name, handler) {
          listeners[name] = handler;
        }
      };
    }

    this.sinon.stub(childProcess, 'spawn', spawn);
    this.sinon.stub(commandBuilder, 'construct').returns({ executable: 'msbuild', args: ['/nologo'] });
    this.sinon.stub(gutil, 'log');
  });

  it('should execute the msbuild command', function (done) {
    defaults.stdout = true;

    simulateEvent('close', 0);

    msbuildRunner.startMsBuildTask(defaults, {}, function () {
      expect(gutil.log).to.have.been.calledWith(gutil.colors.cyan('Build complete!'));
      done();
    });

    expect(childProcess.spawn).to.have.been.calledWith('msbuild', ['/nologo']);
  });

  it('should log the command when the logCommand option is set', function(done) {
    defaults.logCommand = true;

    simulateEvent('close', 0);

    msbuildRunner.startMsBuildTask(defaults, {}, function () {
      expect(gutil.log).to.have.been.calledWith('Using msbuild command:', 'msbuild', '/nologo');
      done();
    });
  });

  it('should log an error message when the msbuild command failed', function (done) {
    simulateEvent('close', 1);

    msbuildRunner.startMsBuildTask(defaults, {}, function () {
      expect(gutil.log).to.have.been.calledWith(gutil.colors.red('Build failed with code 1!'));
      done();
    });
  });

  it('should log an error message and return the error in the callback when the msbuild command failed', function (done) {
    defaults.errorOnFail = true;

    simulateEvent('close', 1);

    msbuildRunner.startMsBuildTask(defaults, {}, function (err) {
      expect(err.code).to.be.equal(1);
      expect(gutil.log).to.have.been.calledWith(gutil.colors.red('Build failed with code 1!'));
      done();
    });
  });

  it('should log an error message when the spawned process experienced an error', function (done) {
    simulateEvent('error', 'broken');

    msbuildRunner.startMsBuildTask(defaults, {}, function () {
      expect(gutil.log).to.have.been.calledWith('broken');
      expect(gutil.log).to.have.been.calledWith(gutil.colors.red('Build failed!'));
      done();
    });
  });

  it('should log an error and return the error in the callback when the spawned process experienced an error', function (done) {
    defaults.errorOnFail = true;

    simulateEvent('error', 'broken');

    msbuildRunner.startMsBuildTask(defaults, {}, function (err) {
      expect(err).to.be.equal('broken');
      expect(gutil.log).to.have.been.calledWith(gutil.colors.red('Build failed!'));
      done();
    });
  });
});
