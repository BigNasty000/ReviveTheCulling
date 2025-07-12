const JoinMatchSelector = document.getElementById("join-custom-match-menu");

//Add your CSS files here
$('head').append('<link rel="stylesheet" type="text/css" href="css/Screens/JoinCustomMatch.css">');

function JoinCustomMatch()
{
  BaseMenuScreen.call(this);
  this.Selector = JoinMatchSelector;
  this.ActiveMenu = document.getElementById("join-custom-match-keypad");
  this.ScreenActions = [{value:"Select"}, {value:"Back"}];
  this.optionsDirty = false;
  this.ConsoleSpecific = true;
  this.ScreenName = "JoinCustomMatch";
}

JoinCustomMatch.prototype = Object.create(BaseMenuScreen.prototype);
JoinCustomMatch.prototype.constructor = JoinCustomMatch;

var lobbyBinder = rivets.bind($('#lobby-code-input'), {
  LobbyData : LobbyData
});

JoinCustomMatch.prototype.OnShow = function()
{
  this.SetNewActiveMenu(this.ActiveMenu);
  this.ResetFocus();
  BaseMenuScreen.prototype.OnShow.call(this);
}

JoinCustomMatch.prototype.OnCreation = function()
{
  BaseMenuScreen.prototype.OnCreation.call(this);
}


JoinCustomMatch.prototype.OnHide = function()
{
  BaseMenuScreen.prototype.OnHide.call(this);
}

JoinCustomMatch.prototype.OnClosed = function()
{
  BaseMenuScreen.prototype.OnClosed.call(this);
}

JoinCustomMatch.prototype.IncrementSettings = function(direction, setting)
{
  console.log("IncrementSettings: " + setting + " " + direction);
}


JoinCustomMatch.prototype.OnMouseClicked = function(element){
  //console.log(element.dataset.keypadValue);
  // console.log(element);
  if(element.dataset.keypadValue != null)
  {
    this.OnOptionElemSelected(element);
  }
  else {
    this.OnOptionElemSelected(element.parentElement);
  }
}

JoinCustomMatch.prototype.OnOptionElemSelected = function(element)
{
  if(element != undefined && element != null && element.dataset != undefined)
  {
    console.log(element.dataset.keypadValue);
    if(LobbyData.JoinCode == null){
      LobbyData.JoinCode = "";
    }
    if(Number(element.dataset.keypadValue) || element.dataset.keypadValue == 0){
      if(LobbyData.JoinCode.length <= 6 || LobbyData.JoinCode.length == null)
      {
        LobbyData.JoinCode += element.dataset.keypadValue;
      }
    }else if(element.dataset.keypadValue == "DELETE")
    {
      console.log("DELETE");
      LobbyData.JoinCode = LobbyData.JoinCode.slice(0,-1);
    }else if(element.dataset.keypadValue == "GO")
    {
      console.log("GO");
      PushScreen('CustomScreen');
    }
    lobbyBinder.update({LobbyData : LobbyData});
  }
  BaseMenuScreen.prototype.OnOptionElemSelected.call(this, element);
}

JoinCustomMatch.prototype.OnButtonPressed = function(button){
  console.log(document.activeElement.innerHTML);
  if(button == btn_Up)
  {
    this.IncrementSelection(-3);
  }
  else if(button == btn_Down)
  {
    this.IncrementSelection(3);
  }
  else if(button == btn_Right)
  {
    this.IncrementSelection(1);
  }
  else if(button == btn_Left)
  {
    this.IncrementSelection(-1);
  }
  else if(button == btn_Select)
  {
    var focusedItem = this.GetFocusedItem();
    if(focusedItem != undefined)
    {
      this.OnOptionElemSelected(focusedItem);
    }
  }
  else if(button == btn_Back && this.CanPopScreen())
  {
    if(!IsRootScreen())
    {
      PopScreen();
    }
  }
  //BaseMenuScreen.prototype.OnButtonPressed.call(this, button);
}


JoinCustomMatch.prototype.OnKeyPressed = function(keyCode)
{
  if(Number(keyCode) || keyCode == 0){
    if(LobbyData.JoinCode.length <= 6 || LobbyData.JoinCode.length == null)
    {
      LobbyData.JoinCode += keyCode;
    }
  }else if(keyCode == "DELETE"){
    LobbyData.JoinCode = LobbyData.JoinCode.slice(0,-1);
  }
  /*BaseMenuScreen.prototype.OnKeyPressed.call(this, keyCode);
  if(keyCode == keyCodes.U)
  {
    this.UnequipItem();
  }*/
}

JoinCustomMatch.prototype.IncrementSelection = function(direction)
{
  console.log("WeaponsListScreen direction " + direction);
  var currFocus = document.activeElement;
  var menuItems = this.GetMenuItems();
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
    }

  }
  console.log("idx " + idx);
  menuItems[idx].focus();
  this.OnSelectionChanged(menuItems[idx]);
}

//$.extend(JoinCustomMatch.prototype, HorizontalMenuMixin);
Screens['JoinCustomMatch'] = JoinCustomMatch;
