function checkForUser() {
  // If there is no cookie with user ID, create one. Otherwise refresh the token as it may have expired
  getUser().then(user => {
    if (!user) {
      createNewUser();
    } else {
      refreshToken(user);
    }
  });
}

function getUser() {
  return get('/get-user', {});
}

function getHost() {
  return get('/get-host', {});
}

async function createNewUser() {
  // If this is using localhost don't create a new user ID
  let host = await getHost();
  let user;
  if (host.includes('localhost')) {
    user = 'local001'
  } else {
    // Make unique identifier and add to database and local cookie
    const lastNewUser = await getLastUser();
    // Add one to number of most recent user, could do this more robustly?
    const userId = parseInt(lastNewUser.user.split('SQ')[1]) + 1;
    user = 'SQ' + userId.toString().padStart(6, '0');
  }

  // Add new user to database after cookie set, add some error handling
  await setJwtCookie(user);
  postNewUser(user);

  setUserCookie(user);
  setScoreCookie({
    user: user,
    played: 0,
    average: 0,
    high: 0
  });
}

function getLastUser() {
  return get('/get-user/last', {})
}

function countUsers() {
  return get('/get-user/count', {});
}

function setJwtCookie(user) {
  return get('/set-jwt-cookie', { user: user });
}

function setUserCookie(user) {
  return get('/set-persistent-cookie', { name: 'user-id', value: user })
}

function setScoreCookie(scoreData) {
  return get('/set-persistent-cookie', { name: 'heroes-stats', value: scoreData })
}

async function postNewUser(user) {
  const ipAddress = await getIpAdress()
  post('/post-new-user', {
    user: user,
    ipAddress: ipAddress.ip,
    timeCreated: Date.now()
  });
}

function refreshToken(user) {
  setJwtCookie(user)
}

function getStats() {
  return get('/get-heroes-stats');
}

function getHighScores() {
  return get('/get-heroes-high-scores');
}

function postScore(user, score) {
  return post('/post-heroes-score', {
    user: user,
    score: score,
    recordedTime: Date.now()
  });
}

function updateScore(name, id) {
  return post('/update-heroes-score', {
    id: id,
    alias: name
  });
}

function getIpAdress() {
  return $.getJSON("https://api.ipify.org?format=json");
}

function get(url, data) {
  return new Promise(function (resolve, reject) {
    $.ajax({
      type: 'GET',
      url: url,
      data: data,
      success: function (response) {
        resolve(response);
      },
      error: function (error) {
        reject(error);
      }
    })
  });
}

function post(url, data) {
  return new Promise(function (resolve, reject) {
    $.ajax({
      type: 'POST',
      url: url,
      contentType: 'application/json; charset=utf-8',
      data: JSON.stringify(data),
      success: function (response) {
        resolve(response);
      },
      error: function (error) {
        reject(error);
      }
    })
  });
}

function displayHighScores() {
  get('/get-heroes-high-scores', {}).then(function (data) {
    for (var i = 0; i < data.length; i++) {
      let name = (data[i].alias == '') ? '???' : data[i].alias;
      let cellStart = '<td style="word-wrap: break-word">'
      let cellEnd = '</td>'
      var row = $('<tr>' + cellStart + ordinalSuffix(i + 1) + cellEnd + cellStart + name + cellEnd + cellStart + data[i].score + cellEnd + '</tr>');
      $('#scoreBoard').append(row);
    }
  })

  const offsetHeight = document.getElementById('phaser-app').offsetHeight;
  //Do pop up notification to show this value
  alert(offsetHeight);

  document.getElementById('highScores').setAttribute("style", `height: ${offsetHeight - 180}px;`)

  // $.ajax({
  //   type: 'GET',
  //   url: '/get-heroes-high-scores',
  //   dataType: 'JSON',
  //   success: function (data) {
  //     for (var i = 0; i < data.length; i++) {
  //       let name = (data[i].alias == '') ? '???' : data[i].alias;
  //       let cellStart = '<td style="background-color:rgb(0, 0, 0); word-wrap: break-word">'
  //       let cellEnd = '</td>'
  //       var row = $('<tr>' + cellStart + ordinalSuffix(i + 1) + cellEnd + cellStart + name + cellEnd + cellStart + data[i].score + cellEnd + '</tr>');
  //       $('#scoreBoard').append(row);
  //     }
  //   },
  //   // error: function(jqXHR, textStatus, errorThrown){
  //   //     alert('Error: ' + textStatus + ' - ' + errorThrown);
  //   // }
  // });
}

function ordinalSuffix(i) {
  let j = i % 10, k = i % 100;
  if (j == 1 && k != 11) {
    return i + 'st';
  }
  if (j == 2 && k != 12) {
    return i + 'nd';
  }
  if (j == 3 && k != 13) {
    return i + 'rd';
  }
  return i + 'th';
}