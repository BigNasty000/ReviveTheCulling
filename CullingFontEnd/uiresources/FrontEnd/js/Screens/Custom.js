const CustomSelector = document.getElementById("custom-menu");


//Add your CSS files here
$('head').append('<link rel="stylesheet" type="text/css" href="css/Screens/Custom.css">');

function CustomScreen()
{
  BaseMenuScreen.call(this);
  this.Selector = document.getElementById("custom-menu");
  this.ActiveMenu = document.getElementById("custom-game-contestants-container");
  this.ScreenActions = [{value:"Select"}, {value:"Back"}];
  this.ScreenName = "CustomScreen";
  this.optionsDirty = false;
}

CustomScreen.prototype = Object.create(BaseMenuScreen.prototype);
CustomScreen.prototype.constructor = CustomScreen;

var availableMaps =[
    { displayName: "Island", image: "map_image", mapName: "Jungle/Jungle_P" },
    { displayName: "Prison", image: "map_image", mapName: "Jungle2/Jungle2_P" },
];


var LobbyMemberList = {
    Members: [
        //{ displayName: "Player1", id: "platform_id" }
    ]
};

//var mapDisplayName = "";
var mapDisplayName = {
    mapDisplayName: ""
};
/*
rivets.bind($('#lobby-code'), {
    LobbyData: LobbyData
});

rivets.bind($('#lobby-map-name'), {
    mapDisplayName: mapDisplayName
});

rivets.bind($('#contestants-list'), {
    LobbyMemberList: LobbyMemberList
});

rivets.bind($('#start_match_btn'), {
    LobbyData: LobbyData
});
*/
rivets.bind($('#custom-menu'),{
  LobbyData: LobbyData,
  LobbyMemberList: LobbyMemberList,
  mapDisplayName: mapDisplayName,
  FooterData : FooterData,
  PlayerProfileData : PlayerProfileData
});

CustomScreen.prototype.OnShow = function()
{
  //console.log(this.ActiveMenu.innerHTML);
  //console.log(JSON.stringify(LobbyMemberList.Members));
  /*if(this.TabNavigation){
    this.SetTabFocus(this.TabNavigation[0].id);
    this.SetNewActiveMenu(document.getElementById(this.TabNavigation[0].id+"-container"));
    this.ResetFocus();
  }*/
  console.log(IsLobbyOwner(PlayerProfileData.UserID));
  CustomScreen.CheckForLobbyOwner();
  //console.log("MEMBERLIST " + LobbyMemberList.Members.length);
  BaseMenuScreen.prototype.OnShow.call(this);
}

CustomScreen.CheckForLobbyOwner = function () {
  if(IsLobbyOwner(PlayerProfileData.UserID)){
    document.getElementById("custom-game-options").classList.remove("hidden");
  }else{
    document.getElementById("custom-game-options").classList.add("hidden");
  }
}

CustomScreen.OnLobbyJoinFail = function (err) {
    var modalArgsJoin = {
        options: ["Ok"],
        title: "Join Lobby Failed: " + err.reason,
        bSupportsBackButton: false,
        needInput: false,
        callback: function (option) {
            if (option == "Ok") {
                PopScreen();
            }
        }
    }
    console.log("OnLobbyJoinFail:: PushModal ");
    PushModal('Modal', modalArgsJoin);
}

CustomScreen.prototype.OnCreation = function()
{

    console.log("CustomScreen::OnCreation" + JSON.stringify(LobbyData));
    if (LobbyData.RequestingNewLobby) {
        console.log("LobbyData.RequestingNewLobby " + LobbyData.RequestingNewLobby);
        LobbyData.mapIndex = 0;
        mapDisplayName.mapDisplayName = availableMaps[LobbyData.mapIndex].displayName;
        CreateCustomLobby(availableMaps[LobbyData.mapIndex].mapName);
        LobbyData.RequestingNewLobby = false;
    }
    else if (LobbyData.IsInLobby)
    {
        // Nothing to do here. We are already in the lobby.
    }
    else if (LobbyData.JoinCode != null && LobbyData.JoinCode != "" && LobbyData.JoinCode != undefined) {
        console.log("LobbyData.Code " + LobbyData.JoinCode);
        var lobbyCode = LobbyData.JoinCode.toLowerCase();

        JoinCustomLobby(lobbyCode);
        LobbyData.JoinCode = null;
        // Wait for LobbyData.IsInLobby to be set.
        // Or lobby-join-fail
        // Wait for LobbyData.Owner = null
    }
    else{
        console.log("Not creating a lobby and no lobby code set.");
        var modalArgsJoin = {
            options: ["Ok"],
            title: "Join Lobby Failed: No Join Code",
            bSupportsBackButton: false,
            needInput: false,
            callback: function (option) {
                if (option == "Ok") {
                    PopScreen();
                }
            }
        }
        PushModal('Modal', modalArgsJoin);
    }

  this.OnShow();
}

