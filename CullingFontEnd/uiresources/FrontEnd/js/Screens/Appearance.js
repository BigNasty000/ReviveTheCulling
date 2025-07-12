const AppearanceSelector = document.getElementById("appearance-menu");

//Add your CSS files here
$('head').append('<link rel="stylesheet" type="text/css" href="css/Screens/Appearance.css">');


var AppearanceScreenData = {
    "hair" : { bIsNew : false },
    "hat" : { bIsNew : false },
    "torso" : { bIsNew : false },
    "legs" : { bIsNew : false }
}

rivets.bind($(AppearanceSelector), {
  screenData : AppearanceScreenData
});

function AppearanceScreen()
{
  BaseMenuScreen.call(this);
  this.Selector = AppearanceSelector;
  this.ActiveMenu = document.getElementById("appearance-menu-options");
  this.ScreenActions = [{value: "Select"}, {value: "Back"}];
}

AppearanceScreen.prototype = Object.create(BaseMenuScreen.prototype);
AppearanceScreen.prototype.constructor = AppearanceScreen;

AppearanceScreen.prototype.OnShow = function()
{
  BaseMenuScreen.prototype.OnShow.call(this);
  engine.call("SetCharacterCamera");

  for(key in AppearanceScreenData)
  {
    (function(key){
      engine.call("HasNewCustomizationForType", key).then(function(result){
        console.log(key + " has new items: " + result);
        AppearanceScreenData[key].bIsNew = result;
      });
    })(key);
  }
}

AppearanceScreen.prototype.OnOptionElemSelected = function(element)
{
  if(element.dataset != undefined)
  {
    if(element.dataset.pushScreen != undefined
      && element.dataset.custType != undefined)
    {
      PushScreen(element.dataset.pushScreen, {custType : element.dataset.custType, elemSource : "AppearanceCatScreen"});
      return;
    }
  }

  BaseMenuScreen.prototype.OnOptionElemSelected.call(this, element);

  /*
  try {
      element.onclick();
  } catch (e) {

  } finally {

  }
  */

}

$.extend(AppearanceScreen.prototype, VerticalMenuMixin);

Screens['Appearance'] = AppearanceScreen;
