// Simple push AppServer test.
// It doesn't keep anything persistent, everything goes the way of the dodo
// when the server is shut down. Tough luck.

'use strict';

// Take a guess :P
var serverPort = 8123;

function PathMatcher(regex, fn) {

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

  function debug() {
    console.log.apply(console,arguments);
  }

  var http = require('http');
  var urlParser = require('url');
  var httpServer = null;

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
    'DEFAULT': {
      '*': new PathMatcher('.*', goAway.bind(undefined, 404))
    }
  }


  function processRequest(req, res) {
    var method = req.method;
    var pathname = urlParser.parse(req.url).pathname;

    debug("Got a %s request!", method);
    debug("Headers: %s", JSON.stringify(req.headers));
    debug("Req: %s, %s", pathname, req.url);


    // Always allow CORS!!!
    if (req.headers.origin) {
      res.setHeader("Access-Control-Allow-Origin","*");
    }

    var methodPaths = serverPaths[method] || serverPaths['DEFAULT'];
    var fn = undefined;
    for (var path in methodPaths) {
      fn = methodPaths[path].matches(pathname);
      if (fn)
        break;
    }
    if (fn) {
      fn(req, res, pathname);
    } else {
      goAway(404, req, res, pathname);
    }

  }

  function start() {
    debug("Creating server at port %d", serverPort);
    httpServer = http.createServer(processRequest);
    httpServer.listen(serverPort);
  }


  function goAway(retCode, req, res, pathname) {
    res.statusCode = retCode || 404; 
    res.end();
    
  }

  //   * PUT /friend/nick/aFriend will PUT aFriend as friend of nick. It must have one
  //     parameter: 
  //        * endpoint = endpoint said friend must use to reach him
  //   * PUT any other thing -> Go away
  function putFriend(req, res, pathname) {
    var pathComponents = pathname.split('/');
    var nick = decodeURIComponent(pathComponents[2]);
    var friend = decodeURIComponent(pathComponents[3]);
    debug("Put Friend. Nick: %s, Friend: %s", nick, friend);
    if (nick && friend) {
      res.statusCode = 200;
      req.on('readable', function () {
        req.setEncoding('ascii');
        var endpoint = req.read();
        storeNewFriend(nick, friend, endpoint, res);
      });
    } else {
      goAway(404,req,res);
    }
    
  }

  function doOptions(req, res, pathname) {
    console.log("OPTIONS, WTF is this?");
    // Let's be promiscuous
    res.setHeader("Content-Length", 0);
    res.setHeader("Access-Control-Allow-Methods", "PUT, GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Origin", "*");

    res.statusCode = 200;
    res.end();
  }


  // This will keep the list of people we know about...
  var people=[];

  function getPeopleIKnow(me) {
    return people[me] || [];
  }

  // Every 'person' will be a...
  function updateFriendInfo(nick, friend, endpoint) {
    if (!people[nick]) {
      people[nick] = [];
    }
    var found = 0;
    for(var i in people[nick]) {
      if (people[nick][i].nick === friend) {
        found = true;
        people[nick][i].endpoint = endpoint;
        break;
      }
    }
    if (!found)
      people[nick].push({nick: friend, endpoint: endpoint});
  }

  function storeNewFriend(nick, friend, endpoint, res) {
    debug("storeNewFriend: %s", nick, friend, endpoint);
    var params = require('querystring').parse(endpoint);
    var result = "{}";
    if (params.endpoint) {
      updateFriendInfo(nick, friend, params.endpoint);
    } else {
      res.statusCode = 500;
      result = "{error: 'Invalid parameters'}";
    }
    res.setHeader("Content-Length",result.length);
    res.setHeader("Content-Type","application/json");
    res.end(result);
  }

  var aboutPage = "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>About TSimplePush</title></head><body><h1>About</h1><p>This a example server for exchanging SimplePush Endpoints.</p><p>If you don't know what that is then maybe you should not be here</p></body></html>";


  // Returns a nice HTML about page
  function getAboutPage(req, res, pathname) {
    debug("aboutPage");
    res.setHeader("Content-Type", "text/html");
    res.setHeader("Content-Length", aboutPage.length);
    res.end(aboutPage);
    
  }

  // returns the JSON with the friends of whoAmI. To sum up, that's 
  //     We will return a nice JSON that has an array of:
  //       { 
  //         nick: 'each of the friends of myself',
  //         endpoint: 'endpoint where we can reach said friend'
  //       }
  function getFriends(req, res, pathname) {
// TO-DO....

    var whoAmI = decodeURIComponent((pathname.split('/'))[2]);
    debug("getFriends: %s: %s", pathname, whoAmI);

    if (whoAmI) {
      var body = JSON.stringify(getPeopleIKnow(whoAmI));
      res.setHeader('Content-Length', body.length);
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 200;
      res.end(body);
    } else {
      goAway(500, req, res);
    }
  }


  return {
    start: start
    
  }

};

var server = new TPushServer(serverPort);

server.start();
