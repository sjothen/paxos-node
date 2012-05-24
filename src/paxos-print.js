/*
 * Authors: Stephen Michael Jothen
 *          Yohannes Kifle Russom
 *
 * Helper functions for printing of messages.
 */
var util = require('util');

function cmdToString(cmd) {
  if(cmd.name == 'WITHDRAW' || cmd.name ==  'DEPOSIT') {
    var args = [cmd.accountNum, cmd.amount];
    return cmd.name + "(" + args.join(",") + ")";
  } else if(cmd.name == 'BALANCE') {
    return cmd.name + "(" + cmd.accountNum + ")";
  } else if(cmd.name == 'TRANSFER') {
    var args = [cmd.fromAccount , cmd.toAccount, cmd.amount];
    return cmd.name + "(" + args.join(",") + ")";
  }
}

function printMsg(m) {
  return;
  var out;
  switch(m.type) {
    case "PREPARE":
      out = util.format("%s(ins=%s, crnd=%s)", m.type, m.instance,
          m.crnd);
      break;
    case "PROMISE":
      var v = m.vval ? cmdToString(m.vval) : false;
      out = util.format("%s(ins=%s, rnd=%s, vrnd=%s, vvall=%s)",
        m.type, m.instance, m.rnd, m.vrnd, v);
      break;
    case "ACCEPT":
      var v = m.cval ? cmdToString(m.cval) : false;
      out = util.format("%s(ins=%s, crnd=%s, cval=%s)",
        m.type, m.instance, m.crnd, v);
      break;
    case "LEARN":
      var v = m.v ? cmdToString(m.v) : false;
      out = util.format("%s(ins=%s, n=%s, v=%s)",
        m.type, m.instance, m.n, v);
      break;
    case "CHOSEN":
      var v = m.value ? cmdToString(m.value) : false;
      out = util.format("%s(ins=%s, v=%s)",
        m.type, m.instance, v);
      break;
    case "NACK":
      out = util.format("%s(ins=%s, rnd=%s)",
        m.type, m.instance, m.round);
      break;
    case "GAP_REPLY":
      var v = m.value ? cmdToString(m.value) : false;
      out = util.format("%s(ins=%s, val=%s)",
        m.type, m.instance, v);
      break;
    case "GAP_REQUEST":
      out = util.format("%s(ins=%s, from=%s)",
        m.type, m.instance, m.from);
      break;
    case "DECIDED":
      var v = m.value ? cmdToString(m.value) : false;
      out = util.format("%s(ins=%s, value=%s)",
        m.type, m.instance, v);
    default:
      out = m.type;
      break;
  }
  console.log(out);
}

function cmdToString(cmd) {
  if(cmd.name == 'WITHDRAW' || cmd.name ==  'DEPOSIT') {
    var args = [cmd.accountNum, cmd.amount];
    return cmd.name + "(" + args.join(",") + ")";
  } else if(cmd.name == 'BALANCE') {
    return cmd.name + "(" + cmd.accountNum + ")";
  } else if(cmd.name == 'TRANSFER') {
    var args = [cmd.fromAccount , cmd.toAccount, cmd.amount];
    return cmd.name + "(" + args.join(",") + ")";
  }
}

function printCmd(cmd) {
  console.log(cmdToString(cmd));
}

exports.printMsg = printMsg;
exports.printCmd = printCmd;
exports.cmdToString = cmdToString;
