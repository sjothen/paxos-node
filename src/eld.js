/*
 * Authors: Stephen Michael Jothen
 *          Yohannes Kifle Russom
 *
 * This module is the Eventual Leader Detector.
 *
 * Algorithm is mostly a modified version from the algorithm given in the
 * textbook. 
 */
var set = require("./set"),
    cp = require("child_process");

// Spawn child process representing an application running on top of the ELD
// and receiving Trust messages from it.
//
// In the future the child process being spawned can be a Paxos process
console.log("Spawning PAXOS process");
var paxos = cp.fork(__dirname + '/paxos.js');
paxos.on('message', function(msg) {
  //process.send(msg);
  if(msg.type == 'BROADCAST' || msg.type == 'SEND' ||
      msg.type == 'RESPONSE') {
    process.send(msg);
  }
});

var suspected = [];
var procs = [];
var leader = null;

/* We need a maxrank() function which we can use to find the
 * process of maximum rank that is currently alive.
 *
 * To keep it simple we use the processes name as the rank, and a simple
 * string comparison to find the maximumly ranked process.
 */
function maxrank(ps) {
  var max = "";
  for(var i = 0; i < ps.length; i++) {
    if(ps[i] > max) {
      max = ps[i];
    }
  }
  return max;
}

// Called whenever a leader change could have possibly occurred to
// emit a Trust message to the application layer.
function leaderChange() {
  var temp = maxrank(set.difference(procs, suspected));
  if(temp != leader) {
    leader = temp;
    paxos.send({ type: 'TRUST', who: leader });
  }
}

// Messages received from parent process (EPFD)
process.on('message', function(msg) {
  paxos.send(msg);
  if(msg.type == 'CONNECT') {
    procs = set.union(procs, [msg.to]);
    leaderChange();
  } else if(msg.type == 'ID') {
    procs = set.union(procs, [msg.name]);
    leaderChange();
  } else if(msg.type == 'SUSPECT') {
    suspected = set.union(suspected, [msg.who]);
    leaderChange();
  } else if(msg.type == 'RESTORE') {
    suspected = set.difference(suspected, [msg.who]);
    leaderChange();
  }
});

