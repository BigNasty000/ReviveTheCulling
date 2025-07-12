const PauseAudioSelector = document.getElementById("pause-audio-menu");

//Add your CSS files here
$('head').append('<link rel="stylesheet" type="text/css" href="css/Screens/PauseGameplay.css">');

var PauseAudioSettingsScreenData = {
    masterVolume : 1,
    musicVolume: 1,
    teamChat: 1,
    proximityChat: 1,
    speakerConfig: 1,
    pushToTalk: 1
}

rivets.bind($(PauseAudioSelector), {
  screenData : PauseAudioSettingsScreenData,
  matchData : matchData
});

function PauseAudioScreen()
{
  BaseMenuScreen.call(this);
  this.Selector = PauseAudioSelector;
  this.ActiveMenu = document.getElementById("pause-audio-menu-options");
  this.ScreenActions = [{value:"Select"}, {value:"Back"}];
  this.optionsDirty = false;
  this.ScreenName = "PauseAudioScreen";
}

PauseAudioScreen.prototype = Object.create(BaseMenuScreen.prototype);
PauseAudioScreen.prototype.constructor = PauseAudioScreen;

PauseAudioScreen.prototype.RefreshSettingsData = function()
{
  engine.call("GetGameplaySettings").then($.proxy(function(result){
    console.log("Got Settings Data: " + JSON.stringify(result));
    this.OnGetSettingsData(result);
  },this));
}

PauseAudioScreen.prototype.OnCreation = function()
{
  console.log("PauseGamepay OnCreation");
  BaseMenuScreen.prototype.OnCreation.call(this);
  this.optionsDirty = false;
  this.RefreshSettingsData();
}

PauseAudioScreen.prototype.OnShow = function()
{
  this.SetNewActiveMenu(this.ActiveMenu);

  BaseMenuScreen.prototype.OnShow.call(this);
}

PauseAudioScreen.prototype.OnHide = function()
{
  BaseMenuScreen.prototype.OnHide.call(this);
}

PauseAudioScreen.prototype.OnOptionElemSelected = function(elem)
{
  BaseMenuScreen.prototype.OnOptionElemSelected.call(this, elem);
}

PauseAudioScreen.prototype.OnMouseClicked = function(elem)
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

PauseAudioScreen.prototype.IncrementSettings = function(direction, setting)
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

PauseAudioScreen.prototype.IncrementOnElement = function(elem, direction)
{
    if(this.HasMenuItemElem(elem) && elem.dataset != undefined && elem.dataset.pickerConfigVar != undefined)
    {
        var pickerConfigVar = elem.dataset.pickerConfigVar;
        this.IncrementSettings(direction, pickerConfigVar);
    }
}

PauseAudioScreen.prototype.OnGetSettingsData = function(settingsData)
{
  console.log("Got SettingsData: " + JSON.stringify(settingsData));

  PauseAudioSettingsScreenData.masterVolume = settingsData.masterVolume;
  PauseAudioSettingsScreenData.musicVolume = settingsData.musicVolume;
  PauseAudioSettingsScreenData.teamChat = settingsData.teamChat;
  PauseAudioSettingsScreenData.proximityChat = settingsData.proximityChat;
  PauseAudioSettingsScreenData.speakerConfig = settingsData.speakerConfig;
  PauseAudioSettingsScreenData.pushToTalk = settingsData.pushToTalk;
}

PauseAudioScreen.prototype.CanPopScreen = function()
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

PauseAudioScreen.prototype.OnClosed = function()
{
  console.log("PauseGamepay OnClosed");
  BaseMenuScreen.prototype.OnClosed.call(this);
}

$.extend(PauseAudioScreen.prototype, VerticalMenuMixin);

Screens['PauseAudio'] = PauseAudioScreen;
