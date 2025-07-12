var playerData = {
  rankData : {
    ffa : "",
    teams : ""
  }
}
var numAvailableCrates = 0;

var DebugOptions =
{
    play_menu : true// TODO:: Set this to false for shipping builds.
}

engine.createJSModel("PurchaseWidgetController",{
  Category : ["Currency", "Crates"],
  ActiveCategory : 0,
  ReturnToCrates : false
});

engine.createJSModel('PurchaseWidgetPageData', {
  Crates : {
    Title : "CULL CRATES SHOP",
    Subtitle : "",
    Description : "EACH CULL CRATE CONTAINS A COMBINATION OF UP TO 4 COSMETIC ITEMS AND/OR IN-GAME CREDITS. CULL CRATES CAN BE EARNED THROUGH IN-GAME SYSTEMS."
  },
  Currency : {
    Title : "TOKENS SHOP",
    Subtitle : "",
    Description : ""
  }
});

// engine.createJSModel("StorePreviewController",{
//   Items : [],
//   Name : "",
//   ProductID : 0,
//   NumberOfItems : 0,
//   Cost : "",
//   PremiumCost : "",
//   bPurchasableByDollars : false,
// 	bPurchasableByPremium : false,
//   DLCAppId : 0,
//   bIsOwned : false
// });

function UpdateJSModel(model){
  console.log("UpdateJSModels");
  engine.updateWholeModel(model);
  engine.synchronizeModels();
}

function InitFrontEnd()
{
  console.log("InitFrontEnd()");

  engine.call("UpdateIsInCustomGame", LobbyData.IsInLobby);

  // Certain information must be resolved from the engine before we can continue on to everything else.
  engine.call("IsConsole").then(function (bIsConsole) {
    console.log("bIsConsole: " + bIsConsole);
    ClientwebData.bIsConsole = bIsConsole;

    InitFrontendDeferred();
  });
}

function InitFrontendDeferred()
{
  console.log("InitFrontendDeferred()");
  InitControlMappings();
  BindRivetsGlobals();
  engine.call("UI_Loaded");
  OnLocalCullingCardChanged();
  engine.call("GetUserSettings");

  SetHasGamepad(ClientwebData.bIsConsole);

  if (!ClientwebData.bIsConsole) {
    $.get("http://resources.theculling.com/News.html", function(news){
          document.getElementById("news-text").innerHTML = news;
      });
  }
  else {
    $.get("https://s3.amazonaws.com/resources.theculling.com/NewsXbox.html", function(news){
          document.getElementById("news-text").innerHTML = news;
      });
  }

  engine.call("IsDevBuild").then(function(bIsDev) {
    Matchmaking.IsDevBuild = bIsDev;
  });

  var bIsPIE = false;
  engine.call("IsPIEMode").then(function(bIsPIEResult){
      bIsPIE = bIsPIEResult;
  });
      //engine.call("IsUserReady").then(function (bUserReady) {
    //    if (bIsPIE == true || bUserReady == true) {
    //      BeginMainMenu();
    //    }
    //    else {
          PushScreen('TitleScreen');
      //  }
      //})

  // From Play.js
  LoadMatchmakingFilters().then(SyncMatchmakingFilters);

  RefreshOnlineIdentity();
  RefreshSubsystemPartner();

  setInterval(function(){
    RefreshOnlineIdentity();
  }, 15000);
  engine.call("GetWeaponCustCategories").then(function(categories){
      WeaponsListScreen.GetWeaponCategories(categories);
  });
}

function RefreshSubsystemPartner() {
  engine.call("RefreshSubsystemPartner");
}

function RefreshOnlineIdentity() {
  engine.call("GetOnlineIdentityName").then(function (playername) {
      // console.log("Refreshed Online Identity: " + playername);
      PlayerProfileData.Nickname = playername;
    });
}

function BeginMainMenu()
{
  //console.log("FOOTERDATA " + FooterData.bHasGamepad);
  PushScreen("MainMenu");
  //engine.call("GetDataCenter").then(SelectAndConnectDataCenter);
}