CustomScreen.prototype.OnMouseHover = function(element)
{
  console.log(this.ActiveMenu.innerHTML);
  //this.ForceFocusElem(element);
  if(element.dataset.list == "options"){
    //this.ActiveMenu = document.getElementById("custom-game-options-container");
    if(this.ActiveMenu != document.getElementById("custom-game-options-container")){
      this.SetNewActiveMenu(document.getElementById("custom-game-options-container"));
    }
  }else if(element.dataset.list == "contestant"){
    //this.ActiveMenu = document.getElementById("custom-game-contestants-container");
    if(this.ActiveMenu != document.getElementById("custom-game-contestants-container")){
      this.SetNewActiveMenu(document.getElementById("custom-game-contestants-container"));
    }
  }
  if(this.HasMenuItemElem(element))
  {
    this.ForceFocusElem(element);
  }
  //BaseMenuScreen.prototype.MouseTabClick.call(this, elem);
}

CustomScreen.prototype.OnHide = function()
{
  BaseMenuScreen.prototype.OnHide.call(this);
}

CustomScreen.prototype.OnClosed = function()
{
  //this.ResetTabFocus();
  BaseMenuScreen.prototype.OnClosed.call(this);
}

CustomScreen.setJoinCodeValue = function(input){
  document.getElementById('lobby-code-input').value = input;
}

CustomScreen.setPlayer = function(elem){
  console.log(elem);
}

var resolvedLobbyMemberUsernames = { };

function refreshLobbyMemberUsernames() {
  if (!ClientwebData.bIsConsole)
  {
    return;
  }

  console.log("refreshLobbyMemberUsernames");

  // refresh the lobby member usernames using what is presumed to be their userID set as 'userName' for consoles
  var userIDList = [];

   LobbyData.Members.forEach(function (member) {
     if(member.userData && member.userData.userID){
       userIDList.push(member.userData.userID);
     }
   });

  engine.call("ResolveUsernamesForUserIDs", userIDList);
}

//engine.on("OnResolvedUsernameForUserID", function (userID, userName) {
//  resolvedLobbyMemberUsernames[userID] = userName;
//});

engine.on("OnDoneUpdatingUserNicknames", function () {
  console.log("OnDoneUpdatingUserNicknames");

  if (LobbyData.IsInLobby) {
    updateLobbyData();
  }
});

function getResolvedUsername(userName) {

  console.log("getResolvedUsername: " + userName);

  if (!ClientwebData.bIsConsole)
  {
    return userName;
  }

  console.log(JSON.stringify(resolvedLobbyMemberUsernames));

  if (resolvedLobbyMemberUsernames[userName] == undefined)
  {
    console.log("No match");
    return "XUID:" + userName;
  }

  console.log("Found resolved match: " + resolvedLobbyMemberUsernames[userName]);
  return resolvedLobbyMemberUsernames[userName];
}

function updateLobbyData() {
  console.log("updateLobbyData");

	var LobbyOwnerFound = false;
    LobbyMemberList.Members = [];

    LobbyData.Members.forEach(function (member) {
        //var cullingCardURL = "'url('/images/culling-cards/" + member.cullingCard + ".png')";

        // userName may be a provider ID
        var resolvedName;
        if(member != null && member.userData != null && member.userData.userName != null){
          resolvedName = getResolvedUsername(member.userData.userName);
        }

        if (member.userData != null) {
            // userID in provider:ID format
            LobbyMemberList.Members.push({ empty: false, userID: member.user, displayName: resolvedName, level: member.userData.stats.level, rank: member.userData.stats.rank, team: member.team, cullingcard: member.userData.cullingcard, cullingcardimage: "" });

            console.log(JSON.stringify(member));

            (function (cardID) {
                engine.call('GetCullingCardImagePathFromID', cardID).then(
                  function (imagePath) {
                      LobbyMemberList.Members.forEach(function (member) {
                          if (member.cullingcard == cardID) {
                              member.cullingcardimage = imagePath;
                          }
                      });
                      var listLi = document.querySelectorAll("#contestants-list li");
                      //GetActiveScreen().ActiveMenu = document.getElementById("custom-game-contestants-container");
                      GetActiveScreen().SetNewActiveMenu(GetActiveScreen().ActiveMenu);
                      CustomScreen.CheckForLobbyOwner();
                  }
                );
            })(member.userData.cullingcard);
        }
    });

    var emptySlots =  16 - LobbyMemberList.Members.length;

    for(var i = 0; i < emptySlots; i++){
        LobbyMemberList.Members.push({ empty: true}) ;
    }

    var mapIndex = 0
    for (mapIndex = 0; mapIndex < availableMaps.length; mapIndex++)
    {
        if (availableMaps[mapIndex].mapName == LobbyData.mapName)
        {
            mapDisplayName.mapDisplayName = availableMaps[mapIndex].displayName;
            break;
        }
    }
}

