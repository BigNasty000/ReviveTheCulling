const LootDisplaySelector = document.getElementById("lootdisplay-menu");

//Add your CSS files here
$('head').append('<link rel="stylesheet" type="text/css" href="css/Screens/LootDisplay.css">');

var LootDisplayScreenData = {
}
var timeOut = undefined;
//var CanExit = false;

function LootDisplayScreen()
{
  BaseMenuScreen.call(this);
  this.Selector = LootDisplaySelector;
  //this.ActiveMenu = document.getElementById("lootbox-menu-options");
  this.ScreenActions = [{value:"Back"}];
  this.ScreenName = "LootDisplay";
  this.CanExit = false;
}

LootDisplayScreen.prototype = Object.create(BaseMenuScreen.prototype);
LootDisplayScreen.prototype.constructor = LootDisplayScreen;

var lootDataBinder = rivets.bind($(LootDisplaySelector), {
  screenData: LootDisplayScreenData.itemTypesAdded
});

LootDisplayScreen.prototype.OnShow = function()
{
  console.log("LootDisplay OnShow");
  timeOut = setTimeout(function(){
    console.log("LootDisplay timeOut");
    GetActiveScreen().CanExit = true;
  }, 20000);

  BaseMenuScreen.prototype.OnShow.call(this);
  engine.call("SetLootVoidCamera");
}

LootDisplayScreen.prototype.OnHide = function()
{
  this.CanExit = false;
  BaseMenuScreen.prototype.OnHide.call(this);
}

LootDisplayScreen.prototype.OnClosed = function()
{
  clearTimeout(timeOut);
  this.CanExit = false;
  BaseMenuScreen.prototype.OnClosed.call(this);
  engine.call("ExitLootCamera");
  LootDisplayScreen.hideLootLabels();
}

LootDisplayScreen.prototype.OnCreation = function()
{
  this.OnShow();
}

LootDisplayScreen.prototype.OnMenuActionClicked = function(MenuAction)
{
  console.log(this.CanExit);
  if(this.CanExit){
    BaseMenuScreen.prototype.OnMenuActionClicked.call(this, MenuAction);
  }
}

LootDisplayScreen.prototype.OnButtonPressed = function(button)
{
  console.log(this.CanExit);
  if(this.CanExit){
    BaseMenuScreen.prototype.OnButtonPressed.call(this, button);
  }

}

LootDisplayScreen.showLootLabels = function(){
  console.log("show labels");
  console.log("LootDisplay Bind" + JSON.stringify(LootDisplayScreenData.itemTypesAdded));
  if(GetActiveScreen().ScreenName == "LootDisplay")
  {
    document.getElementById("loot-container").classList.remove("hidden");
  }
  GetActiveScreen().CanExit = true;
}

LootDisplayScreen.hideLootLabels = function(){
  document.getElementById("loot-container").classList.add("hidden");
  GetActiveScreen().CanExit = false;
}

LootDisplayScreen.rebindLabels = function(data)
{
  LootDisplayScreenData = data;
  console.log("LootDisplay Bind" + JSON.stringify(LootDisplayScreenData.itemTypesAdded));
  lootDataBinder.update({screenData: LootDisplayScreenData.itemTypesAdded});
}
//$.extend(ProfileScreen.prototype, HorizontalMenuMixin);

Screens['LootDisplay'] = LootDisplayScreen;
