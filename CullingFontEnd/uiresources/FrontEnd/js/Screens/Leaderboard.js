const LeaderboardSelector = document.getElementById("leaderboard-main-container");
const LeaderboardNavSelector = document.getElementById("leaderboard-menu-options");

//Add your CSS files here
$('head').append('<link rel="stylesheet" type="text/css" href="css/Screens/Leaderboard.css">');
var bIsAbleToClose = false;
var timeOut = undefined;
function Leaderboard()
{
  BaseMenuScreen.call(this);
  this.Selector = LeaderboardSelector;
  this.ActiveMenu = document.getElementById("leaderboard-menu-options");
  this.ScreenActions = [{value:"Select"}, {value:"Back"}];
  this.optionsDirty = false;
  this.ConsoleSpecific = true;
  this.ScreenName = "Leaderboard";
}

Leaderboard.prototype = Object.create(BaseMenuScreen.prototype);
Leaderboard.prototype.constructor = Leaderboard;



Leaderboard.prototype.OnShow = function()
{
  timeOut = setTimeout(function(){
    console.log("Leaderboard timeOut");
    Leaderboard.SetAbleClose();
  }, 20000);
  engine.call("SetStatsCamera");
  BaseMenuScreen.prototype.OnShow.call(this);

  SendGetLeaderboardRequest();
}

Leaderboard.prototype.OnCreation = function()
{
  BaseMenuScreen.prototype.OnCreation.call(this);
  this.optionsDirty = false;
}

Leaderboard.SetAbleClose = function()
{
  clearTimeout(timeOut);
  console.log("Leaderboard SetAbleClose");
  bIsAbleToClose = true;
}

Leaderboard.prototype.OnHide = function()
{
  if (bIsAbleToClose)
  {
    document.getElementById("loading-leaderboard-container").classList.remove("hidden");
    document.getElementById("leaderboard-menu-options").classList.add("hidden");
    bIsAbleToClose = false;
    BaseMenuScreen.prototype.OnHide.call(this);
  }
}

Leaderboard.prototype.OnClosed = function()
{
  clearTimeout(timeOut);
  if (bIsAbleToClose)
  {
    document.getElementById("loading-leaderboard-container").classList.remove("hidden");
    document.getElementById("leaderboard-menu-options").classList.add("hidden");
    bIsAbleToClose = false;
    BaseMenuScreen.prototype.OnClosed.call(this);
  }
}

Leaderboard.prototype.IncrementSettings = function(direction, setting)
{
  console.log("IncrementSettings: " + setting + " " + direction);

}

Leaderboard.prototype.OnButtonPressed = function(button)
{
  if(button == btn_Left)
  {
    this.IncrementSelection(-1);
  }
  else if(button == btn_Right)
  {
    this.IncrementSelection(1)
  }
  else if(button == btn_Down)
  {
    var focusedItem = this.GetFocusedItem();
    if(focusedItem != undefined)
    {
      if(this.IncrementOnElement != undefined)
      {
        this.IncrementOnElement(focusedItem, 1)
      }
    }
  }
  else if(button == btn_Up)
  {
    var focusedItem = this.GetFocusedItem();
    if(focusedItem != undefined)
    {
      if(this.IncrementOnElement != undefined)
      {
        this.IncrementOnElement(focusedItem, -1)
      }
    }
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
    if(bIsAbleToClose)
    {
      PopScreen();
    }
  }
  else if(button == btn_LT)
  {
    this.IncrementPage(-1);
  }
  else if(button == btn_RT)
  {
    this.IncrementPage(1);
  }
  else if(button == btn_Pause)
  {
    console.log("btn_Pause");
    OpenCurrencyPurchaseWidget();
  }
}

//$.extend(Leaderboard.prototype, HorizontalMenuMixin);
Screens['Leaderboard'] = Leaderboard;
