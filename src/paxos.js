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
var assert = require('assert'),
    cp     = require('child_process'),
    util   = require('util'),
    pu     = require('./paxos-util'),
    pp     = require('./paxos-print'),
    pi     = require('./paxos-instance');

var size;
var leader;
var id;

console.log("Spawning APP process");
var app = cp.fork(__dirname + '/app.js');
app.on('message', function(msg) {
  process.send(msg);
});

// When we receive majority of promises, we don't have to run Phase 1
// anymore.
var runPhase1 = true;
// List of pending commands received
var pending = [];
// List of instance state data (current round, etc.)
var il = new pi.InstanceList();

// Returns true if we are the current leader, false otherwise
function imLeader() {
  return (leader == id);
}

/* Phase 1A
 * 
 * Since we're leader and we receive a command, we must send a PREPARE
 * message to all other processes.
 */
function sendPrepare(cmd) {
  // Create instance with sequence number and the value we want to agree on
  var seq = il.length();
  var ins = new pi.Instance(seq, cmd);
  ins.pickNext();
  il.append(ins);

  pu.bcastPrepare(seq, ins.crnd);
}

// Helper function to restart Phase 1 for an instance with a NO-OP command
function sendPrepareInstance(idx, cmd) {
  var ins = il.getCreate(idx);

  ins.proposedValue = cmd;
  ins.pickNext();
  ins.promises = [];
  ins.learns = [];

  pu.bcastPrepare(ins.num, ins.crnd);
}

function sendDecided(ins) {
  pu.sendPaxos(leader, {
    type: 'DECIDED',
    instance: ins.num,
    value: ins.value
  });
}

function handlePrepare(msg) {
  pp.printMsg(msg);
  // Ignore messages if we're leader
  if(imLeader()) return;

  // Either get the instance for that sequence number or create it
  // in the case where it is a never before seen instance number.
  var ins = il.getCreate(msg.instance);

  if(ins.done) {
    // Instance is complete so we need to send decided msg to leader
    sendDecided(ins);
    return;
  }

  // If current round from leader greater than our round, send promise
  // to leader.
  if(msg.crnd > ins.rnd) {
    ins.rnd = msg.crnd;
    pu.sendPromise(leader, msg.instance, ins.rnd, ins.vrnd, ins.vval);
  } else {
    // Send a NACK so the leader can update his round
    pu.sendNack(leader, id, msg.instance, ins.rnd);
  }
}

function handlePromise(msg) {
  pp.printMsg(msg);
  // Ignore messages if we're NOT leader
  if(!imLeader()) return;

  var ins = il.getCreate(msg.instance);
  
  if(ins.crnd == msg.rnd) {
    var last = [msg.vrnd, msg.vval];
    ins.promises.push(last);
    var len = ins.promises.length;
    if(!ins.promised && len >= Math.floor(size/2) + 1) {
      runPhase1 = false;
      // Send accepts only once
      ins.promised = true;
      var val = pu.findMax(ins.promises);
      if(val) {
        // Command already tied to this instance, have to re-queue it
        // If it was a NO-OP command, don't requeue it
        if(ins.proposedVal != "NO-OP")
          pending.unshift(ins.proposedVal);
        ins.proposedVal = val;
      }
      pu.bcastAccept(msg.instance, ins.crnd, ins.proposedVal);
    }
  }
}

function skipPhase1SendAccept(cmd) {
  if(!imLeader()) return;

  var seq = il.length();
  var ins = new pi.Instance(seq, cmd);
  ins.pickNext();
  il.append(ins);

  pu.bcastAccept(seq, ins.crnd, cmd);
}

function handleAccept(msg) {
  pp.printMsg(msg);
  if(imLeader()) return;

  var ins = il.getCreate(msg.instance);

  if(ins.done) {
    sendDecided(ins);
    return;
  }

  var n = msg.crnd;
  var v = msg.cval;

  if(n >= ins.rnd && n != ins.vrnd) {
    ins.rnd = n;
    ins.vrnd = n;
    ins.vval = v;

    pu.sendLearn(leader, msg.instance, n, v);
  }
}

