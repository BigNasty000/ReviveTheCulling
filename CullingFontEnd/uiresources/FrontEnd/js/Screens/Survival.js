//Add your CSS files here
$('head').append('<link rel="stylesheet" type="text/css" href="css/Screens/Survival.css">');


function SurvivalScreen()
{
  BaseMenuScreen.call(this);
  this.Selector = document.getElementById("survival-menu");
  this.ActiveMenu = document.getElementById("survival-menu-options");
  this.ScreenActions = [{value:"Select"}, {value:"Back"}];
}

SurvivalScreen.prototype = Object.create(BaseMenuScreen.prototype);
SurvivalScreen.prototype.constructor = SurvivalScreen;

SurvivalScreen.prototype.OnShow = function()
{
  BaseMenuScreen.prototype.OnShow.call(this);
  engine.call("SetPlayCamera");
}

SurvivalScreen.prototype.OnOptionElemSelected = function(elem)
{
  if(elem.dataset && elem.dataset.training)
  {
      console.log("elem.dataset.training = " + elem.dataset.training);
    switch(elem.dataset.training)
    {
      case "survivalbasic":
        engine.call("StartTraining", "SurvivalBasic");
        break;
      case "survivaladvanced":
        engine.call("StartTraining", "SurvivalAdvanced");
        break;
      //case "Offline":
      //  engine.call("StartOfflineMatch", 0);
      //  break;
    }
  }
  else
  {
    BaseMenuScreen.prototype.OnOptionElemSelected.call(this, elem);
  }
}

$.extend(SurvivalScreen.prototype, HorizontalMenuMixin);

Screens['Survial'] = SurvivalScreen;
