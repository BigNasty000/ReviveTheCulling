const EndOfMatchSelector = document.getElementById("EOMContainer");

//Add your CSS files here
$('head').append('<link rel="stylesheet" type="text/css" href="css/Screens/EndOfMatch.css">');


var EOMChallengeData = {
  Challenges : [],
}

// XAV_AFM Disable Challenges
//rivets.bind($("#endofmatch-summary-challenges"), {
//  challengeData:EOMChallengeData,
//});
var ScoreboardPlayerNavigation = document.getElementsByClassName('scoreboard-players');
var levelup = false;
var bEOMSummaryComplete = false;
var showModal = true;
/*var videoEom = document.getElementById("eom-screen-video");
var videoBG = document.getElementById("eom-video");*/

function EndOfMatchScreen()
{
    console.log("EndOfMatchScreen Construct");
  BaseMenuScreen.call(this);
  this.Selector = EndOfMatchSelector;
  this.ActiveMenu = document.getElementById("endofmatch-tab-navigation");
  this.bIsVictory;
  if(document.getElementById("EOMTabNav")){
    this.TabNavigation = document.getElementById("EOMTabNav").getElementsByClassName('controls-nav-tab');
  }

  this.ScreenName = "EndOfMatchScreen";
}

EndOfMatchScreen.prototype = Object.create(BaseMenuScreen.prototype);
EndOfMatchScreen.prototype.constructor = EndOfMatchScreen;

var EOMBinder = rivets.bind($('#EOMContainer'), {
    careerStats: careerStats,
    deathData: deathData,
    matchData: matchData,
    matchStats: matchStats,
    offlineGame: offlineGame,
	  scoreData: scoreData
});

EndOfMatchScreen.RebindEOMScoreboard = function()
{
	EOMBinder.update({scoreData: scoreData});
}

EndOfMatchScreen.prototype.OnCreation = function()
{
  console.log("OnCreation");
  console.log(JSON.stringify(careerStats));
  console.log(JSON.stringify(deathData));
  console.log(JSON.stringify(scoreData));
  console.log(JSON.stringify(scoreData.teams));
  engine.call("RequestGameModeType").then(function (gameModeType) {
			console.log("RequestGameModeType " + gameModeType);
	    matchData.gameModeType = gameModeType;
			if(matchData.gameModeType == "Survival"){
				document.getElementById("airdrop-container").classList.add("hidden");
				document.getElementById("EOMScoreboard").classList.add("hidden");
				document.getElementById("EOM-Spectate-button").classList.add("hidden");
			}
	});
  BaseMenuScreen.prototype.OnCreation.call(this);
  //console.log(JSON.stringify(EOMChallengeData.Challenges));
}

EndOfMatchScreen.prototype.OnShow = function()
{
    engine.call("EnableCoherentInput", true);
    console.log("EOMOnShow");
    /*videoEom.classList.remove("hidden");
    videoBG.play();
    videoBG.loop = true;*/
    if(this.TabNavigation){
      this.SetTabFocus(this.TabNavigation[0].id);
    }

    this.SetNewActiveMenu(this.ActiveMenu);
    console.log("OnShow:: deathData.showXpProgress: " + deathData.showXpProgress);
    if(deathData.showXpProgress){
      EndOfMatchScreen.GetLevelFromXP(deathData.MatchStartXP);
    }
    else {
        deathData.MatchStartXP = 0;
        deathData.highXP = 0;
        deathData.lowXP = 0;

      EndOfMatchScreen.ShowEOMSummary();
    }
    BaseMenuScreen.prototype.OnShow.call(this);
}

EndOfMatchScreen.GetLevelFromXP = function(xp){
  engine.call("GetLevelFromXP", xp).then(function(level){
    console.log(level);
    deathData.playerLevel = level;
    EndOfMatchScreen.GetXPData(level);
  });
}

EndOfMatchScreen.GetXPData = function(level){
  engine.call("GetLevelXPLow", level).then(function(exp){
    console.log(exp);
    deathData.lowXP = exp;
    engine.call("GetLevelXPHigh", level).then(function(exp){
      console.log(exp);
      deathData.highXP = exp;
      EndOfMatchScreen.ShowEOMSummary();
    });
  });
}

