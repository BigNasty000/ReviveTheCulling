const PauseGameplaySelector = document.getElementById("pause-gameplay-menu");

//Add your CSS files here
$('head').append('<link rel="stylesheet" type="text/css" href="css/Screens/PauseGameplay.css">');

var PauseGameplaySettingsScreenData = {
    //Region : "", //This shouldn't appear in-game, only in FrontEnd
    mouseSensitivity : 36,
    invertY : 0,
    smoothMouse : 0,
    showPing : 0,
    fov : 74,
    showWeaponTooltips: 1,
    masterVolume : 1,
    musicVolume: 1,
    teamChat: 1,
    proximityChat: 1,
    showDamageNumbers: 1,
	showInGameHUD: 1
}

rivets.bind($(PauseGameplaySelector), {
  screenData : PauseGameplaySettingsScreenData,
  matchData : matchData
});

function PauseGameplayScreen()
{
  BaseMenuScreen.call(this);
  this.Selector = PauseGameplaySelector;
  this.ActiveMenu = document.getElementById("pause-gameplay-menu-options");
  this.ScreenActions = [{value:"Select"}, {value:"Back"}];
  this.optionsDirty = false;
  this.ScreenName = "PauseGameplayScreen";
}

PauseGameplayScreen.prototype = Object.create(BaseMenuScreen.prototype);
PauseGameplayScreen.prototype.constructor = PauseGameplayScreen;

PauseGameplayScreen.prototype.RefreshSettingsData = function()
{
  engine.call("GetGameplaySettings").then($.proxy(function(result){
    console.log("Got Settings Data: " + JSON.stringify(result));
    this.OnGetSettingsData(result);
  },this));
}

PauseGameplayScreen.prototype.OnCreation = function()
{
  console.log("PauseGamepay OnCreation");
  BaseMenuScreen.prototype.OnCreation.call(this);
  this.optionsDirty = false;
  this.RefreshSettingsData();
}

PauseGameplayScreen.prototype.OnShow = function()
{
  this.SetNewActiveMenu(this.ActiveMenu);

  BaseMenuScreen.prototype.OnShow.call(this);
}

PauseGameplayScreen.prototype.OnHide = function()
{
  BaseMenuScreen.prototype.OnHide.call(this);
}

PauseGameplayScreen.prototype.OnOptionElemSelected = function(elem)
{
  BaseMenuScreen.prototype.OnOptionElemSelected.call(this, elem);
}

PauseGameplayScreen.prototype.OnMouseClicked = function(elem)
{
  if(elem.dataset && elem.dataset.picker)
  {
    console.log("Elem Clicked: " + elem.nodeName);
    var parent = this.GetAbsoluteMenuItemElem(elem);
    if (parent == undefined) {
        parent = elem.parentElement;
    }

    if (parent != undefined)
    {
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

PauseGameplayScreen.prototype.IncrementSettings = function(direction, setting)
{
  console.log("IncrementSettings: " + setting + " " + direction);
  var setter = "";

  switch(setting)
  {
    case "mouseSensitivity":
      setter = "IncrementMouseSensitivity"
      break;
    case "invertY":
      setter = "IncrementYAxis"
      break;
    case "smoothMouse":
      setter = "IncrementSmoothMouse"
      break;
    case "showPing":
      setter = "IncrementShowPing"
      break;
    case "fov":
      setter = "IncrementFOV"
      break;
    case "showWeaponTooltips":
      setter = "IncrementShowTooltips"
      break;
    case "masterVolume":
        setter = "IncrementMasterVolume"
        break;
    case "musicVolume":
        setter = "IncrementMusicVolume"
        break;
    case "teamChat":
        setter = "IncrementTeamChat"
        break;
    case "proximityChat":
        setter = "IncrementProximityChat"
        break;
    case "showDamageNumbers":
        setter = "ToggleDamageNumbers"
        break;
	case "showInGameHUD":
		setter = "ToggleShowInGameHUD"
		break;
  }

  this.optionsDirty = true;

  engine.call(setter, direction).then($.proxy(function(){
    this.RefreshSettingsData();
  },this));
}

PauseGameplayScreen.prototype.IncrementOnElement = function(elem, direction)
{
    if(this.HasMenuItemElem(elem) && elem.dataset != undefined && elem.dataset.pickerConfigVar != undefined)
    {
        var pickerConfigVar = elem.dataset.pickerConfigVar;
        this.IncrementSettings(direction, pickerConfigVar);
    }
}

PauseGameplayScreen.prototype.OnGetSettingsData = function(settingsData)
{
  console.log("Got SettingsData: " + JSON.stringify(settingsData));

  //Set these one by one, so we don't overwrite the rivets binding code
  PauseGameplaySettingsScreenData.mouseSensitivity = settingsData.mouseSensitivity;
  PauseGameplaySettingsScreenData.invertY = settingsData.invertY;
  PauseGameplaySettingsScreenData.smoothMouse = settingsData.smoothMouse;
  PauseGameplaySettingsScreenData.showPing = settingsData.showPing;
  PauseGameplaySettingsScreenData.fov = settingsData.fov;
  PauseGameplaySettingsScreenData.showWeaponTooltips = settingsData.showWeaponTooltips;
  PauseGameplaySettingsScreenData.masterVolume = settingsData.masterVolume;
  PauseGameplaySettingsScreenData.musicVolume = settingsData.musicVolume;
  PauseGameplaySettingsScreenData.teamChat = settingsData.teamChat;
  PauseGameplaySettingsScreenData.proximityChat = settingsData.proximityChat;
  PauseGameplaySettingsScreenData.showDamageNumbers = settingsData.showDamageNumbers;
  PauseGameplaySettingsScreenData.showInGameHUD = settingsData.showInGameHUD;
}

PauseGameplayScreen.prototype.CanPopScreen = function()
{
  if(this.optionsDirty)
  {
    console.log("can't pop screen");
    var modalArgs = {
      options: ["OK", "Cancel"],
      title:"Apply Modified Settings?",
      bSupportsBackButton: true,
      callback: function(option){
        if(option == "OK")
        {
          engine.call("ApplySettings");
          RefreshPingSetting();
          PopScreen();
        }
        else
        {
          engine.call("RevertSettings");
          PopScreen();
        }

        PopModal();
      }
    };

    PushModal('Modal', modalArgs);
    return false;
  }
  console.log("can pop screen");
  return true;
}

PauseGameplayScreen.prototype.OnClosed = function()
{
  console.log("PauseGamepay OnClosed");
  BaseMenuScreen.prototype.OnClosed.call(this);
}

$.extend(PauseGameplayScreen.prototype, VerticalMenuMixin);

Screens['PauseGameplay'] = PauseGameplayScreen;
