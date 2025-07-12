const PauseControlsMenuSelector = document.getElementById("pause-controls-menu");
const SettingsControlsNavSelector = document.getElementById("controls-nav-options");
//Add your CSS files here
$('head').append('<link rel="stylesheet" type="text/css" href="css/Screens/PauseControls.css">');

/*
var PauseControlsScreenData = {
  Challenges : [],
}

rivets.bind($(PauseControlsMenuSelector), {
  screenData : PauseControlsScreenData,
});
*/

var ControllerSettings = {
  Layout : 1,
  LookSenHor : 0,
  LookSenVert : 0,
  InvertHor : 0,
  InvertVert : 0,
  Vibration : 0,
  AimSenAst : 0,
  AimRotAst : 0,
  RotAstDur: 0,
  IrnSgtSen : 0
}

rivets.bind($('#pause-controls-menu'),{
  ActionMapData: ActionMapData,
  KeyBindMessageData : KeyBindMessageData,
  ControllerSettings : ControllerSettings,
  FooterData : FooterData
});

rivets.bind($(SettingsControlsNavSelector), {
  FooterData : FooterData
});


function PauseControlsScreen()
{
  BaseMenuScreen.call(this);
  this.Selector = PauseControlsMenuSelector;
  this.ActiveMenu = document.getElementById("controller-table");
  this.ScreenActions = [{value:"Select"}, {value:"Back"}];
  this.optionsDirty = false;
  this.TabNavigation = document.getElementById("controls-nav-tab-options").getElementsByClassName('controls-nav-tab');
  this.ConsoleSpecific = true;
  this.ScreenName = "PauseControlsScreen";
}

PauseControlsScreen.prototype = Object.create(BaseMenuScreen.prototype);
PauseControlsScreen.prototype.constructor = PauseControlsScreen;

PauseControlsScreen.prototype.OnCreation = function()
{
  console.log(JSON.stringify(FooterData));
  this.optionsDirty = false;
  this.RefreshSettingsData();
  BaseMenuScreen.prototype.OnCreation.call(this);
}

PauseControlsScreen.prototype.OnShow = function()
{
  if(matchData.bIsConsole)
  {
    this.ConsoleSpecific = false;
    document.getElementById('controller-setup-container').classList.remove("hidden");
    SettingsControlsNavSelector.classList.add("hidden");
  }
  else{
    this.SetTabFocus(this.TabNavigation[0].id);
  }
  BaseMenuScreen.prototype.OnShow.call(this);
}

PauseControlsScreen.prototype.OnHide = function()
{
  BaseMenuScreen.prototype.OnHide.call(this);
}

PauseControlsScreen.prototype.OnOptionElemSelected = function(elem)
{
  if(elem.dataset && elem.dataset.startOffline)
  {

  }
  else
  {
    BaseMenuScreen.prototype.OnOptionElemSelected.call(this, elem);
  }
}

PauseControlsScreen.prototype.OnClosed = function()
{
  this.ResetTabFocus();
  BaseMenuScreen.prototype.OnClosed.call(this);
}

PauseControlsScreen.prototype.MouseTabClick = function(elem)
{
  BaseMenuScreen.prototype.MouseTabClick.call(this, elem);
}

PauseControlsScreen.prototype.OnButtonPressed = function(button)
{
  console.log("PauseControlsScreen: " + button);
  switch(String(button))
  {
    case "12":
      PauseControlsScreen.SetActivePlayer(-1)
      break;
    case "13":
      PauseControlsScreen.SetActivePlayer(1)
      break;
  }
  //BaseMenuScreen.prototype.OnButtonPressed.call(this, button);
}


