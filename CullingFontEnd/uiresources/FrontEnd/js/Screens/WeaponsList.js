const WeaponsListSelector = document.getElementById("weapon-list-menu");

//Add your CSS files here
$('head').append('<link rel="stylesheet" type="text/css" href="css/Screens/WeaponsList.css">');

var  WeaponsListScreenData = {
  AllCategories : [],/* {
    "Axes" : false,
    "Blades" : false,
    "Bludgeons" : false,
    "Bows" : false,
    "Firearms" : false,
    "Spears" : false
  }*/
  AllWeapons : []
}

this.rivetsBinder = rivets.bind($(WeaponsListSelector), {
  screenData: WeaponsListScreenData
});

function  WeaponsListScreen()
{
  BaseMenuScreen.call(this);
  this.Selector = WeaponsListSelector;
  this.ActiveMenu = document.getElementById("weapon-list-options");
  this.ScreenActions = [{value:"Select"}, {value:"Back"}];
  this.ScreenName = "WeaponsListScreen";
}

WeaponsListScreen.prototype = Object.create(BaseMenuScreen.prototype);
WeaponsListScreen.prototype.constructor = WeaponsListScreen;

WeaponsListScreen.prototype.OnShow = function()
{
  WeaponsListScreen.UpdateWeaponList();
  BaseMenuScreen.prototype.OnShow.call(this);
}

WeaponsListScreen.prototype.OnCreation = function()
{
    BaseMenuScreen.prototype.OnCreation.call(this);
    engine.call("SetWeaponsCamera");

    $(this.Selector).find('content').hover(function(event){
      if(event)
      {
        OnMouseHover(event.target);
      }
    });

}

WeaponsListScreen.UpdateWeaponList = function(){
  Array.prototype.forEach.call(WeaponsListScreenData.AllCategories, function(category){
    engine.call("GetWeaponsForCustCategory", category.name).then(function(weapons){
      console.log("Weapons: " + JSON.stringify(weapons));
      for(weaponName in weapons)
      {
        Array.prototype.forEach.call(WeaponsListScreenData.AllWeapons, function(weapon){
          if(weapon.name == weaponName && weapon.isNew != weapons[weaponName]){
            weapon.isNew = weapons[weaponName];
          }
        });
        this.rivetsBinder.update({screenData : WeaponsListScreenData});
      }
    });
  });
}

WeaponsListScreen.GetWeaponCategories = function(categories){
  WeaponsListScreenData.AllCategories = [];
  for(var catName in categories)
  {
    WeaponsListScreenData.AllCategories.push({name: catName, isNew: categories[catName]});
  }
  WeaponsListScreen.GetWeaponsForCategory();
}

WeaponsListScreen.GetWeaponsForCategory = function(){
  WeaponsListScreenData.AllWeapons = [];
  Array.prototype.forEach.call(WeaponsListScreenData.AllCategories, function(category){
    engine.call("GetWeaponsForCustCategory", category.name).then(function(weapons){
      console.log("Weapons: " + JSON.stringify(weapons));
      for(weaponName in weapons)
      {
        WeaponsListScreenData.AllWeapons.push({name: weaponName, isNew: weapons[weaponName]});
      }
    });
  });
}

WeaponsListScreen.prototype.OnMouseClicked = function(element){
  // console.log(element.dataset.pushScreen);
  // console.log(element);
  if(element.dataset.pushScreen == "DynWeaponSkinItem")
  {
    this.OnOptionElemSelected(element);
  }
  else {
    this.OnOptionElemSelected(element.parentElement);
  }
}

WeaponsListScreen.prototype.OnOptionElemSelected = function(element)
{
  // console.log(element);
  if(element != undefined && element != null && element.dataset != undefined)
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
}

WeaponsListScreen.prototype.OnButtonPressed = function(button){
  console.log(document.activeElement.innerHTML);
  if(button == btn_Up)
  {
    this.IncrementSelection(-5);
  }
  else if(button == btn_Down)
  {
    this.IncrementSelection(5);
  }
  else if(button == btn_Right)
  {
    this.IncrementSelection(1);
  }
  else if(button == btn_Left)
  {
    this.IncrementSelection(-1);
  }
  else if(button == btn_Select)
  {
    var focusedItem = this.GetFocusedItem();
    if(focusedItem != undefined)
    {
      this.OnOptionElemSelected(focusedItem);
    }
  }
  else if(button == btn_Back && this.CanPopScreen())
  {
    if(!IsRootScreen())
    {
      PopScreen();
    }
  }
  else if(button == btn_Pause)
  {
    console.log("btn_Pause");
    OpenCurrencyPurchaseWidget();
  }
  //BaseMenuScreen.prototype.OnButtonPressed.call(this, button);
}


WeaponsListScreen.prototype.IncrementSelection = function(direction)
{
  console.log("WeaponsListScreen direction " + direction);
  var currFocus = document.activeElement;
  var menuItems = this.GetMenuItems();
  var idx = 0;
  for( var i = 0; i < menuItems.length; ++i )
  {
    if(menuItems[i] === currFocus)
    {
      idx = i;
      break;
    }
  }
  console.log("idx " + idx);
  console.log("menuItems.length " + menuItems.length);
  console.log((idx + direction + menuItems.length) % menuItems.length);
  if(menuItems.length == 0){
    idx = 0;
  }else{
    if(idx + direction >= 0 && idx + direction < menuItems.length){
      idx = (idx + direction + menuItems.length) % menuItems.length;
    }

  }
  console.log("idx " + idx);
  menuItems[idx].focus();
  this.OnSelectionChanged(menuItems[idx]);
}

WeaponsListScreen.prototype.OnHide = function()
{
  this.lastFocusedItem = this.GetFocusedItem();
  BaseMenuScreen.prototype.OnHide.call(this);
  //console.log(this.lastFocusedItem.innerHTML);
}

WeaponsListScreen.prototype.OnClosed = function()
{
  BaseMenuScreen.prototype.OnClosed.call(this);
}

WeaponsListScreen.prototype.OnMenuActionClicked = function(MenuAction){
  BaseMenuScreen.prototype.OnMenuActionClicked.call(this, MenuAction);
}

//$.extend(WeaponsListScreen.prototype, VerticalMenuMixin);

Screens['WeaponsList'] = WeaponsListScreen;