EndOfMatchScreen.ShowEOMSummary = function () {
  console.log("ShowEOMSummary");
  EOMOutcomeContainer.classList.add("hidden");
  //EOMNavContainer.classList.remove("hidden");

  /*console.log("ShowEOMSummary::" + deathData.MatchStartXP);
  console.log("ShowEOMSummary::" + deathData.highXP);
  console.log("ShowEOMSummary::" + deathData.lowXP);*/
  if(offlineGame.bIsLocalGame){
    document.getElementById('eom-career-avg-dmg').innerHTML = (careerStats.totalDamage / careerStats.gamesPlayed).toFixed(2);
    document.getElementById('eom-match-dmg').innerHTML = deathData.DamageDone;
    document.getElementById('eom-career-avg-kills').innerHTML = (careerStats.kills / careerStats.gamesPlayed).toFixed(2);
    document.getElementById('eom-match-kills').innerHTML = deathData.NumKills;
    document.getElementById('eom-career-avg-func').innerHTML = (careerStats.funcEarned / careerStats.gamesPlayed).toFixed(2);
    document.getElementById('eom-match-func').innerHTML = deathData.FUNC;
    if(document.getElementById('EOM-Profile-button') != null)
    {
      document.getElementById('EOM-Profile-button').classList.add("hidden");
    }

  }

  if(deathData.MatchEndXP < deathData.MatchStartXP){
    deathData.xpEarned = 0;
  }
  else{
    deathData.xpEarned = deathData.MatchEndXP - deathData.MatchStartXP;
  }
  console.log("deathData.xpEarned: " + deathData.xpEarned);
  if(deathData.showXpProgress)
  {
    var xpProgressBar = (deathData.MatchStartXP - deathData.lowXP) / (deathData.highXP - deathData.lowXP) * 100;
    console.log(xpProgressBar);
    EOMXPPrgressBar.style.width = Math.round(xpProgressBar) + "%";
    setTimeout(function(){
      EndOfMatchScreen.XPProgressBarAnimate(EOMXPPrgressBar, xpProgressBar, deathData.MatchStartXP, deathData.MatchEndXP);
    }, 5000);
  }
}

EndOfMatchScreen.XPProgressBarAnimate = function(element, width, matchStartXP, matchEndXP) {
  console.log("XPAnimate");
  engine.call("GetLevelFromXP", matchStartXP).then(function(level){
		 deathData.playerLevel = level;
     engine.call("GetLevelXPLow", deathData.playerLevel).then(function(exp){
       console.log(exp);
       deathData.lowXP = exp;
       engine.call("GetLevelXPHigh", deathData.playerLevel).then(function(exp){
         console.log(exp);
         deathData.highXP = exp;
         EOMBinder.update({deathData: deathData});
         var percentXP = ((matchEndXP-deathData.lowXP) / (deathData.highXP-deathData.lowXP)) * 100;
         if(percentXP > 100){
           percentXP = 100;
         }

         var id = setInterval(EOMframe, 10);

         function EOMframe() {
           /*console.log(width);
           console.log(percentXP);*/
           if (width >= percentXP) {
             clearInterval(id);
             if (width >= 100) {
                 console.log(element);
                 console.log(deathData.highXP);
                 console.log(matchEndXP);
                 EndOfMatchScreen.XPProgressBarAnimate(element, 0, deathData.highXP+1, matchEndXP);
                 levelup = true;
             }
             else {
                 EndOfMatchScreen.OnEOMSummaryComplete(levelup);
             }
           } else {
             width++;
             element.style.width = width + '%';
           }
         }
       });
     });
	});
}

EndOfMatchScreen.OnEOMSummaryComplete = function(lvlup) {
    console.log("OnEOMSummaryComplete: " + bEOMSummaryComplete);
    //if (!bEOMSummaryComplete) {
    bEOMSummaryComplete = true;
    if(lvlup){
      document.getElementById("level-up").classList.remove("hidden");
    }
}
/*
EndOfMatchScreen.ChallengeProgressBarAnimate = function(element, width) {
  var elem = element;
  var width = width;
  var id = setInterval(challengeframe, 10);

  function challengeframe() {
    if (width >= 100) {
      clearInterval(id);
    } else {
      width++;
      elem.style.width = width + '%';
    }
  }
}*/

EndOfMatchScreen.prototype.OnHide = function()
{
  console.log("EOMHide");
  /*videoEom.classList.add("hidden");
  videoBG.pause();*/
  this.ResetTabFocus();
  BaseMenuScreen.prototype.OnHide.call(this);
}

