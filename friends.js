function Friends () {
  'use strict';
  
  // This will keep the list of people we know about...
  var people=[];
  
  function getPeopleIKnow(aMe) {
    return people[aMe] || [];
  };

  function findFriend(aNick, aFriend) {
    if (!people[aNick]) {
      people[aNick] = [];
    }
    var found = false;
    for(var i in people[aNick]) {
      if (people[aNick][i].nick === aFriend) {
        found = true;
        break;
      }
    }
    return found ? i : null;
  }

  // Every 'person' will be a...
  function updateFriendInfo(aNick, aFriend, aEndpoint) {
    var friend = findFriend(aNick, aFriend);
    if (friend !== null) {
      people[aNick][friend].endpoint = aEndpoint;
    } else {
      people[aNick].push({nick: aFriend, endpoint: aEndpoint});
    }
  }

  function eraseFriend(aNick, aFriend) {
    var friend = findFriend(aNick, aFriend); 
    (friend !== null) && people[aNick].splice(friend, 1);
  }

  return {
    getPeopleIKnow: getPeopleIKnow,
    updateFriendInfo: updateFriendInfo,
    eraseFriend: eraseFriend
  }

};

module.exports.Friends = Friends;