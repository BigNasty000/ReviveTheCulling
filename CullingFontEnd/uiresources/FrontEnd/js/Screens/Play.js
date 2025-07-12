//Add your CSS files here
$('head').append('<link rel="stylesheet" type="text/css" href="css/Screens/Play.css">');

var filters = {
  ffa : true,
  coop : true,
  classic : true,
  lightning : false
};

var hasClickButton = false;

function ValidateMatchmakingFilters()
{
  // Fixes situation in which both filters are false (don't allow this, set both to true instead)
  if (!filters.ffa && !filters.coop) {
    engine.call("ToggleSoloFilter");
    filters.ffa = true;

    engine.call("ToggleCoopFilter");
    filters.coop = true;
  }

  // Fixes situation in which both filters are false (don't allow this, set both to true instead)
  // if (!filters.classic && !filters.lightning) {
  //   engine.call("ToggleClassicFilter");
  //   filters.classic = true;
  //
  //   engine.call("ToggleLightningFilter");
  //   filters.lightning = true;
  // }
}

function LoadMatchmakingFilters()
{
  // Load filter settings. Note: This is deferred.
  return engine.call("GetGameplaySettings").then(function(settingsData){
    console.log("GameplaySettings: " + JSON.stringify(settingsData));

    filters.ffa = settingsData.solo;
    filters.coop = settingsData.coop;
    filters.classic = settingsData.classic;
    filters.lightning = settingsData.lightning;

    ValidateMatchmakingFilters();
  });
}

function SyncMatchmakingFilters()
{
  // Takes the values from "filters" and applies them to "Matchmaking.GoodFilters" and "Matchmaking.BadFilters"
  console.log(JSON.stringify(filters));
  Matchmaking.GoodFilters = [];
  Matchmaking.BadFilters = [];
  for(var key in filters){
    if(filters[key] == true){
      Matchmaking.GoodFilters.push(key);
    }
    else {
      Matchmaking.BadFilters.push(key);
    }
  }
  console.log(Matchmaking.GoodFilters);
  console.log(Matchmaking.BadFilters);
}

var showModal = true;

var leaderboadPlayBinder = rivets.bind($('#play-menu-options'), {
  ClientwebData: ClientwebData,
  leaderBoard : ClientwebData.LeaderboardData,
  Friends : Friends
});

function PlayScreen()
{
  BaseMenuScreen.call(this);
  this.Selector = document.getElementById("play-menu");
  this.ActiveMenu = document.getElementById("play-menu-options");
  this.ScreenActions = [{value:"Select"}, {value:"Back"}];
}

PlayScreen.prototype = Object.create(BaseMenuScreen.prototype);
PlayScreen.prototype.constructor = PlayScreen;

PlayScreen.prototype.OnShow = function()
{
  /*console.log(JSON.stringify(ClientwebData.LeaderboardData.solo.topTenMatches[0]));
  console.log(ClientwebData.LeaderboardData.solo.topTenMatches[0].placed);
  console.log(ClientwebData.LeaderboardData.solo.topTenMatches[0].matchScore);*/

  if(ClientwebData.LeaderboardData.solo != null && ClientwebData.LeaderboardData.coop != null){
    leaderboadPlayBinder.update({leaderBoard : ClientwebData.LeaderboardData});
  }
  BaseMenuScreen.prototype.OnShow.call(this);
  engine.call("SetPlayCamera");
}

PlayScreen.GetSettings = function(){
  engine.call("GetGameplaySettings").then($.proxy(function(result){
    console.log("Got Settings Data: " + JSON.stringify(result));
    this.OnGetSettingsData(result);
  },this));
}

PlayScreen.OnGetSettingsData = function(settingsData)
{
  console.log("Got SettingsData: " + JSON.stringify(settingsData));

  //Set these one by one, so we don't overwrite the rivets binding code
  filters.ffa = settingsData.solo;
  filters.coop = settingsData.coop;
  filters.classic = settingsData.classic;
  filters.lightning = settingsData.lightning;
  SyncMatchmakingFilters();

  PlayScreen.filterModal();
  PlayScreen.setFilterState();
}

PlayScreen.setFilterState = function(){
  console.log(JSON.stringify(filters));
  for(var key in filters){
    if(filters.hasOwnProperty(key))
    {
      var elem = document.getElementById("filter-" + key);
      if(filters[key])
      {
        elem.classList.add("checked");
      }
      else
      {
        elem.classList.remove("checked");
      }
      console.log(key + " + " + filters[key]);
    }
  }
}

PlayScreen.prototype.OnCreation = function()
{
  this.OnShow();
}

PlayScreen.prototype.OnHide = function()
{
  hasClickButton = false;
  BaseMenuScreen.prototype.OnHide.call(this);
}

PlayScreen.prototype.OnClosed = function()
{
  hasClickButton = false;
  BaseMenuScreen.prototype.OnClosed.call(this);
}

