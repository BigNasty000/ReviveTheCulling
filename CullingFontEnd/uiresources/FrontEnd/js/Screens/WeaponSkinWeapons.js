const WeaponSkinWeaponsSelector = document.getElementById("weapon-skins-weapons-menu");

var WeaponSkinWeaponsScreenData = {
  IsNew : [],
  ScreenName : ""
}

rivets.bind($(WeaponSkinWeaponsSelector), {
  screenData : WeaponSkinWeaponsScreenData
});

function WeaponSkinWeaponsScreen(args)
{
  BaseMenuScreen.call(this);
  console.log(JSON.stringify(args));
  this.weaponCategory = args.weaponCategory;
  this.Selector = WeaponSkinWeaponsSelector;
  this.ActiveMenu = document.getElementById("weapon-skins-weapons-options");
  this.ScreenActions = [{value:"Select"}, {value:"Back"}];
  WeaponSkinWeaponsScreenData.ScreenName = this.weaponCategory.toUpperCase();
}

WeaponSkinWeaponsScreen.prototype = Object.create(BaseMenuScreen.prototype);
WeaponSkinWeaponsScreen.prototype.constructor = WeaponSkinWeaponsScreen;

WeaponSkinWeaponsScreen.prototype.OnShow = function()
{
  BaseMenuScreen.prototype.OnShow.call(this);
  WeaponSkinWeaponsScreenData.IsNew = [];
  engine.call("GetWeaponsForCustCategory", this.weaponCategory).then($.proxy(function(weapons){
    console.log("Weapons: " + JSON.stringify(weapons));


    for(weaponName in weapons)
    {
      WeaponSkinWeaponsScreenData.IsNew.push({name: weaponName, isNew: weapons[weaponName]});
    }

    $(this.Selector).find('li').hover(function(event){
      if(event)
      {
        OnMouseHover(event.target);
      }
    });

    this.ResetFocus();
  }, this));
}

WeaponSkinWeaponsScreen.prototype.OnOptionElemSelected = function(element)
{
  if(element.dataset != undefined)
  {
    if(element.dataset.pushScreen != undefined
      && element.dataset.weapon != undefined)
    {
      var args = {
        custType : "weapitem",
        elemSource : "AppearanceItemScreen",
        category : element.dataset.weapon,
        locFunction : rivets.formatters.getLocalizedNameForItem
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

$.extend(WeaponSkinWeaponsScreen.prototype, VerticalMenuMixin);

Screens['WeaponSkinWeapons'] = WeaponSkinWeaponsScreen;
