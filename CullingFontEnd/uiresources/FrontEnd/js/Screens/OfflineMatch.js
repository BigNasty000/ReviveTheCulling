//Add your CSS files here
$('head').append('<link rel="stylesheet" type="text/css" href="css/Screens/OfflineMatch.css">');


function OfflineMatch()
{
  BaseMenuScreen.call(this);
  this.Selector = document.getElementById("offline-menu");
  this.ActiveMenu = document.getElementById("offline-menu-options");
  this.ScreenActions = [{value:"Select"}, {value:"Back"}];
}

OfflineMatch.prototype = Object.create(BaseMenuScreen.prototype);
OfflineMatch.prototype.constructor = OfflineMatch;

OfflineMatch.prototype.OnShow = function()
{
  BaseMenuScreen.prototype.OnShow.call(this);
  engine.call("SetPlayCamera");
}

OfflineMatch.prototype.OnOptionElemSelected = function(elem)
{
  if(elem.dataset && elem.dataset.training)
  {
    console.log("OfflineMatch::OnOptionElemSelected::  " + elem.dataset.training)
    switch(elem.dataset.training)
    {
      case "jungle":
          engine.call("StartOfflineMatch", 0);
        break;
      case "prison":
          engine.call("StartOfflineMatch", 1);
        break;
    }
  }
  else
  {
    BaseMenuScreen.prototype.OnOptionElemSelected.call(this, elem);
  }
}

$.extend(OfflineMatch.prototype, HorizontalMenuMixin);

Screens['Offline'] = OfflineMatch;
