const LeaderboardSoloSelector = document.getElementById("leaderboard-solo-container");
const LeaderboardSoloNavSelector = document.getElementById("leaderboard-solo-menu-options");

//Add your CSS files here
$('head').append('<link rel="stylesheet" type="text/css" href="css/Screens/Leaderboard.css">');

function LeaderboardSolo()
{
  BaseMenuScreen.call(this);
  this.Selector = LeaderboardSoloSelector;
  this.ActiveMenu = document.getElementById("wins-solo-league-container");
  this.ScreenActions = [{value:"XBoxProfile"}, {value:"Back"}];
  this.optionsDirty = false;
  this.TabNavigation = document.getElementById("leaderboard-solo-tab-options").getElementsByClassName('controls-nav-tab');
  this.ScreenName = "LeaderboardSolo";
  this.SelectedElement;
  this.ImgPath;
}

LeaderboardSolo.prototype = Object.create(BaseMenuScreen.prototype);
LeaderboardSolo.prototype.constructor = LeaderboardSolo;

var leaderboardSoloBinder = rivets.bind($(LeaderboardSoloSelector), {
  leaderBoard : ClientwebData.LeaderboardData,
  FooterData: FooterData,
  playerID: ClientwebRootData.stats,
  PlayerProfileData : PlayerProfileData
});

LeaderboardSolo.prototype.OnShow = function(){
  // console.log(JSON.stringify(ClientwebData.LeaderboardData.solo));
  // console.log(JSON.stringify(ClientwebData.LeaderboardData.solo.topWins));
  // console.log(JSON.stringify(ClientwebData.LeaderboardData.solo.topKills));
  if(ClientwebData.LeaderboardData.solo != null && ClientwebData.LeaderboardData.coop != null){
    leaderboardSoloBinder.update({leaderBoard : ClientwebData.LeaderboardData});
  }
/*
  rivets.bind($(LeaderboardNavSelector), {
    leaderBoard : ClientwebData.LeaderboardData
  });*/
  engine.call("SetStatsCamera");

  if(this.TabNavigation){
    if(ClientwebData.LeaderboardData.solo != null){
      // ******this.SetTabFocus(this.TabNavigation[ClientwebData.LeaderboardData.solo.currentSeasonTier.type].id);
      // ******this.SetNewActiveMenu(document.getElementById(this.TabNavigation[ClientwebData.LeaderboardData.solo.currentSeasonTier.type].id+"-container"));
      var currentTier = "tier" + ClientwebData.LeaderboardData.solo.currentSeasonTier.type + "TopTen";
      if(ClientwebData.LeaderboardData.solo[currentTier] != null){
        ClientwebData.LeaderboardData.solo[currentTier].forEach(function (player) {
          console.log(PlayerProfileData.UserID);
          console.log(player.playerID);
          if(player && (player.playerID == PlayerProfileData.UserID)){
            var elem = document.getElementById("tier" + ClientwebData.LeaderboardData.solo.currentSeasonTier.type + "SoloPlayer");
            // elem.classList.add("hidden");
            // elem.tabIndex = "-1";
          }
        });
      }
    }

    this.SetTabFocus(this.TabNavigation[0].id);
    this.SetNewActiveMenu(document.getElementById(this.TabNavigation[0].id+"-container"));
    document.getElementById("header-solo-tier").textContent = "";
    document.getElementById("header-solo-score").textContent = "WINS";

  }

  BaseMenuScreen.prototype.OnShow.call(this);
}

LeaderboardSolo.prototype.OnCreation = function()
{
  BaseMenuScreen.prototype.OnCreation.call(this);
  this.optionsDirty = false;
}


LeaderboardSolo.prototype.OnHide = function()
{
  BaseMenuScreen.prototype.OnHide.call(this);
}

LeaderboardSolo.prototype.OnClosed = function()
{
  this.ResetTabFocus();
  BaseMenuScreen.prototype.OnClosed.call(this);
}

