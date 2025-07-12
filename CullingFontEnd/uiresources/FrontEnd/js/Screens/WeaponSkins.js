const WeaponSkinsSelector = document.getElementById("weapon-skins-menu");

//Add your CSS files here
$('head').append('<link rel="stylesheet" type="text/css" href="css/Screens/WeaponSkins.css">');

var WeaponSkinsScreenData = {
  IsNew : []/* {
    "Axes" : false,
    "Blades" : false,
    "Bludgeons" : false,
    "Bows" : false,
    "Firearms" : false,
    "Spears" : false
  }*/
}

rivets.bind($(WeaponSkinsSelector), {
  screenData : WeaponSkinsScreenData
});

function WeaponSkinsScreen()
{
  BaseMenuScreen.call(this);
  this.Selector = WeaponSkinsSelector;
  this.ActiveMenu = document.getElementById("weapon-skins-options");
  this.ScreenActions = [{value:"Select"}, {value:"Back"}];
}

WeaponSkinsScreen.prototype = Object.create(BaseMenuScreen.prototype);
WeaponSkinsScreen.prototype.constructor = WeaponSkinsScreen;

WeaponSkinsScreen.prototype.OnCreation = function()
{
    BaseMenuScreen.prototype.OnCreation.call(this);

    engine.call("GetWeaponCustCategories").then($.proxy(function(categories){

      WeaponSkinsScreenData.IsNew = [];

      for(var catName in categories)
      {
        WeaponSkinsScreenData.IsNew.push({name: catName, isNew: categories[catName]});
      }

      $(this.Selector).find('li').hover(function(event){
        if(event)
        {
          OnMouseHover(event.target);
        }
      });
      engine.call("SetWeaponsCamera");
      this.ResetFocus();
    }, this));
    /*
    engine.call("GetWeaponsForCustCategory", "Axes").then(function(weapons){
      if(weapons != undefined && weapons.length > 0)
      {
        engine.call("GetWeaponCustomizations", weapons[0]).then(function(customizations){
          console.log(JSON.stringify(customizations));
          engine.call("SetCustomizationForWeapon", customizations[0].AssetName);
        });
      }
    })
    */
}

WeaponSkinsScreen.prototype.OnOptionElemSelected = function(element)
{
  if(element.dataset != undefined)
  {
    if(element.dataset.pushScreen != undefined
      && element.dataset.custType != undefined
      && element.dataset.weaponCategory != undefined)
    {
      var args = {
        custType : element.dataset.custType,
        elemSource : "AppearanceCatScreen",
        weaponCategory : element.dataset.weaponCategory
      }

      PushScreen(element.dataset.pushScreen, args);
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

$.extend(WeaponSkinsScreen.prototype, VerticalMenuMixin);

Screens['WeaponSkins'] = WeaponSkinsScreen;
