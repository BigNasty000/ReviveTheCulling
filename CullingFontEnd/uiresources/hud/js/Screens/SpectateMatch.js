const SpectateSelector = document.getElementById("SpectateContainer");

//Add your CSS files here
$('head').append('<link rel="stylesheet" type="text/css" href="css/Screens/EndOfMatch.css">');
var bSpectateScreen = false;
function SpectateScreen()
{
  BaseMenuScreen.call(this);
  this.Selector = SpectateSelector;
  //this.ActiveMenu = document.getElementById("endofmatch-tab-navigation");
  this.bIsVictory;
  /*this.ScreenActions = [{ value: "MatchSummary" }];*/
  this.ScreenName = "SpectateScreen";
}

SpectateScreen.prototype = Object.create(BaseMenuScreen.prototype);
SpectateScreen.prototype.constructor = SpectateScreen;
rivets.bind($('#SpectateContainer'), {
    FooterData: FooterData
});

SpectateScreen.prototype.OnCreation = function()
{
  BaseMenuScreen.prototype.OnCreation.call(this);
}

SpectateScreen.prototype.OnShow = function()
{
    engine.call("EnableCoherentInput", false);
    bSpectateScreen = true;
    console.log('Spectate OnShow');
    engine.call('OnHUDCloseDeathScreen');
    BaseMenuScreen.prototype.OnShow.call(this);
}

SpectateScreen.prototype.OnHide = function()
{
    bSpectateScreen = false;
    BaseMenuScreen.prototype.OnHide.call(this);
}

SpectateScreen.GoToSummaryScreen = function(){
  engine.call("ShowMatchReport");
}
/*
SpectateScreen.GoToPauseScreen = function(){
  console.log("SpectateScreen.GoToPauseScreen");
  engine.call("ShowPauseMenu");
}*/

SpectateScreen.prototype.OnClosed = function()
{
    console.log('Spectate OnClosed');
    bSpectateScreen = false;
    BaseMenuScreen.prototype.OnClosed.call(this);
}

SpectateScreen.prototype.OnMouseClicked = function(elem)
{
  console.log("SpectateMatch OnMouseClicked: " + elem);
  //BaseMenuScreen.prototype.OnMouseClicked.call(this, elem);
}

SpectateScreen.prototype.OnButtonPressed = function (button)
{
    //console.log("SpectateScreen: " + button);
    //switch(String(button))
    //{
    //  case "3":
    //    SpectateScreen.GoToSummaryScreen();
    //    break;
    //}
}
/*
SpectateScreen.prototype.OnMenuActionClicked = function(MenuAction)
{
  console.log("SpectateMatch OnMenuActionClicked: " + MenuAction);
  //BaseMenuScreen.prototype.OnMenuActionClicked.call(this, elem);
}
*/
engine.on("ShowMatchSummary", function () {

    console.log('engine on ShowMatchSummary');
    if (bSpectateScreen)
    {
        PopScreen();
    }
});


Screens['SpectateMatch'] = SpectateScreen;
