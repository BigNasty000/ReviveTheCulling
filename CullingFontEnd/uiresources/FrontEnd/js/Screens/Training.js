//Add your CSS files here
$('head').append('<link rel="stylesheet" type="text/css" href="css/Screens/Training.css">');


function TrainingScreen()
{
  BaseMenuScreen.call(this);
  this.Selector = document.getElementById("training-menu");
  this.ActiveMenu = document.getElementById("training-menu-options");
  this.ScreenActions = [{value:"Select"}, {value:"Back"}];
}

TrainingScreen.prototype = Object.create(BaseMenuScreen.prototype);
TrainingScreen.prototype.constructor = TrainingScreen;

TrainingScreen.prototype.OnShow = function()
{
  BaseMenuScreen.prototype.OnShow.call(this);
  engine.call("SetPlayCamera");
}

TrainingScreen.prototype.OnOptionElemSelected = function(elem)
{
  if(elem.dataset && elem.dataset.training)
  {
      console.log("elem.dataset.training = " + elem.dataset.training);
    switch(elem.dataset.training)
    {
      case "basic":
        engine.call("StartTraining", "Tutorial");
        break;
      case "practice":
        engine.call("StartTraining", "Practice");
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

$.extend(TrainingScreen.prototype, HorizontalMenuMixin);

Screens['Training'] = TrainingScreen;
