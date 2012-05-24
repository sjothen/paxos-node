/*
 * Authors: Stephen Michael Jothen
 *          Yohannes Kifle Russom
 *
 * Since we get data asynchronously over the network we need to combine
 * the data packets we receive into lines so that we can safely transmit
 * JSON over the network sockets between nodes.
 *
 * To accomplish this we use a LineHandler class which calls the given
 * callback function for each line when it is received.
 */
function LineHandler(handler) {
  this.line = "";
  this.handler = handler;
}

LineHandler.prototype.append = function(data) {
  this.line += data;
  while(this.line.indexOf('\n') >= 0) {
    var line = this.line.substring(0, this.line.indexOf('\n'));
    this.line = this.line.substring(this.line.indexOf('\n')+1);
    this.handler(line);
  }
};

exports.LineHandler = LineHandler;
