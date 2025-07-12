const LootboxSelector = document.getElementById("lootbox-menu");

//Add your CSS files here
$('head').append('<link rel="stylesheet" type="text/css" href="css/Screens/Lootbox.css">');

var LootboxScreenData = {
  numAvailableCrates : 0
}

function LootboxScreen()
{
  BaseMenuScreen.call(this);
  this.Selector = LootboxSelector;
  this.ActiveMenu = document.getElementById("lootbox-menu-container");
  this.ScreenActions = [{value:"Select"}, {value:"Back"}];
  this.ScreenName = "Lootbox";
}

LootboxScreen.prototype = Object.create(BaseMenuScreen.prototype);
LootboxScreen.prototype.constructor = LootboxScreen;

rivets.bind($(LootboxSelector), {
  screenData : LootboxScreenData
});

LootboxScreen.prototype.OnShow = function()
{
  BaseMenuScreen.prototype.OnShow.call(this);
  engine.call("SetLootCamera");
}

LootboxScreen.prototype.OnHide = function()
{
  BaseMenuScreen.prototype.OnHide.call(this);
}

LootboxScreen.prototype.OnClosed = function()
{
  BaseMenuScreen.prototype.OnClosed.call(this);
  engine.call("ExitLootCamera");
  var openButton = document.getElementById("open-box-container");
  if(openButton != null)
  {
    openButton.classList.add("hidden");
  }
}

LootboxScreen.prototype.OnCreation = function()
{
  console.log(FooterData.bHasGamepad);
  this.OnShow();
}

LootboxScreen.prototype.OnMenuActionClicked = function(MenuAction){
  if(MenuAction == "OpenBox"){
    console.log("Open Box");
  }
  BaseMenuScreen.prototype.OnMenuActionClicked.call(this, MenuAction);
}

LootboxScreen.prototype.OnButtonPressed = function(button){
  // if(String(button) == "0"){
  //   LootboxScreen.OpenLootBox();
  // }

  if(button == btn_Left)
  {
    this.IncrementSelection(-1);
  }
  else if(button == btn_Right)
  {
    this.IncrementSelection(1);
  }
  else if(button == btn_Down)
  {


  }
  else if(button == btn_Up)
  {

  }
  else if(button == btn_Select)
  {
    console.log(document.activeElement.innerHTML);
    var focusedItem = document.activeElement;
    if(focusedItem != undefined)
    {
      var event = document.createEvent("MouseEvents");
      event.initEvent('mousedown', true, true);
      focusedItem.dispatchEvent(event);
    }
  }
  else if(button == btn_Back && this.CanPopScreen())
  {
    PopScreen();
  }
  else if(button == btn_LT)
  {

  }
  else if(button == btn_RT)
  {

  }
  else if(button == btn_Pause)
  {
    console.log("btn_Pause");
    OpenCurrencyPurchaseWidget();
  }
}

LootboxScreen.OpenLootBox = function(){
  console.log("OpenLootBox, AvailableCrates = " + LootboxScreenData.numAvailableCrates);
  if(LootboxScreenData.numAvailableCrates != 0){
    SendOpenCrateRequest();

    // Set number to zero until we receive a new updated number
    LootboxScreenData.numAvailableCrates = 0;

    PushScreen('LootDisplay');
  }
}

LootboxScreen.ShowOpenCratebutton = function(){
  var openButton = document.getElementById("open-box-container");
  if(openButton != null)
  {
    openButton.classList.remove("hidden");
  } 
}

//$.extend(ProfileScreen.prototype, HorizontalMenuMixin);

Screens['Lootbox'] = LootboxScreen;