engine.on("TitleScreenConnectToClientWeb", function (bCheckDLC) {
    console.log("TitleScreenConnectToClientWeb bCheckDLC =" + bCheckDLC);
    bCheckDLCAtLogin = bCheckDLC;
    engine.call("GetDataCenter").then(SelectAndConnectDataCenter);
});

engine.on("UIBound", function(){
    console.log("UIBound!");
    InitFrontEnd();
});

engine.on("OnPurchaseAuthenticated", function(appId, orderId){
	console.log("OnPurchaseAuthenticated " + orderId);
	SendPurchaseAuthenticated(appId, orderId);
});

engine.on("OnPurchaseAuthenticatedCancelled", function (orderId) {
    console.log("OnPurchaseAuthenticatedCancelled " + orderId);
    // TODO:: Close purchase in progress dialog here.
    ClientwebData.PendingRealMoneyPurchaseProductID = 0;
    if(GetActiveScreen().ScreenName == "PurchaseWidget")
    {
      PurchaseWidget.ShowPendingModal(false);
    }
});

engine.on("ReturnToTitleScreen", function () {
    console.log("ReturnToTitleScreen");

    while (ScreenStack.length > 0)
    {
        PopScreen(true);
    }
    PushScreen("TitleScreen");
});

var bIsPIEMode = false;

$(document).ready(function () {
  console.log("Document ready.");
  //ControllerPollingLoop();
  //InitKeyboardEventListener();
  engine.call("UI_Loaded");
  engine.call("IsBindingFinished").then(function(result){
    if(result == true){
      console.log("Shortcutting UI_Loaded, as we've already Bound");
      InitFrontEnd();
    }
  });
  engine.call("IsPIEMode").then(function(result){
    if(result == true){
      bIsPIEMode = true;
      InitFrontEnd();
      LoadDebugMenuStack();
    }
  });
});

/*
function TestSVG()
{
    var animData = {
      container: document.getElementById('bodymovin'),
      animType: 'svg',
      loop: true,
      autoplay: true,
      animationData: testAnim
    };

    var anim = bodymovin.loadAnimation(animData);
}

function TestCanvas()
{
    var canvas,stage,exportRoot;
    canvas = document.getElementById("test-canvas");
    exportRoot = new button_lib.bgtest();

    stage = new createjs.Stage(canvas);
    stage.addChild(exportRoot);
    createjs.Ticker.setFPS(button_lib.properties.fps);
	  createjs.Ticker.addEventListener("tick", stage);
    //Code to support hidpi screens and responsive scaling.
  	window.addEventListener('resize', function(){
      FitCanvasToParent(canvas, stage, button_lib);
    });
    FitCanvasToParent(canvas, stage, button_lib);

}


function FitCanvasToParent(canvas, stage, lib)
{
  var isResp = true;
  var respDim = 'width';
  var isScale = true;
  var scaleType = 1;
  var lastW, lastH, lastS=1;
  setTimeout(function(){
    var w = lib.properties.width, h = lib.properties.height;
    var iw = canvas.parentElement.offsetWidth, ih=canvas.parentElement.offsetWidth;
    var pRatio = window.devicePixelRatio, xRatio=iw/w, yRatio=ih/h, sRatio=1;
    if(isResp) {
      if((respDim=='width'&&lastW==iw) || (respDim=='height'&&lastH==ih)) {
        sRatio = lastS;
      }
      else if(!isScale) {
        if(iw<w || ih<h)
          sRatio = Math.min(xRatio, yRatio);
      }
      else if(scaleType==1) {
        sRatio = Math.min(xRatio, yRatio);
      }
      else if(scaleType==2) {
        sRatio = Math.max(xRatio, yRatio);
      }
    }
    canvas.width = w*pRatio*sRatio;
    canvas.height = h*pRatio*sRatio;
    canvas.style.width = w*sRatio+'px';
    canvas.style.height = h*sRatio+'px';
    stage.scaleX = pRatio*sRatio;
    stage.scaleY = pRatio*sRatio;
    lastW = iw; lastH = ih; lastS = sRatio;
  }, 75);
}
*/

