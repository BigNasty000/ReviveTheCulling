const SettingsControlsSelector = document.getElementById("settings-controls-menu-options");
const SettingsControlsNavSelector = document.getElementById("controls-nav-options");

//Add your CSS files here
$('head').append('<link rel="stylesheet" type="text/css" href="css/Screens/SettingsControls.css">');

var ControllerSettings = {
  Layout : 0,
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

rivets.bind($(SettingsControlsSelector), {
  ActionMapData: ActionMapData,
  KeyBindMessageData : KeyBindMessageData,
  ControllerSettings : ControllerSettings,
  FooterData : FooterData
});

rivets.bind($(SettingsControlsNavSelector), {
  FooterData : FooterData
});


function SettingsControls()
{
  BaseMenuScreen.call(this);
  this.Selector = document.getElementById("settings-controls-menu");
  this.ActiveMenu = document.getElementById("controller-setup-container");
  this.ScreenActions = [{value:"Select"}, {value:"Back"}];
  this.optionsDirty = false;
  this.TabNavigation = document.getElementById("controls-nav-tab-options").getElementsByClassName('controls-nav-tab');
  this.ConsoleSpecific = true;
  this.ScreenName = "SettingsControls";
}

SettingsControls.prototype = Object.create(BaseMenuScreen.prototype);
SettingsControls.prototype.constructor = SettingsControls;

SettingsControls.prototype.OnShow = function()
{
  if(ClientwebData.bIsConsole)
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

SettingsControls.prototype.OnCreation = function()
{
  BaseMenuScreen.prototype.OnCreation.call(this);
  this.optionsDirty = false;
  this.RefreshSettingsData();
}


SettingsControls.prototype.OnHide = function()
{
  BaseMenuScreen.prototype.OnHide.call(this);
}

SettingsControls.prototype.OnClosed = function()
{
  this.ResetTabFocus();
  BaseMenuScreen.prototype.OnClosed.call(this);
}

SettingsControls.prototype.MouseTabClick = function(elem)
{
  BaseMenuScreen.prototype.MouseTabClick.call(this, elem);
}

SettingsControls.prototype.IncrementSettings = function(direction, setting)
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

SettingsControls.prototype.OnMouseClicked = function(elem)
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

SettingsControls.prototype.IncrementOnElement = function(elem, direction)
{
    if(this.HasMenuItemElem(elem) && elem.dataset != undefined && elem.dataset.pickerConfigVar != undefined)
    {
        var pickerConfigVar = elem.dataset.pickerConfigVar;
        this.IncrementSettings(direction, pickerConfigVar);
    }
}

SettingsControls.prototype.CanPopScreen = function()
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

SettingsControls.prototype.RefreshSettingsData = function()
{
  engine.call("GetControllerSettings").then($.proxy(function(result){
    console.log("Got Settings Data: " + JSON.stringify(result));
    this.OnGetSettingsData(result);
  },this));
}

SettingsControls.prototype.OnGetSettingsData = function(settingsData)
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

$.extend(SettingsControls.prototype, VerticalMenuMixin);
//$.extend(CustomScreen.prototype, HorizontalMenuMixin);
Screens['SettingsControls'] = SettingsControls;
