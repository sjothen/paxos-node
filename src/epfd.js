/*
 * Authors: Stephen Michael Jothen
 *          Yohannes Kifle Russom
 *
 * This module is the Eventually Perfect Failure Detector. We use the algorithm
 * from the textbook pretty much directly without much modification.
 *
 * This module also spawns a child process (the Eventual Leader Detector) which
 * we communicate with by sending messages.
 */
var cp = require("child_process"),
    set = require("./set");

// Spawn the child process
console.log("Spawning ELD process");
var eld = cp.fork(__dirname + '/eld.js');
eld.on('message', function(msg) {
  if(msg.type == 'BROADCAST' || msg.type == 'SEND' ||
      msg.type == 'RESPONSE') {
    // process is the parent process, server.js
    process.send(msg);
  }
});

var DELTA = 2000;

var tempprocs = [];
var procs = [];
var id;

var alive = [];
var suspected = [];
var delay = DELTA;
 
/* Our timeout function which gets called every two seconds by default.
 * Note that at the end of the timeout function, we set a new timeout for
 * the same function.
 */
var timeout = function() {
  /* If any new processes have connected during running of the last timeout
   * then we add them to the actual processes list before we run it this time
   */
  if(tempprocs.length > 0) {
    procs = set.union(procs, tempprocs);
    alive = set.union(alive, tempprocs);
    tempprocs = [];
  }

  /* Algorithm taken from the book */
  if(set.intersection(alive, suspected).length != 0) {
    delay += DELTA;
  }

  for(var i = 0; i < procs.length; i++) {
    var p = procs[i];

    if(!set.member(alive, p) && !set.member(suspected, p)) {
      suspected = set.union(suspected, [p]);
      eld.send({ type: 'SUSPECT', who: p });
    } else if(set.member(alive, p) && set.member(suspected, p)) {
      suspected = set.difference(suspected, [p]);
      eld.send({ type: 'RESTORE', who: p });
    }

    // Send request to parent (server.js) who sends it out over network
    process.send({ type: 'HEARTBEAT_REQUEST', to: p, from: id });
  }

  alive = [];
  /* Set another timeout recursively */
  setTimeout(timeout, delay);
}

setTimeout(timeout, delay);

/*
 * This registers a function for when this process (EPFD) receives
 * a message from the parent server process. We can then handle the
 * message and if necessary, send a message back to the parent process
 * to go out to the other nodes in the network.
 */
process.on('message', function(msg) {
  eld.send(msg);
  if(msg.type == 'CONNECT') {
    tempprocs = set.union(tempprocs, [msg.to]);
  } else if(msg.type == 'ID') {
    id = msg.name;
  } else if(msg.type == 'HEARTBEAT_REQUEST') {
    process.send({ type: 'HEARTBEAT_REPLY', to: msg.from, from: id });
  } else if(msg.type == 'HEARTBEAT_REPLY') {
    alive = set.union(alive, [msg.from]);
  }
});
