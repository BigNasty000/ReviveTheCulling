const SettingsVideoSelector = document.getElementById("settings-video-menu");

//Add your CSS files here
$('head').append('<link rel="stylesheet" type="text/css" href="css/Screens/SettingsVideo.css">');

var VideoSettingsScreenData = {
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

rivets.bind($(SettingsVideoSelector), {
  screenData : VideoSettingsScreenData,
});

function SettingsVideoScreen()
{
  BaseMenuScreen.call(this);
  this.Selector = SettingsVideoSelector;
  this.ActiveMenu = document.getElementById("settings-video-menu-options");
  this.ScreenActions = [{value:"Select"}, {value:"Back"}];
  this.optionsDirty = false;
}

SettingsVideoScreen.prototype = Object.create(BaseMenuScreen.prototype);
SettingsVideoScreen.prototype.constructor = SettingsVideoScreen;

SettingsVideoScreen.prototype.RefreshSettingsData = function()
{
  engine.call("GetVideoSettings").then($.proxy(function(result){
    console.log("Got Settings Data: " + JSON.stringify(result));
    this.OnGetSettingsData(result);
  },this));
}

SettingsVideoScreen.prototype.OnCreation = function()
{
  BaseMenuScreen.prototype.OnCreation.call(this);
  this.optionsDirty = false;
  this.RefreshSettingsData();
}

SettingsVideoScreen.prototype.OnShow = function()
{
  this.SetNewActiveMenu(this.ActiveMenu);

  BaseMenuScreen.prototype.OnShow.call(this);
}

SettingsVideoScreen.prototype.OnHide = function()
{
  BaseMenuScreen.prototype.OnHide.call(this);
}

SettingsVideoScreen.prototype.OnOptionElemSelected = function(elem)
{
    BaseMenuScreen.prototype.OnOptionElemSelected.call(this, elem);
}

SettingsVideoScreen.prototype.OnMouseClicked = function(elem)
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

SettingsVideoScreen.prototype.IncrementSettings = function(direction, setting)
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

SettingsVideoScreen.prototype.IncrementOnElement = function(elem, direction)
{
    if(this.HasMenuItemElem(elem) && elem.dataset != undefined && elem.dataset.pickerConfigVar != undefined)
    {
        var pickerConfigVar = elem.dataset.pickerConfigVar;
        this.IncrementSettings(direction, pickerConfigVar);
    }
}

SettingsVideoScreen.prototype.OnGetSettingsData = function(settingsData)
{
  console.log("Got SettingsData: " + JSON.stringify(settingsData));

  //Set these one by one, so we don't overwrite the rivets binding code
  VideoSettingsScreenData.CurrRes = settingsData.CurrRes;
  VideoSettingsScreenData.screenMode = settingsData.screenMode;
  VideoSettingsScreenData.postQuality = settingsData.postQuality;
  VideoSettingsScreenData.effectsQuality = settingsData.effectsQuality;
  VideoSettingsScreenData.aaQuality = settingsData.aaQuality;
  VideoSettingsScreenData.shadowQuality = settingsData.shadowQuality;
  VideoSettingsScreenData.viewDistQuality = settingsData.viewDistQuality;
  VideoSettingsScreenData.texQuality = settingsData.texQuality;
  VideoSettingsScreenData.vSync = settingsData.vSync;
}

SettingsVideoScreen.prototype.CanPopScreen = function()
{
  if(this.optionsDirty)
  {
    var modalArgs = {
      options: ["OK", "Cancel"],
      title:"Apply Modified Settings?",
      description:"<b style='font-size: 1vw;'>*In order for these changes to take effect, you must restart the client.</b>",
      bSupportsBackButton: true,
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

SettingsVideoScreen.prototype.OnClosed = function()
{
  BaseMenuScreen.prototype.OnClosed.call(this);
}

$.extend(SettingsVideoScreen.prototype, VerticalMenuMixin);

Screens['SettingsVideo'] = SettingsVideoScreen;
