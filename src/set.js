/*
 * Authors: Stephen Michael Jothen
 *          Yohannes Kifle Russom
 *
 * Simple set API for use in some of the algorithms.
 */

/* Set intersection */
function intersection(a, b) {
  var ret = [];
  var hash = {};
  for(var i = 0; i < a.length; i++) {
    hash[a[i]] = 1;
  }
  for(var i = 0; i < b.length; i++) {
    if(hash[b[i]] == 1) {
      ret.push(b[i]);
    }
  }
  return ret;
}

/* Set union */
function union(a, b) {
  var ret = [];
  for(var i = 0; i < a.length; i++) {
    ret.push(a[i]);
  }
  for(var i = 0; i < b.length; i++) {
    if(ret.indexOf(b[i]) == -1) {
      ret.push(b[i]);
    }
  }
  return ret;
}

/* Set difference */
function difference(a, b) {
  var ret = [];
  for(var i = 0; i < a.length; i++) {
    var idx = b.indexOf(a[i]);
    if(idx == -1) {
      ret.push(a[i]);
    }
  }
  return ret;
}

/* Set membership */
function member(set, element) {
  return set.indexOf(element) != -1;
}

/* Export the functions */
exports.intersection = intersection;
exports.union = union;
exports.difference = difference;
exports.member = member;
