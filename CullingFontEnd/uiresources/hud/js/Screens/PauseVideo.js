const PauseVideoSelector = document.getElementById("pause-video-menu");

//Add your CSS files here
$('head').append('<link rel="stylesheet" type="text/css" href="css/Screens/PauseVideo.css">');

var PauseVideoSettingsScreenData = {
  CurrRes : "1920x1080",
  screenMode : 0,
  postQuality : 0,
  effectsQuality : 0,
  aaQuality : 0,
  shadowQuality : 0,
  viewDistQuality : 0,
  texQuality : 0,
  vSync : 0
}

rivets.bind($(PauseVideoSelector), {
  screenData : PauseVideoSettingsScreenData,
});

function PauseVideoScreen()
{
  BaseMenuScreen.call(this);
  this.Selector = PauseVideoSelector;
  this.ActiveMenu = document.getElementById("pause-video-menu-options");
  this.ScreenActions = [{value:"Select"}, {value:"Back"}];
  this.optionsDirty = false;
  this.ScreenName = "PauseVideoScreen";
}

PauseVideoScreen.prototype = Object.create(BaseMenuScreen.prototype);
PauseVideoScreen.prototype.constructor = PauseVideoScreen;

PauseVideoScreen.prototype.RefreshSettingsData = function()
{
  engine.call("GetVideoSettings").then($.proxy(function(result){
    console.log("Got Settings Data: " + JSON.stringify(result));
    this.OnGetSettingsData(result);
  },this));
}

PauseVideoScreen.prototype.OnCreation = function()
{
  console.log("PauseVideo OnCreation");
  BaseMenuScreen.prototype.OnCreation.call(this);
  this.optionsDirty = false;
  this.RefreshSettingsData();
}

PauseVideoScreen.prototype.OnShow = function()
{
  this.SetNewActiveMenu(this.ActiveMenu);

  BaseMenuScreen.prototype.OnShow.call(this);
}

PauseVideoScreen.prototype.OnHide = function()
{
  BaseMenuScreen.prototype.OnHide.call(this);
}

PauseVideoScreen.prototype.OnOptionElemSelected = function(elem)
{
    BaseMenuScreen.prototype.OnOptionElemSelected.call(this, elem);
}

PauseVideoScreen.prototype.OnMouseClicked = function(elem)
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

PauseVideoScreen.prototype.IncrementSettings = function(direction, setting)
{
  console.log("IncrementSettings: " + setting + " " + direction);
  var setter = "";

  switch(setting)
  {
    case "CurrRes":
      setter = "IncrementResolution"
      break;
    case "screenMode":
      setter = "IncrementScreenMode"
      break;
    case "postQuality":
      setter = "IncrementPostProcessQuality"
      break;
    case "effectsQuality":
      setter = "IncrementFXQuality"
      break;
    case "aaQuality":
      setter = "IncrementAAQuality"
      break;
    case "shadowQuality":
      setter = "IncrementShadowQuality"
      break;
    case "viewDistQuality":
      setter = "IncrementViewDistance"
      break;
    case "texQuality":
      setter = "IncrementTextureQuality"
      break;
    case "vSync":
      setter = "IncrementVSync"
      break;
  }

  this.optionsDirty = true;

  engine.call(setter, direction).then($.proxy(function(){
    this.RefreshSettingsData();
  },this));
}

PauseVideoScreen.prototype.IncrementOnElement = function(elem, direction)
{
    if(this.HasMenuItemElem(elem) && elem.dataset != undefined && elem.dataset.pickerConfigVar != undefined)
    {
        var pickerConfigVar = elem.dataset.pickerConfigVar;
        this.IncrementSettings(direction, pickerConfigVar);
    }
}

PauseVideoScreen.prototype.OnGetSettingsData = function(settingsData)
{
  console.log("Got SettingsData: " + JSON.stringify(settingsData));

  //Set these one by one, so we don't overwrite the rivets binding code
  PauseVideoSettingsScreenData.CurrRes = settingsData.CurrRes;
  PauseVideoSettingsScreenData.screenMode = settingsData.screenMode;
  PauseVideoSettingsScreenData.postQuality = settingsData.postQuality;
  PauseVideoSettingsScreenData.effectsQuality = settingsData.effectsQuality;
  PauseVideoSettingsScreenData.aaQuality = settingsData.aaQuality;
  PauseVideoSettingsScreenData.shadowQuality = settingsData.shadowQuality;
  PauseVideoSettingsScreenData.viewDistQuality = settingsData.viewDistQuality;
  PauseVideoSettingsScreenData.texQuality = settingsData.texQuality;
  PauseVideoSettingsScreenData.vSync = settingsData.vSync;
}

PauseVideoScreen.prototype.CanPopScreen = function()
{
  if(this.optionsDirty)
  {
    var modalArgs = {
      options: ["OK", "Cancel"],
      title:"Apply Modified Settings?",
      bSupportsBackButton: true,
      callback: function(option){
        if(option == "OK")
        {
          engine.call("ApplySettings");
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

  return true;
}

PauseVideoScreen.prototype.OnClosed = function()
{
  console.log("PauseVideo OnClosed");
  BaseMenuScreen.prototype.OnClosed.call(this);
}

$.extend(PauseVideoScreen.prototype, VerticalMenuMixin);

Screens['PauseVideo'] = PauseVideoScreen;