CustomScreen.prototype.IncrementSettings = function (direction, setting) {
    console.log(direction + " " + setting);
    //var setter = "";
    if (LobbyData.IsInLobby && IsLobbyOwner(PlayerProfileData.UserID))
    {
        console.log("IncrementSettings: IsOwner");
    }
    switch (setting) {
        case "Map":
            if (direction > 0) {
                LobbyData.mapIndex = (LobbyData.mapIndex + 1) % availableMaps.length;

                console.log("LobbyData.mapIndex: " + LobbyData.mapIndex);
                SetLobbyMap(availableMaps[LobbyData.mapIndex].mapName);
            }
            else {
                LobbyData.mapIndex--;
                if (LobbyData.mapIndex < 0){
                    LobbyData.mapIndex = availableMaps.length - 1;
                }
                SetLobbyMap(availableMaps[LobbyData.mapIndex].mapName);
            }
            break;
    }

}

CustomScreen.OnClicked = function (elem) {

    console.log("CustomScreen.OnClicked:: " + elem.id);
    if (elem.id == "debug_add")
    {
        //LobbyMemberList.Members = [
        //    { empty: false, displayName: "Player1", level: "10", rank: "1" },
        //    { empty: false, displayName: "Player2", level: "10", rank: "1" },
        //    { empty: false, displayName: "Player3", level: "10", rank: "1" },
        //    { empty: false, displayName: "Player4", level: "10", rank: "1" },
        //    { empty: false, displayName: "Player5", level: "10", rank: "1" },
        //    { empty: false, displayName: "Player6", level: "10", rank: "1" },
        //    { empty: false, displayName: "Player7", level: "10", rank: "1" },
        //    { empty: true, displayName: "Player8",  level: "10", rank: "1" },
        //    { empty: true, displayName: "Player9",  level: "10", rank: "1" },
        //    { empty: true, displayName: "Player10", level: "10", rank: "1" },
        //    { empty: true, displayName: "Player11", level: "10", rank: "1" },
        //    { empty: true, displayName: "Player12", level: "10", rank: "1" },
        //    { empty: true, displayName: "Player13", level: "10", rank: "1" },
        //    { empty: true, displayName: "Player14", level: "10", rank: "1" },
        //    { empty: true, displayName: "Player15", level: "10", rank: "1" },
        //    { empty: true, displayName: "Player16", level: "10", rank: "1" },
        //];
    }
    else if (elem.id == "start_match_btn")
    {
      if(LobbyData.CanStartMatch){
        if (!LobbyData.MatchIsStarting) {
            console.log("start_match_btn");
            LobbyData.MatchIsStarting = true;
            LobbyData.UpdateDerivedProperties();
            ConnectWebsocketIfNeeded().then(function (socketConnection) {

                socketConnection.emit("lobby-start-match");
            }).catch(function (err) {
                LobbyData.MatchIsStarting = false;
                LobbyData.UpdateDerivedProperties();
            });
        }
      }
    }
    else if (elem.id == "leave_match_btn")
    {
      if (LobbyData.IsInLobby)
      {
        var modalArgsLeave = {
            options: ["Ok"],
            title: "You are leaving the lobby.",
            bSupportsBackButton: false,
            needInput: false,
            callback: function (option) {
                if (option == "Ok") {
                    LeaveLobby();
                    PopModal();
                }
            }
        }
        PushModal('Modal', modalArgsLeave);
        PopScreen();
      }
      else{
        PopScreen();
      }
    }
    else if (elem.id == "match_settings_btn")
    {
      PushScreen("CustomSettings");
    }
}

CustomScreen.prototype.MouseTabClick = function(elem)
{
  BaseMenuScreen.prototype.MouseTabClick.call(this, elem);
}

CustomScreen.prototype.OnMouseClicked = function (elem) {
    console.log("OnMouseClicked: ");
    if (elem.dataset && elem.dataset.picker) {
        console.log("Elem Clicked: " + elem.nodeName);
        var parent = this.GetAbsoluteMenuItemElem(elem);
        if (parent == undefined) {
            parent = elem.parentElement;
        }

        if (parent != undefined) {
            //var parent = this.GetAbsoluteMenuItemElem(elem);
            if (parent.dataset && parent.dataset.pickerConfigVar) {
                var direction = elem.dataset.picker;
                var configVar = parent.dataset.pickerConfigVar;
                var numDir = direction == "right" ? 1 : -1;
                console.log("Picker clicked " + direction + " to change " + configVar + " (" + numDir + ")");
                this.IncrementSettings(numDir, configVar);
            }
            else {
                console.warn("Picker element parent (" + parent.nodeName + ") missing dataset vars " + JSON.stringify(parent.dataset));
            }
        }
        else {
            console.warn("Clicked a picker element that isn't apart of current Screen");
        }
    }

    BaseMenuScreen.prototype.OnMouseClicked.call(this, elem);
}