PauseControlsScreen.prototype.IncrementSettings = function(direction, setting)
{
  console.log("IncrementSettings: " + setting + " " + direction);
  var setter = "";

  switch(setting)
  {
    case "Layout":
      setter = "IncrementLayout"
      break;
    case "LookSenHor":
      setter = "IncrementLookSensitivityHorizontal"
      break;
    case "LookSenVert":
      setter = "IncrementLookSensitivityVertical"
      break;
    case "InvertHor":
      setter = "ToggleInvertHorizontal"
      break;
    case "InvertVert":
      setter = "ToggleInvertVertical"
      break;
    case "Vibration":
      setter = "ToggleVibration"
      break;
    case "AimSenAst":
      setter = "IncrementSensitivityAssist"
      break;
    case "AimRotAst":
      setter = "IncrementRotationalAssist"
      break;
    case "RotAstDur":
      setter = "IncrementRotationalAssistLockDuration"
      break;
    case "IrnSgtSen":
      setter = "IncrementIronSightSensitivity"
      break;
  }

  this.optionsDirty = true;

  engine.call(setter, direction).then($.proxy(function(){
    this.RefreshSettingsData();
  },this));
}

PauseControlsScreen.prototype.OnMouseClicked = function(elem)
{
  if(elem.dataset && elem.dataset.picker)
  {
    console.log("Elem Clicked: " + elem.nodeName);
    if(this.HasMenuItemElem(elem))
    {
      var parent = this.GetAbsoluteMenuItemElem(elem);
      if(parent.dataset && parent.dataset.pickerConfigVar)
      {
        var direction = elem.dataset.picker;
        var configVar = parent.dataset.pickerConfigVar;
        var numDir = direction == "right" ? 1 : -1;
        console.log("Picker clicked " + direction + " to change " + configVar + " (" + numDir + ")");
        this.IncrementSettings(numDir, configVar);
      }
      else
      {
        console.warn("Picker element parent (" + parent.nodeName + ") missing dataset vars " + JSON.stringify(parent.dataset));
      }
    }
    else
    {
      console.warn("Clicked a picker element that isn't apart of current Screen");
    }
  }

  BaseMenuScreen.prototype.OnMouseClicked.call(this, elem);
}

PauseControlsScreen.prototype.IncrementOnElement = function(elem, direction)
{
    if(this.HasMenuItemElem(elem) && elem.dataset != undefined && elem.dataset.pickerConfigVar != undefined)
    {
        var pickerConfigVar = elem.dataset.pickerConfigVar;
        this.IncrementSettings(direction, pickerConfigVar);
    }
}

PauseControlsScreen.prototype.CanPopScreen = function()
{
  if(this.optionsDirty)
  {
    var modalArgs = {
      options: ["OK", "Cancel"],
      title:"Apply Modified Settings?",
      bSupportsBackButton: false,
      callback: function(option){
        if(option == "OK")
        {
            engine.call("ApplySettings");

        }
        else
        {
          engine.call("RevertSettings");
        }
        PopScreen();
      }
    };

    PushModal('Modal', modalArgs);
    return false;
  }

  return true;
}

PauseControlsScreen.prototype.RefreshSettingsData = function()
{
  engine.call("GetControllerSettings").then($.proxy(function(result){
    console.log("Got Settings Data: " + JSON.stringify(result));
    this.OnGetSettingsData(result);
  },this));
}

PauseControlsScreen.prototype.OnGetSettingsData = function(settingsData)
{
  console.log("Got SettingsData: " + JSON.stringify(settingsData));

  //Set these one by one, so we don't overwrite the rivets binding code
  ControllerSettings.Layout = settingsData.Layout;
  ControllerSettings.LookSenHor = settingsData.LookSenHor;
  ControllerSettings.LookSenVert = settingsData.LookSenVert;
  ControllerSettings.InvertHor = settingsData.InvertHor;
  ControllerSettings.InvertVert = settingsData.InvertVert;
  ControllerSettings.Vibration = settingsData.Vibration;
  ControllerSettings.AimSenAst = settingsData.AimSenAst;
  ControllerSettings.AimRotAst = settingsData.AimRotAst;
  ControllerSettings.RotAstDur = settingsData.RotAstDur;
  ControllerSettings.IrnSgtSen = settingsData.IrnSgtSen;
}

$.extend(PauseControlsScreen.prototype, VerticalMenuMixin);

Screens['PauseControls'] = PauseControlsScreen;