function LoadDebugMenuStack()
{
  /*
  setTimeout(function(){
    var modalArgs = { options: ["Yes", "No"], title:"Are you sure you want to buy this thing?", bSupportsBackButton: false, callback: function(option){
      console.log("Callback with option: " + option);
      setTimeout(function(){
        var bodyModalArgs = [
          { options: ["My Finger", "One Less Finger", "My Third Finger"], title:"Sick Modal", body: "Pick a Finger- any Finger!", bSupportsBackButton: false },
          { options: ["My Last Finger", "One More Finger", "My Third Finger"], title:"Sick Finger Modal", body: "Pick a Finger - any Finger!", bSupportsBackButton: false }
        ]
        setInterval(function(){
          var idx = Math.round(Math.random());
          PushModal('Modal', bodyModalArgs[idx])
        }, 10000);
      }, 0);
    }}
    PushModal('Modal', modalArgs);
  }, 100);
  */
}

//function InitKeyboardEventListener()
//{
// document.addEventListener("keydown", function (args) {
//   if(args.keyCode === keyCodes.Down){
//     OnButtonPressed(btn_Down);
//   }
//   else if(args.keyCode === keyCodes.Up){
//     OnButtonPressed(btn_Up);
//   }
//   else if(args.keyCode === keyCodes.Right){
//     OnButtonPressed(btn_Right);
//   }
//   else if(args.keyCode === keyCodes.Left){
//     OnButtonPressed(btn_Left);
//   }
//   else if(args.keyCode === keyCodes.Enter || args.keyCode === keyCodes.Space){
//     OnButtonPressed(btn_Select);
//   }
//   else if(args.keyCode === keyCodes.Escape){
//     OnButtonPressed(btn_Back);
//   }
//   else if(args.keyCode === keyCodes.I){
//     InvitePlayer();
//   }
//   else if(GetActiveScreen() != undefined && GetActiveModal() == undefined)
//   {
//     GetActiveScreen().OnKeyPressed(args.keyCode);
//   }
// });
//}

function InvitePlayer()
{
  /*
  console.log(GetActiveScreen().ScreenName);
  if (IsOnline()) {
    if (!ClientwebData.bIsConsole)
    {
      if(GetActiveScreen().ScreenName != "InvitePlayerScreen")
      {
        PushScreen('InvitePlayerScreen');
      }
    }
    else
    {
      engine.call("ShowSubsystemInviteFriendUI");
    }
  }
  */
  OnInvitePressed();
}

var lastControllerTimestamp = 0;
var lastGamePad =
{
  0 : false,
  1 : false,
  2 : false,
  3 : false,
  4 : false,
  5 : false,
  6 : false,
  7 : false,
  8 : false,
  9 : false,
  10 : false,
  11 : false,
  12 : false,
  13 : false,
  14 : false,
  15 : false
}

var lastAxises =
{
  0 : 0,
  1 : 0
}

var axisDelay = 0;
var buttonTimeHolder = [];
const axisThreshhold = 0.85;
const axisTimeout = 15.0;
const timeBetweenDpadPresses = 175.0;

var rightAxisVal = 0.0;
const rightAxisThreshold = 0.25;

function OnUpdateRightAxis(value)
{
  //console.log("******OnUpdateRightAxis");
  engine.call("UpdateItemRotation", value*-7.0);
}


