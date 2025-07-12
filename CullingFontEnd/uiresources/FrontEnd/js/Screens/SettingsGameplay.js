const SettingsGeneralSelector = document.getElementById("settings-general-menu");
var mouseSensitivitySlider = document.getElementById("mouse-sensitivity-slider");

//Add your CSS files here
$('head').append('<link rel="stylesheet" type="text/css" href="css/Screens/SettingsGameplay.css">');

var GameplaySettingsScreenData = {
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
    region: "",
	showInGameHUD: 1
}



rivets.bind($(SettingsGeneralSelector), {
  screenData : GameplaySettingsScreenData,
  ActionMapData: ActionMapData,
  KeyBindMessageData : KeyBindMessageData,
  ClientwebData : ClientwebData
});





//noUiSlider.create(mouseSensitivitySlider, {
//    start: [0.1],
//    step: 0.01,
//    range: {
//        'min': [0.01],
//        'max': [0.5]
//    }
//});

//mouseSensitivitySlider.noUiSlider.on('change', UpdateMouseSensitivity);

//function UpdateMouseSensitivity(value) {
//    SettingsObject.mouseSensitivity = Number(value);
//    //optionsDirty = true;
//    //OptionsSave();
//    console.log("GameSettings.mouseSensitivity: " + SettingsObject.mouseSensitivity);
//}

function SettingsGeneral() {
    BaseMenuScreen.call(this);
    this.Selector = document.getElementById("settings-general-menu");
    this.ActiveMenu = document.getElementById("settings-general-menu-options");
    this.ScreenActions = [{ value: "Select" }, { value: "Back" }];
    this.optionsDirty = false;
}

SettingsGeneral.prototype = Object.create(BaseMenuScreen.prototype);
SettingsGeneral.prototype.constructor = SettingsGeneral;

SettingsGeneral.prototype.OnShow = function()
{
  console.log(JSON.stringify(SettingsObject));
  this.SetNewActiveMenu(this.ActiveMenu);
  BaseMenuScreen.prototype.OnShow.call(this);
}

SettingsGeneral.prototype.OnCreation = function()
{
  BaseMenuScreen.prototype.OnCreation.call(this);
  this.optionsDirty = false;
  this.RefreshSettingsData();
  this.OnShow();
}

SettingsGeneral.prototype.OnHide = function()
{
  BaseMenuScreen.prototype.OnHide.call(this);
}

SettingsGeneral.prototype.OnClosed = function()
{
    BaseMenuScreen.prototype.OnClosed.call(this);
}

SettingsGeneral.prototype.RefreshSettingsData = function()
{
  engine.call("GetGameplaySettings").then($.proxy(function(result){
    console.log("Got Settings Data: " + JSON.stringify(result));
    this.OnGetSettingsData(result);
  },this));
}


SettingsGeneral.prototype.OnMouseClicked = function(elem)
{
  if(elem.dataset && elem.dataset.picker)
  {
    console.log("Elem Clicked: " + elem.nodeName);
    var parent = this.GetAbsoluteMenuItemElem(elem);
    if (parent == undefined)
    {
        parent = elem.parentElement;
    }

    if (parent != undefined)
    {
      //var parent = this.GetAbsoluteMenuItemElem(elem);
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

SettingsGeneral.prototype.IncrementSettings = function(direction, setting)
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
      case "region":
          setter = "IncrementDataCenter"
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
		  setter = "ToggleShowInGameHUD";
		  break;
  }

  this.optionsDirty = true;

  engine.call(setter, direction).then($.proxy(function(){
    this.RefreshSettingsData();
  },this));
}

SettingsGeneral.prototype.IncrementOnElement = function(elem, direction)
{
    if(this.HasMenuItemElem(elem) && elem.dataset != undefined && elem.dataset.pickerConfigVar != undefined)
    {
        var pickerConfigVar = elem.dataset.pickerConfigVar;
        this.IncrementSettings(direction, pickerConfigVar);
    }
}

SettingsGeneral.prototype.OnGetSettingsData = function(settingsData)
{
  console.log("Got SettingsData: " + JSON.stringify(settingsData));

  //Set these one by one, so we don't overwrite the rivets binding code
  GameplaySettingsScreenData.mouseSensitivity = settingsData.mouseSensitivity;
  GameplaySettingsScreenData.invertY = settingsData.invertY;
  GameplaySettingsScreenData.smoothMouse = settingsData.smoothMouse;
  GameplaySettingsScreenData.showPing = settingsData.showPing;
  GameplaySettingsScreenData.fov = settingsData.fov;
  GameplaySettingsScreenData.showWeaponTooltips = settingsData.showWeaponTooltips;
  GameplaySettingsScreenData.masterVolume = settingsData.masterVolume;
  GameplaySettingsScreenData.musicVolume = settingsData.musicVolume;
  GameplaySettingsScreenData.region = settingsData.dataCenter;
  GameplaySettingsScreenData.teamChat = settingsData.teamChat;
  GameplaySettingsScreenData.proximityChat = settingsData.proximityChat;
  GameplaySettingsScreenData.showDamageNumbers = settingsData.showDamageNumbers;
  GameplaySettingsScreenData.showInGameHUD = settingsData.showInGameHUD;
}

SettingsGeneral.prototype.CanPopScreen = function()
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
            console.log("ClientwebData.SelectedDataCenter: " + ClientwebData.SelectedDataCenter);
            console.log("GameplaySettingsScreenData.region: " + GameplaySettingsScreenData.region);
            if (ClientwebData.SelectedDataCenter != GameplaySettingsScreenData.region)
            {
              console.log("Region changed.");
                if (!ClientwebData.ShouldOverrideDataCenter())
                {
                  console.log("Not set to override data center.");

                  DisconnectClientweb();
                  ClientwebData.SelectedDataCenter = GameplaySettingsScreenData.region;
                  SelectAndConnectDataCenter(ClientwebData.SelectedDataCenter);
                }
                else
                {
                  console.log("Data center override was set.");

                  // don't actively switch regions if being overriden at this time
                  ClientwebData.SelectedDataCenter = GameplaySettingsScreenData.region;
                }
            }
            else
            {
              console.log("Region did not change.");
            }
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

$.extend(SettingsGeneral.prototype, VerticalMenuMixin);
//$.extend(CustomScreen.prototype, HorizontalMenuMixin);
Screens['SettingsGeneral'] = SettingsGeneral;
