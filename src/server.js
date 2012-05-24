/*
 * Authors: Stephen Michael Jothen
 *          Yohannes Kifle Russom
 *
 * This module represents the Perfect Link module which takes care of keeping
 * track of all the other nodes and sending messages over TCP.
 * 
 * This module spawns another child process for the EPFD (Eventually Perfect
 * Failure Detector) module. We communicate with that module by sending messages
 * to it which are handled in the file for the EPFD.
 */
var net   = require('net'),
    dgram = require('dgram'),
    cp    = require('child_process'),
    line  = require('./line');

var host = process.argv[2];
var port = process.argv[3];
var id = host + "/" + port;

// Table of sockets connecting us to the other nodes
var sockets = {};

console.log('Spawning EPFD process');

function sendMsg(msg, to) {
  if(sockets[to]) {
    try {
      var jmsg = JSON.stringify(msg) + '\n';
      sockets[to].write(jmsg);
    } catch(err) {
      // The process must have crashed on the other end, closing the socket, so
      // remove it from the sockets table.
      delete sockets[msg.to];
    }
  }
}

function bcastMsg(msg) {
  for(var name in sockets) {
    sendMsg(msg, name);
  }
}

/*
 * This code spawns a new child process which handles failure detection.
 * We can then send messages back and forth between the EPFD process and
 * the server process.
 */
var epfd = cp.fork(__dirname + '/epfd.js');
epfd.on('message', function(msg) {
  // We receive a heartbeat request or reply from the EPFD so send it out over
  // the socket to the requested node.
  if((msg.type == 'HEARTBEAT_REQUEST' || msg.type == 'HEARTBEAT_REPLY')) {
    sendMsg(msg, msg.to);
  // BROADCAST and SEND sent from Paxos module
  } else if(msg.type == 'BROADCAST') {
    bcastMsg(msg.msg);
  } else if(msg.type == 'SEND') {
    sendMsg(msg.msg, msg.to);
  // RESPONSE sent from Application module
  } else if(msg.type == 'RESPONSE') {
    // Send response out to client
    var msg = JSON.stringify(msg);
    mcast.send(new Buffer(msg), 0, msg.length,
      multicastPort, multicastAddress, function() {
    });
  }
});
// Give upper layers our own process name
epfd.send({ type: 'ID', name: id });
// Give upper layers number of acceptors
epfd.send({ type: 'CLUSTER_SIZE', size: parseInt(process.argv[4])})

/* 
 * The following code handles the multicasting and node recovery using
 * UDP sockets.
 *
 * Every client starts up and sends a UDP packet to the multicast group
 * telling all other members to connect to it, and sending along our
 * address and port.
 */
var mcast = dgram.createSocket('udp4');
var multicastAddress = '239.1.2.3';
var multicastPort = 5554;

mcast.bind(multicastPort);
mcast.addMembership(multicastAddress);

// Receive a message to the multicast group
mcast.on("message", function(data, rinfo) {
  try{
    var msg = JSON.parse(data.toString());
    // If we receive connect message not from ourselves and we aren't
    // already connected to that process, then we connect to it.
    if(msg.type == 'CONNECT' && msg.to != id && !sockets[msg.to]) {
      var addr = msg.to.split("/");
      var s = net.connect(addr[1], addr[0]);
      sockets[msg.to] = s;
      epfd.send(msg);
    }
  } catch(err) {
  }
});

// Send a message telling other nodes to connect to us every 2 seconds
setInterval(function() {
  var msg = JSON.stringify({ type: 'CONNECT', to: id });
  mcast.send(new Buffer(msg), 0, msg.length,
    multicastPort, multicastAddress, function() {
  });
}, 2000);

/*
 * Converts a message received over a socket into a JSON object, which is
 * forwarded to the Eventually Perfect Failure Detector module running in
 * a separate process.
 */
function clientMessageHandler(msg) {
  var o = JSON.parse(msg);
  epfd.send(o);
}

/*
 * Create a server for accepting TCP connections from the other nodes.
 *
 * We pass in an anonymous function which takes the connected client socket
 * and attaches to the data event to handle incoming lines of text.
 *
 * We use a constructed LineHandler class since the 'data' event can occur
 * before a full line of text has been received. This class splits it up into
 * lines and when a full line is received it passes it to clientMessageHandler.
 */
var server = net.createServer(function(c) {
  var lh = new line.LineHandler(clientMessageHandler);
  var addr = { remote: c.remoteAddress, port: c.remotePort };

  c.on('connect', function() {
    //console.log(addr.remote + '/' + addr.port + ' connected');
  });

  c.on('data', function(data) {
    lh.append(data.toString());
  });

  c.on('end', function() {
    //console.log(addr.remote + '/' + addr.port + ' disconnected');
  });
});

/*
 * Start listening on port passed in as argument
 */
server.listen(port);
