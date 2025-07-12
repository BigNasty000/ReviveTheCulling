var Screens = {};
var ActiveScreen = {};
var ScreenStack = [];
var ModalStack = [];
const btn_Up = 12;
const btn_Down = 13;
const btn_Left = 14;
const btn_Right = 15;
const btn_Select = 0;
const btn_Back = 1;
const btn_Pause = 9;
const btn_Invite = 2;
const btn_Y = 3;
const btn_LT = 6;
const btn_RT = 7;

const keyCodes = {
  Enter : 13,
  Escape : 27,
  Space: 32,
  Left: 37,
  Up: 38,
  Right: 39,
  Down: 40,
  I: 73,
  U: 85,
  Tab: 9
};

var FooterData = {
  Actions : {},
  bHasGamepad : true,
  shouldShowAction : function(action){
    var result = IsActionVisibleForInput(action);
    return result;
  },
  shouldHideAction : function(action){
    return !this.shouldShowAction(action);
  },
  getActionClasses : function(){
    if(this.bHasGamepad)
    {
      return "control-icon controller";
    }
    else
    {
      return "control-icon kbm";
    }
  },
  getActionSymbol : function(action){
    var symbol = GetSymbolForAction(action);
    //console.log("getActionSymbol: " + symbol + " for action: " + action);
    return symbol;
  },
  getActionLabel : function(action){
    //TODO: localization hook
    return GetLabelForAction(action);
  },
  isActionClickable : function(action){
    return IsActionClickable(action) && !this.bHasGamepad;
  },
  getInviteLabel : function(){
    return GetLabelForAction("InvitePlayer");
  },
  getInviteSymbol : function(){
    return GetSymbolForAction("InvitePlayer");
  }
}

/*
A Screen should have:
  -Selector
  -FocusElem
  -OnButtonPressed
  -OnShow
  -OnHide
  -OnCreation
  -OnClosed
  -Prolly other stuff

*/

function GetActiveScreen()
{
  if(ScreenStack.length > 0){
  //console.log("ScreenStack " + ScreenStack[0] + ScreenStack.length);

    return ScreenStack[ScreenStack.length - 1];
  }

  return undefined;
}

function GetActiveModal()
{
  if(ModalStack.length > 0){
    return ModalStack[ModalStack.length - 1];
  }

  return undefined;
}

function PushScreen(screen, args)
{
  console.log("screen " + screen);
  if(GetActiveScreen() != undefined)
  {
    GetActiveScreen().OnHide();
  }

  ScreenStack.push(new Screens[screen](args));
  GetActiveScreen().OnCreation();
}

function PushModal(screen, args)
{
  if(GetActiveModal())
  {
    GetActiveModal().OnHide();
  }
  else if(GetActiveScreen())
  {
    GetActiveScreen().OnModalShowing();
  }
  ModalStack.push(new Screens[screen](args));
  GetActiveModal().OnCreation();
}

function PopScreen()
{
  console.log("PopScreen()");
  console.log(GetActiveScreen().ScreenName);
  GetActiveScreen().OnClosed();
  ScreenStack.pop();

  if(GetActiveScreen() != undefined)
  {
    GetActiveScreen().OnShow();
  }
  else
  {
    //TODO: We're being told to back out of all screens, so do something maybe?
  }
}

function PopModal()
{
  if(GetActiveModal())
  {
    GetActiveModal().OnClosed();
    ModalStack.pop();

    if(GetActiveModal())
    {
      GetActiveModal().OnShow();
    }
    else if(GetActiveScreen())
    {
      GetActiveScreen().OnModalClosing();
    }
  }
}

function GetScreenBelow()
{
    if(ScreenStack.length > 1)
    {
      return ScreenStack[ScreenStack.length - 2];
    }

    return undefined;
}

function OnMouseClicked(element)
{
  console.log("element " + element);
  if(GetActiveModal() != undefined)
  {
    GetActiveModal().OnMouseClicked(element);
  }
  else if(GetActiveScreen() != undefined)
  {
    GetActiveScreen().OnMouseClicked(element);
  }
}

