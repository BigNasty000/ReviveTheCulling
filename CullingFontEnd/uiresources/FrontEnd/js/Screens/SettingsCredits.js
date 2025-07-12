
//Add your CSS files here
$('head').append('<link rel="stylesheet" type="text/css" href="css/Screens/SettingsCredits.css">');

function SettingsCreditsScreen()
{
  BaseMenuScreen.call(this);
  this.Selector = document.getElementById("settings-credits-menu");
  this.ActiveMenu = document.getElementById("settings-credits-menu-options");
  this.ScreenActions = [{value:"Back"}];
}

SettingsCreditsScreen.prototype = Object.create(BaseMenuScreen.prototype);
SettingsCreditsScreen.prototype.constructor = SettingsCreditsScreen;

var creditsScrollTimer1 = undefined;
var creditsScrollTimer2 = undefined;

SettingsCreditsScreen.prototype.OnShow = function()
{
  BaseMenuScreen.prototype.OnShow.call(this);

  creditsScrollTimer1 = setTimeout(function(){
    creditsScrollTimer2 = setInterval(function(){
      $("#settings-pane-credits").scrollTop($("#settings-pane-credits").scrollTop() + 1);
    }, 32);
  }, 100);

  engine.call("SetCreditsCamera");
  $("#settings-pane-credits").scrollTop(0);
}

SettingsCreditsScreen.prototype.OnHide = function()
{
  BaseMenuScreen.prototype.OnHide.call(this);

  clearInterval(creditsScrollTimer2);
  clearTimeout(creditsScrollTimer1);

  $("#settings-pane-credits").scrollTop(0);
}

SettingsCreditsScreen.prototype.OnClosed = function()
{
  BaseMenuScreen.prototype.OnClosed.call(this);

  clearInterval(creditsScrollTimer2);
  clearTimeout(creditsScrollTimer1);

  $("#settings-pane-credits").scrollTop(0);
}

Screens['SettingsCredits'] = SettingsCreditsScreen;
