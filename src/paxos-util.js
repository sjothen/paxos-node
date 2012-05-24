/*
 * Authors: Stephen Michael Jothen
 *          Yohannes Kifle Russom
 *
 * Helper functions for printing of messages.
 */

function findMax(lst) {
  var maxrnd = -1;
  var maxval = false;

  for(var i = 0; i < lst.length; i++) {
    var vrnd = lst[i][0];
    var vval = lst[i][1];

    if(vrnd && vrnd > maxrnd) {
      maxrnd = vrnd;
      maxval = vval;
    }
  }

  return maxval;
}

function countSameRound(lst, rnd) {
  var cnt = 0;
  for(var i = 0; i < lst.length; i++) {
    if(lst[i].n == rnd) {
      cnt++;
    }
  }
  return cnt;
}

function bcastPaxos(msg) {
  process.send({
    type: 'BROADCAST',
    msg: msg
  });
}

function sendPaxos(to, msg) {
  process.send({
    type: 'SEND',
    to: to,
    msg: msg
  });
}

function bcastPrepare(instance, crnd) {
  bcastPaxos({
    type: 'PREPARE',
    instance: instance,
    crnd: crnd
  });
}

function sendPrepare(to, instance, crnd) {
  sendPaxos(to, {
    type: 'PREPARE',
    instance: instance,
    crnd: crnd
  });
}

function sendPromise(to, ins, rnd, vrnd, vval) {
  sendPaxos(to, {
    type: 'PROMISE',
    instance: ins,
    rnd: rnd,
    vrnd: vrnd,
    vval: vval
  });
}

function sendNack(to, id, instance, round) {
  sendPaxos(to, {
    type: 'NACK',
    from: id,
    instance: instance,
    round: round
  });
}

function bcastAccept(ins, crnd, cval) {
  bcastPaxos({
    type: 'ACCEPT',
    instance: ins,
    crnd: crnd,
    cval: cval
  });
}

function sendLearn(to, ins, n, v) {
  sendPaxos(to, {
    type: 'LEARN',
    instance: ins,
    n: n,
    v: v
  });
}

function bcastChosen(ins, value) {
  bcastPaxos({
    type: 'CHOSEN',
    instance: ins,
    value: value
  });
}

exports.bcastPaxos = bcastPaxos;
exports.sendPaxos = sendPaxos;
exports.bcastPrepare = bcastPrepare;
exports.sendPrepare = sendPrepare;
exports.sendPromise = sendPromise;
exports.sendNack = sendNack;
exports.bcastAccept = bcastAccept;
exports.sendLearn = sendLearn;
exports.bcastChosen = bcastChosen;

exports.findMax = findMax;
exports.countSameRound = countSameRound;