CustomScreen.prototype.OnOptionElemSelected = function(element)
{
  console.log("CustomScreen OnOptionElemSelected");
  CustomScreen.OnClicked(element);
}

CustomScreen.prototype.OnButtonPressed = function(button){
  console.log(document.activeElement.innerHTML);
  if(button == btn_Up)
  {
    this.IncrementSelection(-1);
  }
  else if(button == btn_Down)
  {
    this.IncrementSelection(1);
  }
  else if(button == btn_Right)
  {
    var focusedItem = this.GetFocusedItem();
    if(focusedItem.dataset.options != undefined)
    {
      this.IncrementOnElement(focusedItem, 1)
    }
    else
    {
      this.IncrementSelection(8);
    }

  }
  else if(button == btn_Left)
  {
    var focusedItem = this.GetFocusedItem();
    if(focusedItem.dataset.options != undefined)
    {
      this.IncrementOnElement(focusedItem, -1)
    }
    else
    {
      this.IncrementSelection(-8);
    }
  }
  else if(button == btn_Select)
  {
    var focusedItem = this.GetFocusedItem();
    if(focusedItem != undefined)
    {
      if(ClientwebData.bIsConsole && focusedItem.dataset.playerId){
        GetXBoxProfile(focusedItem);
      }else{
        this.OnOptionElemSelected(focusedItem);
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
    /*if(IsLobbyOwner(PlayerProfileData.UserID)){
      this.IncrementTabNav(-1);
    }*/

  }
  else if(button == btn_RT)
  {
    console.log("RT");
    /*if(IsLobbyOwner(PlayerProfileData.UserID)){
      this.IncrementTabNav(1);
    }*/
  }
  else if(button == btn_Y)
  {
    /*var focusedItem = this.GetFocusedItem();
    if(ClientwebData.bIsConsole && focusedItem != undefined)
    {
      GetXBoxProfile(focusedItem);
    }*/
  }
  //BaseMenuScreen.prototype.OnButtonPressed.call(this, button);
}

CustomScreen.prototype.IncrementOnElement = function(elem, direction)
{
    if(this.HasMenuItemElem(elem) && elem.dataset != undefined && elem.dataset.pickerConfigVar != undefined)
    {
        var pickerConfigVar = elem.dataset.pickerConfigVar;
        this.IncrementSettings(direction, pickerConfigVar);
    }
}

CustomScreen.prototype.IncrementSelection = function(direction)
{
  console.log("CustomScreen direction " + direction);
  var currFocus = document.activeElement;
  var menuItems = this.GetMenuItems();
  var menuChange = false;
  var idx = 0;
  for( var i = 0; i < menuItems.length; ++i )
  {
    if(menuItems[i] === currFocus)
    {
      idx = i;
      break;
    }
  }
  console.log("idx " + idx);
  console.log("menuItems.length " + menuItems.length);
  console.log((idx + direction + menuItems.length) % menuItems.length);
  if(menuItems.length == 0){
    idx = 0;
  }else{
    if(idx + direction >= 0 && idx + direction < menuItems.length){
      idx = (idx + direction + menuItems.length) % menuItems.length;
    }else if(IsLobbyOwner(PlayerProfileData.UserID)){
      console.log("CHANGENAV");
      if(this.ActiveMenu != document.getElementById("custom-game-options-container")){
        this.SetNewActiveMenu(document.getElementById("custom-game-options-container"));
      }else if(this.ActiveMenu != document.getElementById("custom-game-contestants-container")){
        this.SetNewActiveMenu(document.getElementById("custom-game-contestants-container"));

      }
      menuChange = true;
    }
  }
  console.log("idx " + idx);
  if(menuChange){
    this.ResetFocus();
  }else{
    if(menuItems[idx]){
      menuItems[idx].focus();
    }
  }
  //this.OnSelectionChanged(menuItems[idx]);
}

CustomScreen.prototype.MouseTabClick = function(elem)
{
  BaseMenuScreen.prototype.MouseTabClick.call(this, elem);
}

//$.extend(CustomScreen.prototype, VerticalMenuMixin);
Screens['CustomScreen'] = CustomScreen;