function handleLearn(msg) {
  pp.printMsg(msg);
  if(!imLeader()) return;

  var ins = il.getCreate(msg.instance);
  if(ins.done) return;

  ins.learns.push(msg);

  if(pu.countSameRound(ins.learns, msg.n) >= Math.floor(size/2) + 1) {
    pu.bcastChosen(msg.instance, msg.v);
    ins.done = true;
    ins.value = msg.v;
  }
}

function handleChosen(msg) {
  pp.printMsg(msg);
  if(imLeader()) return;

  var ins = il.getCreate(msg.instance);

  if(ins.done) {
    sendDecided(ins);
    return;
  }

  ins.done = true;
  ins.value = msg.value;
}

function handleNack(msg) {
  pp.printMsg(msg);
  if(!imLeader()) return;

  var ins = il.getCreate(msg.instance);
  
  if(msg.round + 1 > ins.crnd) {
    // Update to higher round
    ins.crnd = msg.round + 1;
  }

  // Re-send prepare
  pu.sendPrepare(msg.from, msg.instance, ins.crnd);
}

function handleDecided(msg) {
  var ins = il.getCreate(msg.instance);

  if(ins.done)
    return;

  pp.printMsg(msg);

  // Tried to propose value but the instance already decided on
  // acceptor, so requeue proposed value to commands list.
  if(ins.proposedVal && ins.proposedVal != "NO-OP")
    pending.unshift(ins.proposedVal);

  ins.done = true;
  ins.value = msg.value;
}

function sendGapRequest(idx) {
  var ins = il.getCreate(idx);
  pu.sendPaxos(leader, {
    type: 'GAP_REQUEST',
    from: id,
    instance: idx
  });
}

function handleGapRequest(msg) {
  pp.printMsg(msg);
  var ins = il.getCreate(msg.instance);

  if(ins.decided) {
    pu.sendPaxos(msg.from, {
      type: 'GAP_REPLY',
      instance: msg.instance,
      value: ins.value
    });
  }
}

function handleGapReply(msg) {
  pp.printMsg(msg);
  var ins = il.getCreate(msg.instance);

  if(!ins.done) {
    ins.done = true;
    ins.value = msg.value;
  }
}

// Delay for processing commands and checking that all previous instances
// have been decided on.
function paxosWatcher() {
  var exec = true;
  il.forEach(function(idx, ins) {
    if(exec && ins && (ins.done || ins.decided)) {
      if(!ins.decided) {
        ins.decided = true;
        //console.log(idx + " " + pp.cmdToString(ins.value))
        app.send({
          type: 'RUN',
          command: ins.value
        });
      }
    } else {
      exec = false;
      if(imLeader()) {
        // Gap found by leader, propose NO-OP command
        //console.log("GAP(" + idx + ")");
        sendPrepareInstance(idx, "NO-OP");
      } else {
        // Gap found by acceptor, ask for value from every other node.
        //console.log("GAP(" + idx + ")");
        sendGapRequest(idx);
      }
    }
  });

  var cmd;
  while(cmd=pending.shift()) {
    if(runPhase1) {
      sendPrepare(cmd);
    } else {
      skipPhase1SendAccept(cmd);
    }
  }
}

// Run this function every DELAY milliseconds
var DELAY = 1000;
setInterval(paxosWatcher, DELAY);

process.on('message', function(msg) {
  if(msg.type == 'TRUST') {
    console.log("LEADER: " + msg.who);
    leader = msg.who;
  } else if(msg.type == 'ID') {
    id = msg.name;
  } else if(msg.type == 'CLUSTER_SIZE') {
    size = msg.size;
  } else if(msg.type == 'COMMAND') {
    if(imLeader()) {
      pending.push(msg);
    }
    // Ignore command otherwise
  } else if(msg.type == 'PREPARE') {
    handlePrepare(msg);
  } else if(msg.type == 'PROMISE') {
    handlePromise(msg);
  } else if(msg.type == 'ACCEPT') {
    handleAccept(msg);
  } else if(msg.type == 'LEARN') {
    handleLearn(msg);
  } else if(msg.type == 'CHOSEN') {
    handleChosen(msg);
  } else if(msg.type == 'NACK') {
    handleNack(msg);
  } else if(msg.type == 'DECIDED') {
    handleDecided(msg);
  } else if(msg.type == 'GAP_REQUEST') {
    handleGapRequest(msg);
  } else if(msg.type == 'GAP_REPLY') {
    handleGapReply(msg);
  }
});