//function ControllerPollingLoop()
//{
//  var bUpdateTimestamp = false;
//  var gamepads = navigator.getGamepads();
//  var bDirtiedAxis = false;
//  if (gamepads.length > 0) {
//    var gamePad = gamepads[0];
//    axisDelay++;
//    if(Math.abs(gamePad.axes[0]) < axisThreshhold && Math.abs(gamePad.axes[1]) < axisThreshhold)
//    {
//      axisDelay = axisTimeout;
//    }
//
//    // right analog stick
//    if(Math.abs(gamePad.axes[2]) >= rightAxisThreshold)
//    {
//      rightAxisVal = gamePad.axes[2];
//      OnUpdateRightAxis(rightAxisVal);
//    }
//    else
//    {
//      rightAxisVal = 0;
//    }
//
//    if(axisDelay >= axisTimeout)
//    {
//      for(var axis in lastAxises)
//      {
//        if(Math.abs(gamePad.axes[axis]) >= axisThreshhold)
//        {
//          //console.log("AxisVal: " + gamePad.axes[axis]);
//          if(gamePad.axes[axis] > 0)
//          {
//            if(axis == 0)
//            {
//              //console.log("AxisRight");
//              bDirtiedAxis = true;
//              axisDelay = 0;
//              lastAxises[axis] = 1;
//              SetHasGamepad(true);
//              OnButtonPressed(btn_Right);
//              break;
//            }
//            else
//            {
//              //console.log("AxisDown");
//              bDirtiedAxis = true;
//              axisDelay = 0;
//              lastAxises[axis] = 1;
//              SetHasGamepad(true);
//              OnButtonPressed(btn_Down);
//              break;
//            }
//          }
//          else
//          {
//            if(axis == 0)
//            {
//              //console.log("AxisLeft");
//              bDirtiedAxis = true;
//              axisDelay = 0;
//              lastAxises[axis] = 1;
//              SetHasGamepad(true);
//              OnButtonPressed(btn_Left);
//              break;
//            }
//            else
//            {
//              //console.log("AxisUp");
//              bDirtiedAxis = true;
//              axisDelay = 0;
//              lastAxises[axis] = 1;
//              SetHasGamepad(true);
//              OnButtonPressed(btn_Up);
//              break;
//            }
//          }
//        }
//        else
//        {
//            lastAxises[axis] = 0;
//        }
//      }
//    }
//
//    if(bDirtiedAxis == false && lastControllerTimestamp != gamePad.timestamp)
//    {
//      for(var button in lastGamePad)
//      {
//        if(buttonTimeHolder[button] == undefined)
//        {
//          buttonTimeHolder[button] = {lastTimePressed : new Date()}
//          //buttonTimeHolder[button].lastTimePressed = new Date();
//        }
//        if(gamePad.buttons[button].pressed)
//        {
//          if(lastGamePad[button] == false)
//          {
//            if(button == btn_Up || button == btn_Down || button == btn_Left || button == btn_Right)
//            {
//              var bIsDiagonal = TestForDiagonals(gamePad);
//              var bAxisStale = IsAxisDataStale();
//              var nowTime = new Date();
//              //console.log("Time between presses: " + (nowTime.getTime() - buttonTimeHolder[button].lastTimePressed.getTime()));
//              var bTimeDelayed = (nowTime.getTime() - buttonTimeHolder[button].lastTimePressed.getTime() < timeBetweenDpadPresses);
//              if(bIsDiagonal || bAxisStale || bTimeDelayed)
//              {
//                 lastGamePad[button]  = false;
//                 continue;
//              }
//            }
//            OnButtonPressed(button);
//            buttonTimeHolder[button].lastTimePressed = new Date();
//            bUpdateTimestamp = true;
//            if(button == btn_Select || button == btn_Back || button == btn_Pause || button == btn_Invite || button == btn_LT || button == btn_RT)
//            {
//              lastGamePad[button] = true;
//            }
//          }
//        }
//        else
//        {
//            lastGamePad[button] = false;
//        }
//      }
//      if(bUpdateTimestamp == true)
//      {
//        SetHasGamepad(true);
//        lastControllerTimestamp = gamePad.timestamp;
//      }
//    }
//  }
//  window.requestAnimationFrame(ControllerPollingLoop);
//}

function SetHasGamepad(HasGamepad)
{
  //console.log(HasGamepad + " " + FooterData.bHasGamepad);
  if(FooterData.bHasGamepad != HasGamepad)
  {
    if(ClientwebData.bIsConsole)
    {
      FooterData.bHasGamepad = true;
    }
    else {
      FooterData.bHasGamepad = HasGamepad;
    }


    if(FooterData.bHasGamepad)
    {
      OnControllerConnected();
    }
    else
    {
      OnControllerDisconnected();
    }
  }
}

function OnControllerConnected()
{
  console.log("Controller Connected");
}