LeaderboardSolo.prototype.GetTopTenUserData = function(elem){
  var firstChildID = elem.parentElement.firstElementChild.id;
  var category = elem.dataset.tierCategory;
  var player;
  console.log(category);
  console.log(elem.dataset.playerId);

  var liElement = document.querySelectorAll(".top10-list-item-transform");
  var liDivElement = document.querySelectorAll(".list-item-transform");

  if(liElement.length > 0){
    for(var i = 0; i < liElement.length; i++){
      liElement[i].classList.remove("top10-list-item-transform");
    }
  }
  if(liDivElement.length > 0){
    for(var i = 0; i < liDivElement.length; i++){
      liDivElement[i].classList.remove("list-item-transform");
    }
  }

  elem.classList.add("list-item-transform");
  elem.getElementsByClassName("leaderboard-top10")[0].classList.add("top10-list-item-transform");

  if(category == "bronze"){
    ClientwebData.LeaderboardData.solo.tier4TopTen.forEach(function (pl) {
      if(elem.dataset.playerId && pl.playerID == elem.dataset.playerId){
        player = pl.playerID;
      }
    });
  }else if(category == "silver"){
    ClientwebData.LeaderboardData.solo.tier3TopTen.forEach(function (pl) {
      if(elem.dataset.playerId && pl.playerID == elem.dataset.playerId){
        player = pl.playerID;
      }
    });
  }else if(category == "gold"){
    ClientwebData.LeaderboardData.solo.tier2TopTen.forEach(function (pl) {
      if(elem.dataset.playerId && pl.playerID == elem.dataset.playerId){
        player = pl.playerID;
      }
    });
  }else if(category == "platinum"){
    ClientwebData.LeaderboardData.solo.tier1TopTen.forEach(function (pl) {
      if(elem.dataset.playerId && pl.playerID == elem.dataset.playerId){
        player = pl.playerID;
      }
    });
  }else if(category == "diamond"){
    ClientwebData.LeaderboardData.solo.tier0TopTen.forEach(function (pl) {
      if(elem.dataset.playerId && pl.playerID == elem.dataset.playerId){
        player = pl.playerID;
      }
    });
  }
  // player != ClientwebRootData.stats.userID
  if(!ClientwebData.SeasonSummaryCache.hasOwnProperty(player)){
    SendPlayerSeasonSummaryRequest(player);
  }

}

LeaderboardSolo.prototype.DisplayPlayersTopTen = function(userID){
  console.log(userID);
  console.log(JSON.stringify(ClientwebData.SeasonSummaryCache[userID]));
   while (ClientwebData.SeasonSummaryCache[userID].solo.topTenMatches.length < 10){
     var match = {};
     match.placed = 0;
     match.matchScore = 0;
     match.kills = 0;
     ClientwebData.SeasonSummaryCache[userID].solo.topTenMatches.push(match);
  }

  var ulElementlist = document.querySelectorAll('[data-player-id]');
  var playerEle;
  for(var i = 0; i < ulElementlist.length; ++i){
    if(ulElementlist[i].dataset.playerId == userID){
      playerEle = ulElementlist[i];
    }
  }
  var ulElement = playerEle.getElementsByClassName("top-matches-list")[0];
  var divBadge = playerEle.getElementsByClassName("season-badge")[0];
  var imgPath;

  ClientwebData.SeasonSummaryCache[userID].solo.topTenMatches.forEach(function (match) {
    var listItem = document.createElement("li");
    listItem.classList.add("top10-list-item-no-border");

    var listItemImg = document.createElement("img");
    if(match.placed == 0){
      listItemImg.src = "/images/leaderboards/No_Rank.png"
    }else{
      listItemImg.src = "/images/leaderboards/Rank_" + match.placed + ".png"
    }

    var spanScore = document.createElement("span");
    spanScore.classList.add("top-match-score");
    spanScore.innerHTML = match.matchScore;

    var spanKills = document.createElement("span");
    spanKills.classList.add("top-match-kills");
    if(match.kills > 0){
      spanKills.classList.add("death-icon");
    }
    spanKills.innerHTML = match.kills;
    listItem.appendChild(listItemImg);
    listItem.appendChild(spanScore);
    listItem.appendChild(spanKills);
    ulElement.appendChild(listItem);
  });

  if(ClientwebData.SeasonSummaryCache[userID].solo.currentSeasonTier.type == 4){
    imgPath = "/images/leaderboards/Bronze_alt.png";
  }else if(ClientwebData.SeasonSummaryCache[userID].solo.currentSeasonTier.type == 3){
    imgPath = "/images/leaderboards/Silver_alt.png";
  }else if(ClientwebData.SeasonSummaryCache[userID].solo.currentSeasonTier.type == 2){
    imgPath = "/images/leaderboards/Gold_alt.png";
  }else if(ClientwebData.SeasonSummaryCache[userID].solo.currentSeasonTier.type == 1){
    imgPath = "/images/leaderboards/Platinum_alt.png";
  }else if(ClientwebData.SeasonSummaryCache[userID].solo.currentSeasonTier.type == 0){
    imgPath = "/images/leaderboards/Diamond_alt.png";
  }else{
    imgPath = "/images/leaderboards/Bronze_alt.png";
  }
  var imgBadge = document.createElement("img");
  imgBadge.src = imgPath;
  divBadge.appendChild(imgBadge);
}

LeaderboardSolo.prototype.MouseTabClick = function(elem)
{
  document.getElementById("header-solo-tier").textContent = elem.dataset.tier;
  document.getElementById("header-solo-score").textContent = elem.dataset.score;
  BaseMenuScreen.prototype.MouseTabClick.call(this, elem);
}

LeaderboardSolo.prototype.IncrementSettings = function(direction, setting)
{
  console.log("IncrementSettings: " + setting + " " + direction);

}

