const CustomizationSelector = document.getElementById("customization-menu");
//Add your CSS files here
$('head').append('<link rel="stylesheet" type="text/css" href="css/Screens/Customization.css">');

var CustomizationScreenData = {
  "Appearance" : { bIsNew : false },
  "Flair" : { bIsNew : false },
  "WeaponSkins" : { bIsNew : false }
}

rivets.bind($(CustomizationSelector), {
  screenData : CustomizationScreenData
});

function CustomizationScreen()
{
  this.Selector = CustomizationSelector;
  this.ActiveMenu = document.getElementById("customization-menu-options");
  this.ScreenActions = [{value:"Select"}, {value:"Back"}];
}

CustomizationScreen.prototype = Object.create(BaseMenuScreen.prototype);
CustomizationScreen.prototype.constructor = CustomizationScreen;

CustomizationScreen.prototype.OnShow = function()
{
  engine.call("GetPurchasableItemsList", "", "GetItemsListSuccess", "GetItemsListFail");

  BaseMenuScreen.prototype.OnShow.call(this);
  engine.call("HasNewClothingCustomizations").then(function(result){
    CustomizationScreenData.Appearance.bIsNew = result;
  });

  engine.call("HasNewFlairCustomizations").then(function(result){
    CustomizationScreenData.Flair.bIsNew = result;
  });

  engine.call("HasNewCustomizationForType", "weapitem").then(function(result){
    CustomizationScreenData.WeaponSkins.bIsNew = result;
  });

  engine.call("SetCustomizationCamera");
}

engine.on("GetItemsListSuccess", function (items) {
    console.log("GetItemsListSuccess");
    CustomizationScreen.ShowPendingModal(false);
    GetActiveScreen().GetMenuItems()[0].focus();
});

engine.on("GetItemsListFail", function (message) {
	console.log("GetItemsListFail");
  if(message != '')
  {
    console.log(message);
  }
});

CustomizationScreen.ShowPendingModal = function(value)
{
  console.log("ClientwebData.PendingRealMoneyPurchaseProductID: " + ClientwebData.PendingRealMoneyPurchaseProductID);
  if(value)
  {
    document.getElementById("loading-customization-items-container").classList.remove("hidden");
    document.getElementById("customization-menu-options").classList.add("hidden");
  }
  else
  {
    document.getElementById("loading-customization-items-container").classList.add("hidden");
    document.getElementById("customization-menu-options").classList.remove("hidden");
  }
}


$.extend(CustomizationScreen.prototype, HorizontalMenuMixin);

Screens['Customization'] = CustomizationScreen;