function OnFocusOut(event)
{
  if(GetActiveModal() != undefined)
  {
    GetActiveModal().OnFocusOut(event);
  }
  else if(GetActiveScreen() != undefined)
  {
    GetActiveScreen().OnFocusOut(event);
  }
}

function OnMouseHover(element)
{
  if(GetActiveModal() != undefined)
  {
    GetActiveModal().OnMouseHover(element);
  }
  else if(GetActiveScreen() != undefined)
  {
    GetActiveScreen().OnMouseHover(element);
  }
}

function OnButtonPressed(button)
{
  console.log("Controller pressed button " + button);

  if(GetActiveModal() != undefined)
  {
    console.log("Modal");
    GetActiveModal().OnButtonPressed(button);
  }
  else if(GetActiveScreen() != undefined)
  {
    console.log("ScreenHolder OnButtonPressed: " + button);
    GetActiveScreen().OnButtonPressed(button);
    console.log(GetActiveScreen());
  }
  //window[controllerData.handler](button);
}

function IsRootScreen()
{
  return (ScreenStack.length <= 1);
}

function SetScreenActions(Actions)
{
  console.log("Setting new actions: " + JSON.stringify(Actions));
  console.log("footerdata" + JSON.stringify(FooterData));
  if(Actions == undefined || Actions.length == 0)
  {
    document.getElementById("controls-footer").classList.add("hidden");
    return;
  }

  /*
  if(Actions.length == FooterData.Actions.length)
  {
    var dirty = false;
    for(var i = 0; i < FooterData.Actions.length; ++i)
    {
      console.log("Testing: " + FooterData.Actions[i] + " vs " + Actions[i]);
      if(FooterData.Actions[i] != Actions[i])
      {
        dirty = true;
        break;
      }
    }

    if(dirty != true)
    {
      console.log("Early out");
      return;
    }
  }
  */


  //FooterData.Actions = [];
  //console.log("Setting new Screen Actions: " + JSON.stringify(Actions));
  FooterData.Actions = Actions;
  document.getElementById("controls-footer").classList.remove("hidden");
}

function OnMenuActionClicked(element)
{
  console.log("element " + element);
  console.log("element 2 " + JSON.stringify(element.dataset) + " and " + element.dataset.menuAction);
  if(element && element.dataset && element.dataset.menuAction)
  {
    if(GetActiveScreen() != undefined)
    {

      GetActiveScreen().OnMenuActionClicked(element.dataset.menuAction)
    }
  }
}

//function InitKeyboardEventListener()
//{
// document.addEventListener("keydown", function (args) {
//   console.log("keydown " + args.keyCode);
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
//     OnInvitePressed();
//   }
//   else if(args.keyCode === keyCodes.Tab){
//     OnButtonPressed(btn_Y);
//   }
//   else if(GetActiveScreen() != undefined && GetActiveModal() == undefined)
//   {
//     GetActiveScreen().OnKeyPressed(args.keyCode);
//   }
// });
//}

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

//function ControllerPollingLoop()
//{
//  //console.log("ControllerPollingLoop");
//  var bUpdateTimestamp = false;
//  var gamepads = navigator.getGamepads();
//  var bDirtiedAxis = false;
//
//  if (gamepads.length > 0) {
//    var gamePad = gamepads[0];
//    axisDelay++;
//    if(Math.abs(gamePad.axes[0]) < axisThreshhold && Math.abs(gamePad.axes[1]) < axisThreshhold)
//    {
//      axisDelay = axisTimeout;
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
//            console.log("GAMEPADBUTTON: " + button);
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
//    /*else
//  {
//    SetHasGamepad(false);
//  }
//
//  if(GetActiveScreen() != undefined && GetActiveScreen().Selector.id == "EOMContainer"){
//    console.log("EOMContainer");
//    EndOfMatchScreen.ControllerCheck();
//  }*/
//
//  window.requestAnimationFrame(ControllerPollingLoop);
//}

