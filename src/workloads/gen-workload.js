// Randomly generate a bunch of commands to send to
// the bank application

// Number of commands to generate
var N = 100;

for(var i = 0; i < N; i++) {
  // Command
  var cmd = {
    0: "withdraw",
    1: "deposit",
    2: "balance",
    3: "transfer"
  }[Math.floor(Math.random() * 4)];
  // Arguments
  var a = (Math.random() * 25).toFixed(0);
  var b = (Math.random() * 25).toFixed(0);
  var c = (Math.random() * 25).toFixed(0);
  if(cmd === "withdraw") {
    console.log(cmd + "(" + a + "," + b + ")");
  } else if(cmd === "deposit") {
    console.log(cmd + "(" + a + "," + b + ")");
  } else if(cmd === "balance") {
    console.log(cmd + "(" + b + ")");
  } else if(cmd === "transfer") {
    console.log(cmd + "(" + a + "," + b + "," + c + ")");
  }
}
