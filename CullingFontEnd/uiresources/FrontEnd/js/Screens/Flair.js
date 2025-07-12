const FlairSelector = document.getElementById("flair-menu");

//Add your CSS files here
$('head').append('<link rel="stylesheet" type="text/css" href="css/Screens/Flair.css">');


var FlairScreenData = {
	"card" : { bIsNew : false },
    "celebration" : { bIsNew : false },
    "taunt" : { bIsNew : false }
}

rivets.bind($(FlairSelector), {
  screenData : FlairScreenData
});

function FlairScreen()
{
  BaseMenuScreen.call(this);
  this.Selector = FlairSelector;
  this.ActiveMenu = document.getElementById("flair-menu-options");
  this.ScreenActions = [{value: "Select"}, {value: "Back"}];
}

FlairScreen.prototype = Object.create(BaseMenuScreen.prototype);
FlairScreen.prototype.constructor = FlairScreen;

FlairScreen.prototype.OnShow = function()
{
  BaseMenuScreen.prototype.OnShow.call(this);
  engine.call("SetCharacterCamera");

  for(key in FlairScreenData)
  {
    (function(key){
      engine.call("HasNewCustomizationForType", key).then(function(result){
        console.log(key + " has new items: " + result);
        FlairScreenData[key].bIsNew = result;
      });
    })(key);
  }
}

FlairScreen.prototype.OnOptionElemSelected = function(element)
{
	console.log("dataset and custType is " + element.dataset + " and " + element.dataset.custType);

  if(element.dataset != undefined)
  {
    if(element.dataset.pushScreen != undefined
      && element.dataset.custType != undefined)
    {
      PushScreen(element.dataset.pushScreen, {custType : element.dataset.custType, elemSource : "AppearanceItemScreen", category: element.dataset.category });
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

$.extend(FlairScreen.prototype, VerticalMenuMixin);

Screens['Flair'] = FlairScreen;