EndOfMatchScreen.prototype.OnClosed = function()
{
  console.log("EOMClose");
  //EndOfMatchScreen.ClearTabNavClass();
  this.ResetTabFocus();
  BaseMenuScreen.prototype.OnClosed.call(this);
}

EndOfMatchScreen.prototype.MouseTabClick = function(elem)
{
  BaseMenuScreen.prototype.MouseTabClick.call(this, elem);
}

EndOfMatchScreen.GoToSpectateScreen = function () {
    console.log("GoToSpectateScreen " + bSpectateScreen);
    if(matchData.gameModeType != "Survival" && matchData.matchState != "over"){
      engine.call("ShowMatchReport");
      /*if (!bSpectateScreen)
      {
      	  PushScreen('SpectateMatch');
          engine.call("RequestSpectateMode").then(function (bEnterSpectateMode) {
              if (bEnterSpectateMode)
              {
                  PushScreen('SpectateMatch');
                  console.log("SpectateMatchShow");
              }
          });
      }*/
    }
}

EndOfMatchScreen.GoToPauseScreen = function(){
    console.log("EndOfMatchScreen.GoToPauseScreen");
    engine.call("TogglePauseMenu");
}

EndOfMatchScreen.prototype.OnMenuActionClicked = function(MenuAction){
    console.log("EOMMenuActionClicked: " + MenuAction);
    /* NOT USING MENU ACTION BUTTONS */

    /*if (MenuAction == "Spectate") {
        if (bEOMSummaryComplete) {
            OnSpectateClicked();
            PushScreen('SpectateMatch');
        }
    }*/
    //else if (MenuAction == "Back") {
    //    this.OnButtonPressed(btn_Pause);
    //}
    //else if (MenuAction == "LeaveGame") {
    //    EndOfMatchScreen.leaveMatchPopup();
    //}

  //BaseMenuScreen.prototype.OnMenuActionClicked.call(this, MenuAction);
  /*switch (MenuAction) {
    case "Spectate":
      OnSpectateClicked();
      break;
    case "LeaveGame":
      EndOfMatchScreen.leaveMatchPopup();
      break;
    default:
  }*/
}

EndOfMatchScreen.SetActivePlayer = function(num){
   var playerIndex;
   for(var i = 0; i < ScoreboardPlayerNavigation.length; i++){
     if(ScoreboardPlayerNavigation[i].tabIndex === 1){
       playerIndex = i;
       break;
     }
   }
   if(playerIndex == undefined){
     ScoreboardPlayerNavigation[0].tabIndex = 1;
     ScoreboardPlayerNavigation[0].focus();
     console.log(ScoreboardPlayerNavigation[0].innerHTML);
      console.log(ScoreboardPlayerNavigation[0].dataset.isBot);
      if(offlineGame.bIsLocalGame)
      {
        if(document.getElementById('EOM-Profile-button') != null)
        {
          document.getElementById("EOM-Profile-button").classList.add("hidden");
        }
      }
      else {
        if(ScoreboardPlayerNavigation[0].dataset.isBot == "true")
        {
          if(document.getElementById('EOM-Profile-button') != null)
          {
            document.getElementById("EOM-Profile-button").classList.add("hidden");
          }
        }
        else
        {
          if(document.getElementById('EOM-Profile-button') != null)
          {
            document.getElementById("EOM-Profile-button").classList.remove("hidden");
          }
        }
      }
   }else {
     if(playerIndex + num != -1 && playerIndex + num < ScoreboardPlayerNavigation.length){
       ScoreboardPlayerNavigation[playerIndex].tabIndex = 0;
       ScoreboardPlayerNavigation[playerIndex].blur();
       ScoreboardPlayerNavigation[playerIndex + num].tabIndex = 1;
       ScoreboardPlayerNavigation[playerIndex + num].focus();
       console.log(ScoreboardPlayerNavigation[playerIndex + num].innerHTML);
       console.log(ScoreboardPlayerNavigation[playerIndex + num].dataset.isBot);
       if(offlineGame.bIsLocalGame)
       {
         if(document.getElementById('EOM-Profile-button') != null)
         {
           document.getElementById("EOM-Profile-button").classList.add("hidden");
         }
       }
       else{
         if(ScoreboardPlayerNavigation[playerIndex + num].dataset.isBot == "true")
         {
           if(document.getElementById('EOM-Profile-button') != null)
           {
             document.getElementById("EOM-Profile-button").classList.add("hidden");
           }
         }
         else
         {
           if(document.getElementById('EOM-Profile-button') != null)
           {
             document.getElementById("EOM-Profile-button").classList.remove("hidden");
           }
         }
       }

     }
   }
}