function OnControllerDisconnected()
{
  console.log("Controller Disconnected");
}

function IsAxisDataStale()
{
  return (lastAxises[0] != 0 || lastAxises[1] != 0);
}

function TestForDiagonals(gamePad)
{
  return ((gamePad.buttons[btn_Up].pressed == true && gamePad.buttons[btn_Right].pressed == true ) ||
          (gamePad.buttons[btn_Right].pressed == true && gamePad.buttons[btn_Down].pressed == true ) ||
          (gamePad.buttons[btn_Down].pressed == true && gamePad.buttons[btn_Left].pressed == true ) ||
          (gamePad.buttons[btn_Left].pressed == true && gamePad.buttons[btn_Up].pressed == true ));
}

//FORCE A REDRAW WHENEVER THE VIEW SIZE CHANGES! EVERY HUD SHOULD HAVE THIS IN ITS JS!
//BASICHUD SENDS THE EVENT
engine.on("OnViewResized", function(){
  console.log(document.body.style.display);
  document.body.style.display = "none";
  setTimeout(function(){
    document.body.style.display = "";
  },50);
});

$(document).on("click", function(event){
  console.log("MOUSECLICK");
  if(event && event.type == "click")
  {
    OnMouseClicked(event.target);
    //event.preventDefault();
  }
  //updateContestantList();
});

$(document).on("keydown", function(e){
  SetHasGamepad(false);
});

//This prevents clicks from causing focus to be lost
$(document).on('mousedown', function(e) {

  SetHasGamepad(false);
  if(e.which == 3)
  {
    console.log("MOUSECLICK");
    if(GetActiveScreen() != undefined && GetActiveModal() == undefined)
    {
      console.log("MOUSECLICK");
      GetActiveScreen().OnMenuActionClicked("Back");
    }
  }
  e.stopImmediatePropagation();
  //e.preventDefault();
  //OnFocusOut(e);
});

$('li').hover(function(event){
  if(event)
  {
    //console.log("HOVER" + event.target.innerHTML);
    OnMouseHover(event.target);
    engine.call("PostSoundEvent", "Play_HUD_Mouseover");
  }
});

$('li.contestant').hover(function(event){
  console.log("contestant hover");
}, function(event){
  console.log("out")
});

function OnQuitClicked()
{
  var modalArgs = {
    options: ["Yes", "No"],
    title: "Are you sure you want to exit?",
    bSupportsBackButton: true,
    callback: function(option){
      if(option == "Yes")
      {
        DoQuit();
      }
	  }
  }
  PushModal('Modal', modalArgs);
}

function DoQuit()
{
  engine.call("OnQuitClicked");
}

engine.on("SetAvailableCrates", function (numCrates) {
  console.log("SetAvailableCrates " + numCrates);
  SetAvailableCrates(numCrates);
});

function SetAvailableCrates(numCrates)
{
  //numAvailableCrates = numCrates;
  LootboxScreenData.numAvailableCrates = numCrates;
  MainMenuScreenData.bHasNewCrate = (numCrates > 0) ? true : false;
}

engine.on('OnShowingLootBoxContents', function() {
  // When the loot box items received become visible, this is triggered.
  LootDisplayScreen.showLootLabels();
  console.log("OnShowingLootBoxContents()");
});

engine.on('OnShowingOpenCrateButton', function() {
  console.log("Open Crate");
  LootboxScreen.ShowOpenCratebutton();
});

engine.on('OnLocalCullingCardChanged', function() {
  OnLocalCullingCardChanged();
});

function OnLocalCullingCardChanged()
{
  engine.call("GetLocalPlayerCullingCardImagePath").then(function (cullingCard) {
    // Handle culling card text here (cullingCard); will be blank ("") if something is wrong; so use a default.
	  console.log("Received new culling card to use for local player: " + cullingCard);
	  $('.local-culling-card-container').css('background-image', 'url("/images/culling-cards/'+cullingCard+'.png")');
  });

  engine.call("GetLocalPlayerCullingCardID").then(function (cardID) {
      SendCullingCardIfConnected(cardID);
    });
}

