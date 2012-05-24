/*
 * Authors: Stephen Michael Jothen
 *          Yohannes Kifle Russom
 *
 */

var pp = require('./paxos-print');

var balance = [];

function getBalance(account) {
  // Get the balance for that account number or
  // set it to zero.
  balance[account] = balance[account] || 0;
  return balance[account];
}

function printAccount(cmd, account) {
  console.log(cmd + " => " + balance[account]);
}

function printInsufficient(cmd) {
  console.log(cmd + " => " + "INSUFFICIENT_FUNDS");
}

function sendResponse(cmd, response) {
  process.send({
    type: 'RESPONSE',
    command: cmd,
    response: response
  });
}

function handleWithdraw(cmd) {
  var b = getBalance(cmd.accountNum);
  var s = pp.cmdToString(cmd);

  if(cmd.amount <= b) {
    balance[cmd.accountNum] = b - cmd.amount;
    printAccount(s, cmd.accountNum);
    sendResponse(cmd, balance[cmd.accountNum]);
  } else {
    printInsufficient(s);
    sendResponse(cmd, 'INSUFFICIENT_FUNDS');
  }
}

function handleDeposit(cmd) {
  var b = getBalance(cmd.accountNum);
  var s = pp.cmdToString(cmd);

  balance[cmd.accountNum] = b + cmd.amount;
  printAccount(s, cmd.accountNum);
  sendResponse(cmd, balance[cmd.accountNum]);
}

function handleTransfer(cmd) {
  var fromBal = getBalance(cmd.fromAccount);
  var toBal = getBalance(cmd.toAccount);
  var s = pp.cmdToString(cmd);

  if(cmd.amount <= fromBal) {
    balance[cmd.fromAccount] = fromBal - cmd.amount;
    balance[cmd.toAccount] = toBal + cmd.amount;
    printAccount(s, cmd.toAccount);
    sendResponse(cmd, balance[cmd.toAccount]);
  } else {
    printInsufficient(s);
    sendResponse(cmd, 'INSUFFICIENT_FUNDS');
  }
}

function handleBalance(cmd) {
  var b = getBalance(cmd.accountNum);
  var s = pp.cmdToString(cmd);
  printAccount(s, cmd.accountNum);
  sendResponse(cmd, balance[cmd.accountNum]);
}

function runCommand(cmd) {
  if(cmd.name == 'WITHDRAW') {
    handleWithdraw(cmd);
  } else if(cmd.name == 'DEPOSIT') {
    handleDeposit(cmd);
  } else if(cmd.name == 'TRANSFER') {
    handleTransfer(cmd);
  } else if(cmd.name == 'BALANCE') {
    handleBalance(cmd);
  } else {
    console.log("Unknown bank command " + cmd.name);
  }
}

process.on('message', function(msg) {
  if(msg.type == 'RUN') {
    runCommand(msg.command);
  }
});
