var scoreData = {
  teams: [],
  bShowScoreboard : false
}


var scoreboardBinder = {};


engine.hideOverlay();

engine.on("UpdateScoreboardList", function (players) {
    //console.log("Pre-Converted Data: " + JSON.stringify(players));
    RefreshScoreboardWithData(players);
});


engine.on("UpdateScoreboard", function(players){
  console.log("Pre-Converted Data: " + JSON.stringify(players));
  var ConvertedData = ConvertScoreboardDataForBinding(players);
  console.log("Post-Converted Data: " + JSON.stringify(ConvertedData));
  ConvertedData = SortTeams(ConvertedData);
  RefreshScoreboardWithData(ConvertedData);
});

function ConvertScoreboardDataForBinding(players)
{
    var data = [];
    for(var i = 0; i < players.length; ++i){
      var player = players[i];
      if(data[player.team] == undefined){
        data[player.team] = [];
      }
      if(player.bIsAlive == 0){
        player.bIsAlive = false;
      } else {
        player.bIsAlive = true;
      }
      data[player.team].push(player);
    }
    return data;
}

$( document ).ready(function() {
  rivets.formatters.teamBg = function(value){
    if(value % 2 > 0){
      return "cell-dark team-body";
    } else {
      return "cell-light team-body";
    }
  }
  scoreboardElem = document.getElementById("scoreboard");
  scoreboardBinder = rivets.bind($('#scoreboard'), {
      scoreData: scoreData
  });
  scoreboardBinder.rebind = function(){
    scoreboardBinder.unbind($('#scoreboard'));
    scoreboardBinder.bind($('#scoreboard'), {
      scoreData: scoreData
    });
  }

    setTimeout(function(){
      engine.call("UpdateScoreboard");
    }, 2000);
});

function RefreshScoreboardWithData(Data)
{
  //if(scoreData.teams.length > 0)
  //{
    //if(scoreData.teams.length > 1){
    //  scoreData.teams = SortTeams(scoreData.teams);
    //}
    /*console.log("NumTeams: " + scoreData.teams.length);
    for(var i = 0; i < scoreData.teams.length; ++i){
      if(scoreData.teams[i] == undefined){
        continue;
      } else {
          scoreData.teams[i] = SortTeam(scoreData.teams[i]);
          console.log("Sorting team: " + i);
      }
    }*/
  //}
  scoreData.teams = Data;
  scoreData.bShowScoreboard = true;
  scoreboardBinder.rebind;
}

function SortTeam(team){
  if(team == undefined){
    return;
  }

  team = team.sort(function(a,b){
    return b.kills - a.kills;
  }).sort(function(a,b){
    return (Number(b.bIsAlive) - Number(a.bIsAlive));
  });
  return team;
}

function SortTeams(teams){
  /*
  1. Sort by Teams that are at all alive vs. teams that are dead
  2. For teams that are at all alive, sort by most team kills
  3. For teams that are dead, sort by longest survivor  
  */
  teams = teams.sort(function(a,b){
    var isAliveA = false;
    var isAliveB = false;
    var highestDeathOrderA = -1;
    var highestDeathOrderB = -1;
	var teamKillsA = 0;
	var teamKillsB = 0;
	
    for(var i = 0; i < a.length; ++i){
	  var player = a[i];
	  if(player.bIsAlive){
	    isAliveA = true;
  	  }
	  else{
  	    if(player.deathOrder > highestDeathOrderA){
  	      highestDeathOrderA = player.deathOrder;
	    }
	  }
	  teamKillsA += player.kills;
    }

    for(var i = 0; i < b.length; ++i){
	  var player = b[i];
	  if(player.bIsAlive){
	    isAliveB = true;
	  }
	  else{
	    if(player.deathOrder > highestDeathOrderB){
	      highestDeathOrderB = player.deathOrder;
	    }
	  }
	  teamKillsB += player.kills;
    }
	
	if (isAliveA){
	  if (isAliveB){
	    // Both alive, sort by most team kills
	    return (teamKillsB - teamKillsA);
	  }
	  else{
	    return -1;
	  }
	}
	else {
	  if (!isAliveB){
	    return (highestDeathOrderB - highestDeathOrderA);
	  }
	  else{
	    return 1;
	  }
	}
	return 0;
  });
  for(var i = 0; i < teams.length; ++i){
    teams[i] = SortTeam(teams[i]);
  }

  return teams;
}

engine.on("HideScoreboard", function(shouldHide){
  //HideLogoParade TODO
  HideScoreboard(shouldHide);
});

engine.on("ShowLogoParade", function(){
  console.log("TODO");
  HideScoreboard(false);
});

var bodyElem = document.getElementById("body");

function HideScoreboard(shouldHide){
  if(shouldHide == true){
    scoreboardElem.classList.add("hidden");
    bodyElem.classList.add("hidden");
  } else {
    scoreboardElem.classList.remove("hidden");
    bodyElem.classList.remove("hidden");
  }
}