engine.on('ServerNonceFailed', function() {
  ShowNonceModal();
});

function ShowNonceModal(){
  OnCancelMatchmaking();
  var modalNonceArgs = {
    options: ["OK"],
    title:"ERROR: Invalid Game Server Connection",
    bSupportsBackButton: false,
    modalID: "NonceModal",
    callback: function(option){
      if(option == "OK"){
        engine.call("QuitToMainMenu");
      }
    }
  }
  PushModal('Modal', modalNonceArgs);
}

function OpenStoreWidget()
{
	if(IsOnline())
	{
	  PushScreen("StoreWidget");
	}
	else
	{
	  HandleRequireOnline();
	}
}

engine.on('OnUpKeyPressed', function (bIsGamepadKey)
{
    console.log("OnUpKeyPressed");
    if (bIsGamepadKey)
    {
        SetHasGamepad(true);
    }
    else
    {
        SetHasGamepad(false);
    }
    OnButtonPressed(btn_Up);
});

engine.on('OnDownKeyPressed', function (bIsGamepadKey)
{
    console.log("OnDownKeyPressed");
    if (bIsGamepadKey) {
        SetHasGamepad(true);
    }
    else {
        SetHasGamepad(false);
    }
    OnButtonPressed(btn_Down);
});

engine.on('OnLeftKeyPressed', function (bIsGamepadKey)
{
    console.log("OnLeftKeyPressed");
    if (bIsGamepadKey) {
        SetHasGamepad(true);
    }
    else {
        SetHasGamepad(false);
    }
    OnButtonPressed(btn_Left);
});

engine.on('OnRightKeyPressed', function (bIsGamepadKey)
{
    console.log("OnRightKeyPressed");
    if (bIsGamepadKey) {
        SetHasGamepad(true);
    }
    else {
        SetHasGamepad(false);
    }
    OnButtonPressed(btn_Right);
});

engine.on('OnSelectKeyPressed', function (bIsGamepadKey)
{
    console.log("OnSelectKeyPressed");
    if (bIsGamepadKey) {
        SetHasGamepad(true);
    }
    else {
        SetHasGamepad(false);
    }
    OnButtonPressed(btn_Select);
});

engine.on('OnBackKeyPressed', function (bIsGamepadKey)
{
    console.log("OnBackKeyPressed");
    if (bIsGamepadKey) {
        SetHasGamepad(true);
    }
    else {
        SetHasGamepad(false);
    }
    OnButtonPressed(btn_Back);
});

engine.on('OnXButtonPressed', function (bIsGamepadKey)
{
  console.log("OnInvitePlayerKeyPressed");
  if (bIsGamepadKey) {
      SetHasGamepad(true);
  }
  else {
      SetHasGamepad(false);
  }
  OnButtonPressed(btn_Invite);
});

engine.on('OnYButtonPressed', function (bIsGamepadKey)
{
  console.log("OnCancelSearchKeyPressed");
  if (bIsGamepadKey) {
      SetHasGamepad(true);
  }
  else {
      SetHasGamepad(false);
  }
  OnButtonPressed(btn_Y);
});

engine.on('OnDecrementPageNav', function (bIsGamepadKey) {
    console.log("OnDecrementPageNav");
    if (bIsGamepadKey) {
        SetHasGamepad(true);
    }
    else {
        SetHasGamepad(false);
    }
    OnButtonPressed(btn_LT);
});

engine.on('OnIncrementPageNav', function (bIsGamepadKey) {
    console.log("OnIncrementPageNav");
    if (bIsGamepadKey) {
        SetHasGamepad(true);
    }
    else {
        SetHasGamepad(false);
    }
    OnButtonPressed(btn_RT);
});

engine.on('OnNumberButtonPressed', function (num) {
    console.log("OnNumberButtonPressed " + num);
    /*if (bIsGamepadKey) {
        SetHasGamepad(true);
    }
    else {
        SetHasGamepad(false);
    }
    OnButtonPressed(btn_RT);*/
    GetActiveScreen().OnKeyPressed(num);
});

