/*
 * Authors: Stephen Michael Jothen
 *          Yohannes Kifle Russom
 *
 * This module represents all the logic in order to implement the Paxos
 * algorithm.
 *
 * When a command is decided upon this module will emit a DECIDE message
 * to the application layer above it.
 */

function Instance(n, v) {
  this.num = n;
  this.proposedVal = v;

  this.crnd = 0;
  this.promises = [];
  this.learns = [];

  this.rnd = 0;
  this.vrnd = false;
  this.vval = false;
}

Instance.prototype.pickNext = function() {
  this.crnd++;
};

function InstanceList() {
  this.instances = [];
}

InstanceList.prototype.getCreate = function(i) {
  this.instances[i] = this.instances[i] || new Instance(i, false);
  return this.instances[i];
};

InstanceList.prototype.length = function() {
  return this.instances.length;
};

InstanceList.prototype.append = function(ins) {
  this.instances.push(ins);
};

InstanceList.prototype.forEach = function(callback) {
  for(var i = 0; i < this.instances.length; i++) {
    callback(i, this.instances[i]);
  }
};

exports.Instance = Instance;
exports.InstanceList = InstanceList;