LeaderboardSolo.prototype.OnMouseClicked = function(elem)
{
  if(elem.dataset && elem.dataset.picker)
  {
    console.log("Elem Clicked: " + elem.nodeName);
    if(this.HasMenuItemElem(elem))
    {
      var parent = this.GetAbsoluteMenuItemElem(elem);
      if(parent.dataset && parent.dataset.pickerConfigVar)
      {
        var direction = elem.dataset.picker;
        var configVar = parent.dataset.pickerConfigVar;
        var numDir = direction == "right" ? 1 : -1;
        console.log("Picker clicked " + direction + " to change " + configVar + " (" + numDir + ")");
        this.IncrementSettings(numDir, configVar);
      }
      else
      {
        console.warn("Picker element parent (" + parent.nodeName + ") missing dataset vars " + JSON.stringify(parent.dataset));
      }
    }
    else
    {
      console.warn("Clicked a picker element that isn't apart of current Screen");
    }
  }

  BaseMenuScreen.prototype.OnMouseClicked.call(this, elem);
}

LeaderboardSolo.prototype.IncrementOnElement = function(elem, direction)
{
    if(this.HasMenuItemElem(elem) && elem.dataset != undefined && elem.dataset.pickerConfigVar != undefined)
    {
        var pickerConfigVar = elem.dataset.pickerConfigVar;
        this.IncrementSettings(direction, pickerConfigVar);
    }
}

LeaderboardSolo.prototype.CanPopScreen = function()
{
  if(this.optionsDirty)
  {
    var modalArgs = {
      options: ["OK", "Cancel"],
      title:"Apply Modified Settings?",
      bSupportsBackButton: false,
      callback: function(option){
        if(option == "OK")
        {
            engine.call("ApplySettings");

        }
        else
        {
          engine.call("RevertSettings");
        }
        PopScreen();
      }
    };

    PushModal('Modal', modalArgs);
    return false;
  }

  return true;
}

LeaderboardSolo.prototype.OnButtonPressed = function(button){
  if(button == btn_Up)
  {
    this.IncrementSelection(-1);
  }
  else if(button == btn_Down)
  {
    this.IncrementSelection(1);
  }
  /*else if(button == btn_Right)
  {
    this.IncrementSelection(1);
  }
  else if(button == btn_Left)
  {
    this.IncrementSelection(-1);
  }*/
  else if(button == btn_Select)
  {
    var focusedItem = this.GetFocusedItem();
    if(focusedItem != undefined)
    {
      if(focusedItem.dataset.tierCategory == "diamond")
      {
        this.GetTopTenUserData(focusedItem);
      }
    }
  }
  else if(button == btn_Back && this.CanPopScreen())
  {
    if(!IsRootScreen())
    {
      PopScreen();
    }
  }
  else if(button == btn_LT)
  {
    console.log("LT");
    this.IncrementTabNav(-1);
    var currActiveTab = document.getElementsByClassName("tab-focus");
    console.log(currActiveTab[0].id);
    if(currActiveTab[0].id == "wins-solo-league" || currActiveTab[0].id == "kills-solo-league")
    {
      this.ScreenActions = [{value:"XBoxProfile"}, {value:"Back"}];
      SetScreenActions(this.ScreenActions);
    }
    else
    {
      this.ScreenActions = [{value:"XBoxProfile"}, {value:"PlayerProfile"}, {value:"Back"}];
      SetScreenActions(this.ScreenActions);
    }

  }
  else if(button == btn_RT)
  {
    console.log("RT");
    this.IncrementTabNav(1);
    var currActiveTab = document.getElementsByClassName("tab-focus");
    console.log(currActiveTab[0].id);
    if(currActiveTab[0].id == "wins-solo-league" || currActiveTab[0].id == "kills-solo-league")
    {
      this.ScreenActions = [{value:"XBoxProfile"}, {value:"Back"}];
      SetScreenActions(this.ScreenActions);
    }
    else
    {
      this.ScreenActions = [{value:"XBoxProfile"}, {value:"PlayerProfile"}, {value:"Back"}];
      SetScreenActions(this.ScreenActions);
    }
  }
  else if(button == btn_Y)
  {
    var focusedItem = this.GetFocusedItem();
    if(ClientwebData.bIsConsole && focusedItem != undefined)
    {
      GetXBoxProfile(focusedItem);
    }
  }
  else if(button == btn_Pause)
  {
    console.log("btn_Pause");
    OpenCurrencyPurchaseWidget();
  }
  //BaseMenuScreen.prototype.OnButtonPressed.call(this, button);
}

//$.extend(Leaderboard.prototype, VerticalMenuMixin);
//$.extend(CustomScreen.prototype, HorizontalMenuMixin);
Screens['LeaderboardSolo'] = LeaderboardSolo;