function SetHasGamepad(HasGamepad)
{
  if(FooterData.bHasGamepad != HasGamepad)
  {
    console.log("bIsConsole: " + matchData.bIsConsole);
    if(matchData.bIsConsole)
    {
      FooterData.bHasGamepad = true;
    }
    else {
      FooterData.bHasGamepad = HasGamepad;
    }

    if(FooterData.bHasGamepad)
    {
      console.log(FooterData.bHasGamepad);
      OnControllerConnected();
    }
    else
    {
      console.log(FooterData.bHasGamepad);
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

engine.on("OnRequestUnpause", function(force){
  if((IsRootScreen() || force == true) && GetActiveModal() == undefined){
    while(ScreenStack.length > 0)
    {
      PopScreen();
    }
    console.log("C++ Requested Unpause and we're at the root screen - unpausing");
    //engine.call("HidePauseMenu");
    ShowPauseMenu(force);
  }

});

rivets.formatters.formatMenuActionName = function(value){
  return ActionToDisplayText(value);
}

rivets.formatters.formatActionButton = function(value){
  if(FooterData.bHasGamepad)
  {
    return ActionToCullDing(value);
  }

  return ActionToKBM(value); //TODO: GET KEY
}

rivets.formatters.not = function(value){
  return !value;
}

rivets.formatters.equals = function(value, otherValue)
{
  return value == otherValue;
}

rivets.formatters.empty = function(value){
  return (value == undefined || (value.length != undefined && value.length == 0));
}

document.onclick = function(event){
  console.log("Event " + event.target);
  if(event && event.type == "click")
  {
    OnMouseClicked(event.target);
    event.stopImmediatePropagation();
   event.preventDefault();
  }
}

$(document).on("keydown", function(e){
  SetHasGamepad(false);
});

//This prevents clicks from causing focus to be lost
$(document).on('mousedown', function(e) {
  SetHasGamepad(false);
  if(e.which == 3)
  {
    if(GetActiveScreen() != undefined && GetActiveModal() == undefined)
    {
      GetActiveScreen().OnMenuActionClicked("Back");
    }
  }
  e.stopImmediatePropagation();
 e.preventDefault();
   //OnFocusOut(e);
 });

$('li').hover(function(event){
  if(event)
  {
    OnMouseHover(event.target);
  }
});

engine.on('OnUpKeyPressed', function (bIsGamepadKey) {
    console.log("OnUpKeyPressed");
    if (bIsGamepadKey) {
        SetHasGamepad(true);
    }
    else {
        SetHasGamepad(false);
    }
    OnButtonPressed(btn_Up);
});

engine.on('OnDownKeyPressed', function (bIsGamepadKey) {
    console.log("OnDownKeyPressed");
    if (bIsGamepadKey) {
        SetHasGamepad(true);
    }
    else {
        SetHasGamepad(false);
    }
    OnButtonPressed(btn_Down);
});

engine.on('OnLeftKeyPressed', function (bIsGamepadKey) {
    console.log("OnLeftKeyPressed");
    if (bIsGamepadKey) {
        SetHasGamepad(true);
    }
    else {
        SetHasGamepad(false);
    }
    OnButtonPressed(btn_Left);
});

engine.on('OnRightKeyPressed', function (bIsGamepadKey) {
    console.log("OnRightKeyPressed");
    if (bIsGamepadKey) {
        SetHasGamepad(true);
    }
    else {
        SetHasGamepad(false);
    }
    OnButtonPressed(btn_Right);
});

engine.on('OnSelectKeyPressed', function (bIsGamepadKey) {
    console.log("OnSelectKeyPressed");
    if (bIsGamepadKey) {
        SetHasGamepad(true);
    }
    else {
        SetHasGamepad(false);
    }
    OnButtonPressed(btn_Select);
});

engine.on('OnBackKeyPressed', function (bIsGamepadKey) {
    console.log("OnBackKeyPressed");
    if (bIsGamepadKey) {
        SetHasGamepad(true);
    }
    else {
        SetHasGamepad(false);
    }
    OnButtonPressed(btn_Back);
});

engine.on('OnStartSpectateKeyPressed', function (bIsGamepadKey) {
    console.log("OnStartSpectateKeyPressed");
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
