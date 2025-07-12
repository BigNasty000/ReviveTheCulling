const SettingsAudioSelector = document.getElementById("settings-audio-menu");
var mouseSensitivitySlider = document.getElementById("mouse-sensitivity-slider");

//Add your CSS files here
$('head').append('<link rel="stylesheet" type="text/css" href="css/Screens/SettingsGameplay.css">');

var AudioSettingsScreenData = {
    //Region : "", //This shouldn't appear in-game, only in FrontEnd
    masterVolume : 5,
    musicVolume: 1,
    teamChat: 1,
    proximityChat: 1,
    speakerConfig: 1,
    pushToTalk: 1
}



rivets.bind($(SettingsAudioSelector), {
  screenData : AudioSettingsScreenData,
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

function SettingsAudio() {
    BaseMenuScreen.call(this);
    this.Selector = document.getElementById("settings-audio-menu");
    this.ActiveMenu = document.getElementById("settings-audio-menu-options");
    this.ScreenActions = [{ value: "Select" }, { value: "Back" }];
    this.optionsDirty = false;
}

SettingsAudio.prototype = Object.create(BaseMenuScreen.prototype);
SettingsAudio.prototype.constructor = SettingsAudio;

SettingsAudio.prototype.OnShow = function()
{
  console.log(JSON.stringify(SettingsObject));
  this.SetNewActiveMenu(this.ActiveMenu);
  BaseMenuScreen.prototype.OnShow.call(this);
}

SettingsAudio.prototype.OnCreation = function()
{
  BaseMenuScreen.prototype.OnCreation.call(this);
  this.optionsDirty = false;
  this.RefreshSettingsData();
  this.OnShow();
}

SettingsAudio.prototype.OnHide = function()
{
  BaseMenuScreen.prototype.OnHide.call(this);
}

SettingsAudio.prototype.OnClosed = function()
{
    BaseMenuScreen.prototype.OnClosed.call(this);
}

SettingsAudio.prototype.RefreshSettingsData = function()
{
  engine.call("GetGameplaySettings").then($.proxy(function(result){
    console.log("Got Settings Data: " + JSON.stringify(result));
    this.OnGetSettingsData(result);
  },this));
}


SettingsAudio.prototype.OnMouseClicked = function(elem)
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

SettingsAudio.prototype.IncrementSettings = function(direction, setting)
{
  console.log("IncrementSettings: " + setting + " " + direction);
  var setter = "";

  switch(setting)
  {

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
      case "speakerConfig":
          setter = "ToggleSpeakerConfiguration"
          break;
      case "pushToTalk":
          setter = "IncrementPushToTalk"
          break;
  }

  this.optionsDirty = true;

  engine.call(setter, direction).then($.proxy(function(){
    this.RefreshSettingsData();
  },this));
}

SettingsAudio.prototype.IncrementOnElement = function(elem, direction)
{
    if(this.HasMenuItemElem(elem) && elem.dataset != undefined && elem.dataset.pickerConfigVar != undefined)
    {
        var pickerConfigVar = elem.dataset.pickerConfigVar;
        this.IncrementSettings(direction, pickerConfigVar);
    }
}

SettingsAudio.prototype.OnGetSettingsData = function(settingsData)
{
  console.log("Got SettingsData: " + JSON.stringify(settingsData));

  //Set these one by one, so we don't overwrite the rivets binding code

  AudioSettingsScreenData.masterVolume = settingsData.masterVolume;
  AudioSettingsScreenData.musicVolume = settingsData.musicVolume;
  AudioSettingsScreenData.teamChat = settingsData.teamChat;
  AudioSettingsScreenData.proximityChat = settingsData.proximityChat;
  AudioSettingsScreenData.speakerConfig = settingsData.speakerConfig;
  AudioSettingsScreenData.pushToTalk = settingsData.pushToTalk;
}

SettingsAudio.prototype.CanPopScreen = function()
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

$.extend(SettingsAudio.prototype, VerticalMenuMixin);
//$.extend(CustomScreen.prototype, HorizontalMenuMixin);
Screens['SettingsAudio'] = SettingsAudio;
