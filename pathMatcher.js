function PathMatcher(regex, fn) {
  'use strict';

  var regExp = new RegExp(regex);
  var processMethod = fn;
  
  function matches(path) {
    if (regExp.test(path)) {
      return processMethod; 
    } else {
      return undefined;
    }
  }

  return {
    matches: matches
  }
}

module.exports.PathMatcher = PathMatcher;

