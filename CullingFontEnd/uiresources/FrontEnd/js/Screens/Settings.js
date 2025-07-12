const SettingsSelector = document.getElementById("settings-menu");
const SettingsNavSelector = document.getElementById("settings-menu-options");

//Add your CSS files here
$('head').append('<link rel="stylesheet" type="text/css" href="css/Screens/Settings.css">');
console.log("SETTINGS BIND");

var settingsBinder = rivets.bind($('#settings-menu-options'), {
  ClientwebData: ClientwebData
});

function SettingsScreen()
{
  BaseMenuScreen.call(this);
  this.Selector = SettingsSelector;
  this.ActiveMenu = document.getElementById("settings-menu-options");
  this.ScreenActions = [{value:"Select"}, {value:"Back"}];
  this.ScreenName = "SettingsScreen";
}

SettingsScreen.prototype = Object.create(BaseMenuScreen.prototype);
SettingsScreen.prototype.constructor = SettingsScreen;

SettingsScreen.prototype.OnCreation = function()
{
  console.log(JSON.stringify(ClientwebData));
  settingsBinder.update({ClientwebData: ClientwebData});
  BaseMenuScreen.prototype.OnShow.call(this);
  engine.call("SetSettingsCamera");
}

$.extend(SettingsScreen.prototype, HorizontalMenuMixin);

Screens['Settings'] = SettingsScreen;
