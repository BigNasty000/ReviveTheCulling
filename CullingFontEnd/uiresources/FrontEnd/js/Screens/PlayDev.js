//Add your CSS files here
$('head').append('<link rel="stylesheet" type="text/css" href="css/Screens/Play.css">');


function PlayScreenDev()
{
  BaseMenuScreen.call(this);
  this.Selector = document.getElementById("play-menu-dev");
  this.ActiveMenu = document.getElementById("play-menu-devoptions");
  this.ScreenActions = [{value:"Select"}, {value:"Back"}];
}

PlayScreenDev.prototype = Object.create(BaseMenuScreen.prototype);
PlayScreenDev.prototype.constructor = PlayScreenDev;

PlayScreenDev.prototype.OnShow = function()
{
  BaseMenuScreen.prototype.OnShow.call(this);
  engine.call("SetPlayCamera");
}

PlayScreenDev.prototype.OnCreation = function()
{
    console.log("PlayScreenDev::OnCreationt: ");
  this.OnShow();
}

PlayScreenDev.prototype.OnHide = function()
{
  BaseMenuScreen.prototype.OnHide.call(this);
}

PlayScreenDev.prototype.OnClosed = function()
{
  BaseMenuScreen.prototype.OnClosed.call(this);
}


PlayScreenDev.prototype.OnOptionElemSelected = function(elem)
{
  if (Matchmaking.CanStartMatching())
  {
    if(elem.dataset && elem.dataset.pushScreen)
    {
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
}

$.extend(PlayScreenDev.prototype, VerticalMenuMixin);
console.log(" Screens['PlayDev'] = PlayScreenDev  ");
Screens['PlayDev'] = PlayScreenDev;