PlayScreen.prototype.OnOptionElemSelected = function(elem)
{
  if(elem.dataset && elem.dataset.pushScreen && elem.dataset.pushScreen == "Custom")
  {
    if(LobbyData.IsInLobby)
    {
      PushScreen('CustomScreen');
    }
    else
    {
      var modalArgs = {
        options: ["Create", "Join", "Cancel"],
        title: "Create or Join a game?",
        bSupportsBackButton: true,
        callback: function(option){
          if(option == "Create")
          {
            if(LobbyData.CanCreateLobby)
            {
              console.log("Create Custom Game - Custom");
              LobbyData.RequestingNewLobby = true;
              LobbyData.Code = null;
              PushScreen('CustomScreen');
            }
            else
            {
              var modalArgsFailCreate = {
                options: ["Close"],
                title:"Failed To Create Custom Game..."
              }
              PushModal('Modal', modalArgsFailCreate);
            }
          }
          else if(option == "Join")
          {
            if(LobbyData.CanJoinLobby)
            {
              console.log("Join Custom Game - Custom");
              PushScreen('JoinCustomMatch');
              //LobbyData.JoinCode = $("#lobby-code-input").val();
            }
            else
            {
              var modalArgsFailJoin = {
                options: ["Close"],
                title:"Failed To Join Custom Game..."
              }
              PushModal('Modal', modalArgsFailJoin);
            }

            //document.getElementById('lobby-code-input').focus();
          }
          else{
            console.log("Cancel");
          }
        }
      }

      PushModal('Modal', modalArgs);
    }
  }
  else if(elem.id == "solo_play" || elem.id == "duo_play"){
    if(!hasClickButton)
    {
      console.log("HAS BEEN CLICKED");
      if (Matchmaking.CanStartMatching() && Matchmaking.IsStartingMatchmaking == false)
      {
        if(elem.dataset && elem.dataset.pushScreen)
        {
          hasClickButton = true;
          QueueMatchmaking(elem.dataset.pushScreen).then(function(result){
              console.log("Queue Result: " + result);
              if(result)
              {
                  //TODO: Create a return to main menu function and don't be lazy
                  PopScreenToMainMenu();
                  //PopScreen();
              }
              else
              {
                  ShowError("Failed to join queue. Please try again.");
              }
          });
        }
    }
        // console.log("PlayScreenDev.OnClicked: " + elem.id);
        // QueueMatchmaking(elem.id).then(function(result){
        //     console.log("Queue Result: " + result);
        //     if(result)
        //     {
        //         //TODO: Create a return to main menu function and don't be lazy
        //         PopScreenToMainMenu();
        //     }
        //     else
        //     {
        //         ShowError("Failed to join queue. Please try again.");
        //     }
        // });

    }
  }else{
    BaseMenuScreen.prototype.OnOptionElemSelected.call(this, elem);
  }
}

PlayScreen.filterModal = function(){
  if(showModal){
    showModal = false;
    var modalArgsFilter = {
      options: ["OK"],
      title: "Quick Play Filter",
      description: "<div id='filter-list-container'><ul id='filter-list'><li tabindex='0' data-filter='ffa' id='filter-ffa' onclick='PlayScreen.FilterPressed(this)'>Solo</li><li tabindex='0' data-filter='coop' id='filter-coop' onclick='PlayScreen.FilterPressed(this)'>Coop</li><li tabindex='0' data-filter='classic' id='filter-classic' onclick='PlayScreen.FilterPressed(this)'>Classic</li><li tabindex='0' data-filter='lightning' id='filter-lightning' onclick='PlayScreen.FilterPressed(this)'>Lightning</li></ul></div>",
      bSupportsBackButton: false,
      needInput: false,
      modalID: "QuickPlayFilter",
      callback: function(option){
        if(option == "OK")
        {
          console.log("OK");
          engine.call("ApplySettings");
          ValidateMatchmakingFilters();
          SyncMatchmakingFilters();
          PopModal();
          showModal = true;
        }
      }
    }
    PushModal('Modal', modalArgsFilter);
  }
}

PlayScreen.FilterPressed = function(elem)
{
  var setter = "";

  switch(elem.dataset.filter)
  {
    case "ffa":
      setter = "ToggleSoloFilter"
      break;
    case "coop":
      setter = "ToggleCoopFilter"
      break;
    case "classic":
      setter = "ToggleClassicFilter"
      break;
    case "lightning":
      setter = "ToggleLightningFilter"
      break;
  }
  console.log(setter);
  engine.call(setter).then($.proxy(function(){
    console.log("SETTER");
    PlayScreen.GetSettings();
  },this));
}

PlayScreen.prototype.OnKeyPressed = function(keyCode)
{
  if(keyCode == keyCodes.F && !LobbyData.IsInLobby)
  {
    PlayScreen.GetSettings();
  }
  BaseMenuScreen.prototype.OnKeyPressed.call(this, keyCode);
}

PlayScreen.prototype.OnMenuActionClicked = function(MenuAction){
  if(MenuAction == "QuickPlayFilter" && !LobbyData.IsInLobby){
    PlayScreen.GetSettings();
  }
  BaseMenuScreen.prototype.OnMenuActionClicked.call(this, MenuAction);
}

PlayScreen.prototype.GetMenuItems = function()
{
  console.log("PlayScreen GetMenuItems")
  var elems = [];
  var menuParent = $(this.ActiveMenu);
  menuParent.children('ul').children('li').each(function(index){
    if(this.tabIndex != undefined && Number(this.tabIndex) == 0)
    {
      elems.push(this);
    }
  });

  return elems;
}

PlayScreen.prototype.OnButtonPressedOverride = function(button)
{
  if(button == btn_Y && !LobbyData.IsInLobby)
  {
    PlayScreen.GetSettings();
  }
  BaseMenuScreen.prototype.OnButtonPressed.call(this, button);
}

$.extend(PlayScreen.prototype, HorizontalMenuMixin);

Screens['Play'] = PlayScreen;