function GetXboxProfile(elem)
{
  console.log(elem.dataset.playerId);
  console.log(elem.dataset.isBot);
  if(g_PlateformSettings.bIsXbox)
  {
    if(elem.dataset.isBot == "false")
    {
      console.log("ShowGamerCard " + elem.dataset.isBot);
      engine.call("ShowGamerCard", elem.dataset.playerId);
    }
  }
}
/*
EndOfMatchScreen.ControllerCheck = function(){

  if(FooterData.bHasGamepad){
    Array.prototype.forEach.call(ScoreboardPlayerNavigation, function(player){
      player.children[1].classList.add("no-hover-height");
      player.classList.add("no-hover-border");
    });
  }else{
    Array.prototype.forEach.call(ScoreboardPlayerNavigation, function(player){
      player.children[1].classList.remove("no-hover-height");
      player.classList.remove("no-hover-border");
      player.blur();
      player.tabIndex = 0;
    });
  }
}*/

EndOfMatchScreen.prototype.OnButtonPressed = function(button)
{
  console.log("EOMButtonPressed: " + button);
  if(button == btn_Left)
  {
  }
  else if(button == btn_Right)
  {
  }
  else if(button == btn_Down)
  {
    var currActiveTab = document.getElementsByClassName("tab-focus");
    if(currActiveTab[0].id == "EOMScoreboard")
    {
      EndOfMatchScreen.SetActivePlayer(1);
    }
  }
  else if(button == btn_Up)
  {
    var currActiveTab = document.getElementsByClassName("tab-focus");
    if(currActiveTab[0].id == "EOMScoreboard")
    {
      EndOfMatchScreen.SetActivePlayer(-1);
    }
  }
  else if(button == btn_Select)
  {
    var focusedItem = document.activeElement;
    if(matchData.bIsConsole && focusedItem != undefined)
    {
      if(!offlineGame.bIsLocalGame){
        // console.log("XBOXPROFILE");
        // GetXboxProfile(focusedItem);
        var event = document.createEvent("MouseEvents");
        event.initEvent('click', true, true);
        focusedItem.dispatchEvent(event);
      }
    }
  }
  else if(button == btn_Back && this.CanPopScreen())
  {
    EndOfMatchScreen.GoToPauseScreen();
    if(document.getElementById('EOM-Profile-button') != null)
    {
      document.getElementById("EOM-Profile-button").classList.add("hidden");
    }
  }
  else if(button == btn_LT)
  {
    if(matchData.gameModeType != "Survival"){
      this.IncrementTabNav(-1);
    }
    hideXboxButton();
  }
  else if(button == btn_RT)
  {
    if(matchData.gameModeType != "Survival"){
      this.IncrementTabNav(1);
    }
    hideXboxButton();
  }
  else if(button == btn_Pause)
  {
    console.log("btn_Pause");
    OpenCurrencyPurchaseWidget();
  }
  else if(button == btn_Y)
  {
    if(matchData.matchState != "over"){
      EndOfMatchScreen.GoToSpectateScreen();
      if(document.getElementById('EOM-Profile-button') != null)
      {
        document.getElementById("EOM-Profile-button").classList.add("hidden");
      }
    }
  }
  //BaseMenuScreen.prototype.OnButtonPressed.call(this, button);
}

function hideXboxButton(){
  var currActiveTab = document.getElementsByClassName("tab-focus");
  if(matchData.bIsConsole){
    if(offlineGame.bIsLocalGame)
    {
      if(document.getElementById('EOM-Profile-button') != null)
      {
        document.getElementById("EOM-Profile-button").classList.add("hidden");
      }
    }
    else {
      if(currActiveTab[0].id != "EOMScoreboard"){
        if(document.getElementById('EOM-Profile-button') != null)
        {
          document.getElementById("EOM-Profile-button").classList.add("hidden");
        }
      }else{
        if(ScoreboardPlayerNavigation[0].dataset.isBot == "true")
        {
          if(document.getElementById('EOM-Profile-button') != null)
          {
            document.getElementById("EOM-Profile-button").classList.add("hidden");
          }
        }
        else
        {
          if(document.getElementById('EOM-Profile-button') != null)
          {
            document.getElementById("EOM-Profile-button").classList.remove("hidden");
          }
        }
      }
    }


  }

}
Screens['EndOfMatchScreen'] = EndOfMatchScreen;