engine.on('OnBackspaceButtonPressed', function (bIsGamepadKey) {
    console.log("OnBackspaceButtonPressed " + bIsGamepadKey);
    /*if (bIsGamepadKey) {
        SetHasGamepad(true);
    }
    else {
        SetHasGamepad(false);
    }
    OnButtonPressed(btn_RT);*/
    GetActiveScreen().OnKeyPressed("DELETE");
});

engine.on('OnSpecialRightButtonPressed', function (bIsGamepadKey) {
    console.log("OnSpecialRightButtonPressed " + bIsGamepadKey);
    if (bIsGamepadKey) {
        SetHasGamepad(true);
    }
    else {
        SetHasGamepad(false);
    }
    OnButtonPressed(btn_Pause);
});

function GetPlayerProfile(elem)
{
    console.log("GetPlayerProfile:: " + elem.dataset.playerId);
    /*engine.call("ShowGamerCard", elem.dataset.playerId);*/
}

function GetXBoxProfile(elem)
{
    console.log("GetXBoxProfile:: " + elem.dataset.playerId);
    engine.call("ShowGamerCard", elem.dataset.playerId);
}

engine.on("QueryContextStringForInvite", function () {
  console.log("QueryContextStringForInvite");

  var lobbyCode = "";

  if (LobbyData.IsInLobby)
  {
    lobbyCode = LobbyData.Code;
  }

  console.log("LobbyData.IsInLobby = " + LobbyData.IsInLobby + ", LobbyData.Code = " + LobbyData.Code);
  engine.call("QueryContextStringForInviteCallback", lobbyCode);
});

function ShowCustomGameInviteAcceptFailure(message)
{
  PopModalByID("CustomGameInviteAccept");

  var modalArgs = {
      options: ["OK"],
      title: message,
      bSupportsBackButton: true,
      modalID: "CustomGameInviteAccept",
      callback: function(option){
      }
    };

  PushModal('Modal', modalArgs);
}

function ShowCustomGameInviteAcceptWaiting()
{
  PopModalByID("CustomGameInviteAccept");

  var modalArgs = {
      options: ["OK"],
      title: "Joining custom game via invite...",
      bSupportsBackButton: true,
      modalID: "CustomGameInviteAccept",
      callback: function(option){
      }
    };

  PushModal('Modal', modalArgs);
}

function CancelCustomGameInviteAcceptModal()
{
  PopModalByID("CustomGameInviteAccept");
}

engine.on("OnCustomGameInviteAccepted", function(code) {
  console.log("OnCustomGameInviteAccepted");

  if (LobbyData.IsInLobby) {
    ShowCustomGameInviteAcceptFailure("Could not join player because you are already in a custom game.");
    return;
  }

  if (Matchmaking.IsMatchmaking) {
    ShowCustomGameInviteAcceptFailure("Could not join player because you are currently match making.");
    return;
  }

  if (IsOnline())
  {
    // ShowCustomGameInviteAcceptWaiting();

    LobbyData.JoinCode = code;
    PushScreen('CustomScreen');
  }
  else
  {
    ClientwebData.QueuedJoinLobbyCode = code;
  }
});

function OnMouseDownStoreItem()
{
  console.log("STORE");
  engine.call("OpenStoreScreen");
}

function OpenCratePurchaseWidget()
{
  if (IsOnline())
  {
    PurchaseWidgetController.ActiveCategory = 1;
    UpdateJSModel(PurchaseWidgetController);
    PushScreen('PurchaseWidget');
  }
  else
  {
    HandleRequireOnline();
  }
}

function OpenCurrencyPurchaseWidget()
{
  if (IsOnline())
  {
	  PurchaseWidgetController.ActiveCategory = 0;
	  UpdateJSModel(PurchaseWidgetController);
	  PushScreen('PurchaseWidget');
  }
  else
  {
	HandleRequireOnline();
  }
}

engine.on("RequestPurchasable", function (version) {
    console.log("engine.on is working");
    SendInventoryRequest(version);
});

engine.on("RequestPremiumTypes", function(version) {
    SendPremiumRequest(version);
});
