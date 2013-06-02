// Simple push AppServer test.
// It doesn't keep anything persistent, everything goes the way of the dodo
// when the server is shut down. Tough luck.

// Take a guess :P
var serverPort = 8123;

// What we offer:
//   * GET /about that just says hey, mom, it's me
//   * GET /friend/nick returns the friends of nick
//     We will return a nice JSON that has an array of:
//       { 
//         nick: 'each of the friends',
//         endpoint: 'endpoint where we can reach said friend'
//       }
// 
//   * PUT /friend/nick/aFriend will PUT aFriend as friend of nick. It muse have one
//     parameter: 
//        * endpoint = endpoint said friend must use to reach him
function TPushServer(serverPort) {
  'use strict';

  // The in-memory friend list
  var friends = require('./friends.js').Friends();

  function debug() {
    console.log.apply(console,arguments);
  }

  var http = require('http');
  var urlParser = require('url');
  var httpServer = null;

  var PathMatcher = require('./pathMatcher.js').PathMatcher;

  // The order is important, they get evaluated on a top-down basis and the first one that maches wins
  var serverPaths = {
    'GET': {
      '/about': new PathMatcher('^/about(/.*)?$', getAboutPage), 
      '/friend': new PathMatcher('^/friend/', getFriends), 
      '*': new PathMatcher('.*', goAway.bind(undefined, 404))
    },
    'PUT': {
      '/friend': new PathMatcher('^/friend/.+/.+(/.*)?$', putFriend),
      '*': new PathMatcher('.*', goAway.bind(undefined, 403))
    },
    'OPTIONS': {
      '*': new PathMatcher ('.*', doOptions)
    },
    'DELETE': {
      '/friend': new PathMatcher('^/friend/.+/.+(/.*)?$', deleteFriend),
      '*': new PathMatcher('.*', goAway.bind(undefined, 403))
    },
    'DEFAULT': {
      '*': new PathMatcher('.*', goAway.bind(undefined, 404))
    }
  }

  function allowCORS(aReq, aRes) {
    // Always allow CORS!!!
    if (aReq.headers.origin) {
      aRes.setHeader("Access-Control-Allow-Origin","*");
    }

    // Lets be VERY promiscuous... just don't do that on any serious server
    aRes.setHeader("Access-Control-Allow-Methods", "PUT, GET, OPTIONS, DELETE");
    aRes.setHeader("Access-Control-Allow-Origin", "*");

    // If the request has Access-Control-Request-Headers headers, we should answer with an 
    // Access-Control-Allow-Headers...
    var rh = aReq.headers["access-control-request-headers"];
    if (rh) { // We don't really care much about this...
      aRes.setHeader("Access-Control-Allow-Headers", rh);
    }
  }

  function returnData(aRes, aStatusCode, aResult, aContentType) {
    aRes.statusCode = aStatusCode;
    aRes.setHeader("Content-Length", aResult.length);
    aRes.setHeader("Content-Type", aContentType);
    aRes.end(aResult);
  }

  function processRequest(aReq, aRes) {
    var method = aReq.method;
    var pathname = urlParser.parse(aReq.url).pathname;

    debug("Got a %s request!", method);
    debug("Headers: %s", JSON.stringify(aReq.headers));
    debug("Req: %s, %s", pathname, aReq.url);

    var methodPaths = serverPaths[method] || serverPaths['DEFAULT'];
    var fn = undefined;
    for (var path in methodPaths) {
      fn = methodPaths[path].matches(pathname);
      if (fn)
        break;
    }
    if (fn) {
      allowCORS(aReq, aRes);
      fn(aReq, aRes, pathname);
    } else {
      goAway(404, aReq, aRes, pathname);
    }

  }

  function start() {
    debug("Creating server at port %d", serverPort);
    httpServer = http.createServer(processRequest);
    httpServer.listen(serverPort);
  }


  function goAway(aRetCode, aReq, aRes, aPathname) {
    returnData(aRes, aRetCode || 404, "", "text/html");
  }


  function doModification(aPathname, aSuccessCallback, aFailureCallback) {
    var pathComponents = aPathname.split('/');
    var nick = decodeURIComponent(pathComponents[2]);
    var friend = decodeURIComponent(pathComponents[3]);
    debug("Modify Friend Friend. Nick: %s, Friend: %s", nick, friend);
    if (nick && friend) {
      aSuccessCallback(nick, friend);
    } else {
      aFailureCallback();
    }
  }


  //   * PUT /friend/nick/aFriend will PUT aFriend as friend of nick. It must have one
  //     parameter: 
  //        * endpoint = endpoint said friend must use to reach him
  //   * PUT any other thing -> Go away
  function putFriend(aReq, aRes, aPathname) {
    doModification(aPathname, 
      function (aNick, aFriend) {
        aReq.on('readable', function () {
                 aReq.setEncoding('ascii');
                 var endpoint = aReq.read();
                 storeNewFriend(aNick, aFriend, endpoint, aRes);
               });
      }, goAway.bind(undefined, 404, aReq, aRes));
  }

  //   * DELETE /friend/nick/aFriend will DELETE aFriend as friend of nick. It doesn't need parameters
  //   * DELETE any other thing -> Go away
  function deleteFriend(aReq, aRes, aPathname) {
    doModification(aPathname, 
      function (aNick, aFriend) {
        friends.eraseFriend(aNick, aFriend);
        returnData(aRes, 200, "{}", "application/json");
      }, goAway.bind(undefined, 404, aReq, aRes));
  }

  function doOptions(aReq, aRes, aPathname) {
    // Not much to do here really since CORS is already taken care of
    returnData(aRes, 200, "", "text/html");
  }

  // Returns a nice HTML about page
  function getAboutPage(aReq, aRes, aPathname) {
    debug("aboutPage");
    var aboutPage = "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>About TSimplePush</title></head><body><h1>About</h1><p>This a example server for exchanging SimplePush Endpoints.</p><p>If you don't know what that is then maybe you should not be here</p></body></html>";
    returnData(aRes, 200, aboutPage, "text/html");
  }

  function storeNewFriend(aNick, aFriend, aEndpoint, aRes) {
    debug("storeNewFriend: %s, %s, %s", aNick, aFriend, aEndpoint);
    var params = require('querystring').parse(aEndpoint);
    var result = "{}";
    var statusCode = 200;
    if (params.endpoint) {
      friends.updateFriendInfo(aNick, aFriend, params.endpoint);
    } else {
      statusCode = 500;
      result = "{error: 'Invalid parameters'}";
    }
    returnData(aRes, statusCode, result, "application/json");
  }


  // returns the JSON with the friends of whoAmI. To sum up, that's 
  //     We will return a nice JSON that has an array of:
  //       { 
  //         nick: 'each of the friends of myself',
  //         endpoint: 'endpoint where we can reach said friend'
  //       }
  function getFriends(aReq, aRes, aPathname) {
    var whoAmI = decodeURIComponent((aPathname.split('/'))[2]);
    debug("getFriends: %s: %s", aPathname, whoAmI);

    if (whoAmI) {
      returnData(aRes, 200, JSON.stringify(friends.getPeopleIKnow(whoAmI)), "application/json");
    } else {
      goAway(500, aReq, aRes);
    }
  }


  return {
    start: start
  }

};

var server = new TPushServer(serverPort);

server.start();
