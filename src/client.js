/*
 * Authors: Stephen Michael Jothen
 *          Yohannes Kifle Russom
 *
 * Implementation of client which sends commands to each
 * of the nodes.
 */
var net    = require('net'),
    dgram  = require('dgram'),
    crypto = require('crypto'),
    pp     = require('./paxos-print'),
    line   = require('./line');

// A unique ID to identify responses to our commands
var uniqueId = crypto.randomBytes(16).toString('hex');
var gotResponse = [];

// Table of sockets connecting us to the other nodes
var sockets = {};

var mcast = dgram.createSocket('udp4');
var multicastAddress = '239.1.2.3';
var multicastPort = 5554;

mcast.bind(multicastPort);
mcast.addMembership(multicastAddress);

// Receive a message to the multicast group
mcast.on("message", function(data, rinfo) {
  var msg = JSON.parse(data.toString());
  // If we receive connect message not from ourselves and we aren't
  // already connected to that process, then we connect to it.
  if(msg.type == 'CONNECT' && !sockets[msg.to]) {
    var addr = msg.to.split("/");
    var s = net.connect(addr[1], addr[0]);
    sockets[msg.to] = s;
    console.log("Connected to " + msg.to);
  } else if(msg.type == 'RESPONSE') {
    var cmd = msg.command;
    if(cmd.fromId == uniqueId) {
      // Command came from us
      if(!gotResponse[cmd.cmdSequenceNo]) {
        // Haven't gotten a response yet
        gotResponse[cmd.cmdSequenceNo] = true;
        var s = pp.cmdToString(cmd);
        console.log(s + " => " + msg.response);
      }
    }
  }
});

function bcast(cmd) {
  for(var name in sockets) {
    var s = sockets[name];
    try {
      s.write(JSON.stringify(cmd) + "\n");
    } catch(e) {
      delete sockets[name];
    }
  }
}

function deposit(accountNum, amount) {
  return {
    type: 'COMMAND',
    name: 'DEPOSIT',
    accountNum: parseInt(accountNum),
    amount: parseInt(amount)
  };
}

function withdraw(accountNum, amount) {
  return {
    type: 'COMMAND',
    name: 'WITHDRAW',
    accountNum: parseInt(accountNum),
    amount: parseInt(amount)
  };
}

function transfer(fromAccount, toAccount, amount) {
  return {
    type: 'COMMAND',
    name: 'TRANSFER',
    fromAccount: parseInt(fromAccount),
    toAccount: parseInt(toAccount),
    amount: parseInt(amount)
  };
}

function balance(accountNum) {
  return {
    type: 'COMMAND',
    name: 'BALANCE',
    accountNum: parseInt(accountNum)
  };
}

var wdRx = /^withdraw\(\s*(\d+)\s*,\s*(\d+)\s*\)$/;
var depRx = /^deposit\(\s*(\d+)\s*,\s*(\d+)\s*\)$/;
var trRx = /^transfer\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/;
var balRx = /^balance\(\s*(\d+)\s*\)$/;

var cmdSequenceNo = 0;

var lh = new line.LineHandler(function(line) {
  var m, cmd;
  var ln = line.trim();

  if(m=ln.match(wdRx)) {
    cmd=withdraw(m[1], m[2]);
  } else if(m=ln.match(depRx)) {
    cmd=deposit(m[1], m[2]);
  } else if(m=ln.match(trRx)) {
    cmd=transfer(m[1], m[2], m[3]);
  } else if(m=ln.match(balRx)) {
    cmd=balance(m[1]);
  } else {
    console.log("Unknown command");
  }

  if(cmd) {
    cmd.fromId = uniqueId;
    cmd.cmdSequenceNo = cmdSequenceNo++;
    bcast(cmd);
  }
});

process.stdin.resume();

process.stdin.on('data', function(chunk) {
  lh.append(chunk);
});

process.stdin.on('end', function() {
  process.exit(0);
})
