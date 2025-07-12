const PauseMainMenuSelector = document.getElementById("pause-main-menu");

//Add your CSS files here
$('head').append('<link rel="stylesheet" type="text/css" href="css/Screens/PauseMain.css">');

var PauseMainScreenData = {
  Challenges : [],
}

rivets.bind($(PauseMainMenuSelector), {
  screenData : PauseMainScreenData,
  matchData : matchData
});

function PauseMainScreen()
{
  BaseMenuScreen.call(this);
  this.Selector = PauseMainMenuSelector
  this.ActiveMenu = document.getElementById("pause-main-menu-options");
  this.ScreenActions = [{ value: "Select" }];
  this.ScreenName = "PauseMainScreen";

}

PauseMainScreen.prototype = Object.create(BaseMenuScreen.prototype);
PauseMainScreen.prototype.constructor = PauseMainScreen;

PauseMainScreen.prototype.OnCreation = function()
{
    console.log("PauseMainScreen:: OnCreation ");
  BaseMenuScreen.prototype.OnCreation.call(this);

}

PauseMainScreen.prototype.OnShow = function()
{
  engine.call("EnableCoherentInput", true);
  this.SetNewActiveMenu(this.ActiveMenu);
  console.log("PauseMainScreen:: OnShow ");
  BaseMenuScreen.prototype.OnShow.call(this);
}

PauseMainScreen.prototype.OnHide = function()
{
  console.log("PauseMainScreen:: OnHide ");
  BaseMenuScreen.prototype.OnHide.call(this);
}
/*
PauseMainScreen.TogglePauseMenu = function (button)
{
  engine.call("TogglePauseMenu");
}*/

PauseMainScreen.prototype.OnOptionElemSelected = function(elem)
{
  if(elem.dataset && elem.dataset.action)
  {
    if(elem.dataset.action == "Quit")
    {
      var modalArgs = {
        options: ["YES", "CANCEL"],
        title:"Return to Main Menu?",
        bSupportsBackButton: true,
        callback: function(option){
          if(option == "YES")
          {
            engine.call("QuitToMainMenu");
          }
        }
      };

      PushModal('Modal', modalArgs);
    }
  }
  else
  {
    BaseMenuScreen.prototype.OnOptionElemSelected.call(this, elem);
  }
}

PauseMainScreen.prototype.OnButtonPressed = function(button)
{
  console.log(button);
  if(button == btn_Up)
  {
    this.IncrementSelection(-1);
  }
  else if(button == btn_Down)
  {
    this.IncrementSelection(1)
  }
  else if(button == btn_Right)
  {

  }
  else if(button == btn_Left)
  {

  }
  else if(button == btn_Select)
  {
    var focusedItem = this.GetFocusedItem();
    if(focusedItem != undefined)
    {
      this.OnOptionElemSelected(focusedItem);
    }
  }
  else if(button == btn_Back)
  {
    //this.BackButtonAction();
    engine.call("TogglePauseMenu");
  }
  else if(button == btn_Pause)
  {
    engine.call("TogglePauseMenu");
  }
  else if(button == btn_LT)
  {

  }
  else if(button == btn_RT)
  {

  }
}

PauseMainScreen.prototype.OnClosed = function()
{
    console.log("PauseMainScreen:: OnClosed ");
    engine.call("HidePauseMenu");
  BaseMenuScreen.prototype.OnClosed.call(this);
}

//$.extend(PauseMainScreen.prototype, VerticalMenuMixin);

Screens['PauseMain'] = PauseMainScreen;
