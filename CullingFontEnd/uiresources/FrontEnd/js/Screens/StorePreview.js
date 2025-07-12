const StorePreviewSelector = document.getElementById("store-preview-menu");

//Add your CSS files here
 $('head').append('<link rel="stylesheet" type="text/css" href="css/Screens/StorePreview.css">');


var StorePreviewDataArray = [];

function StorePreview()
{
  BaseMenuScreen.call(this);
  this.Selector = StorePreviewSelector;
  this.ActiveMenu = document.getElementById("store-preview-list-container");
  this.ScreenActions = [{value: "Select"}, {value:"Back"}];
  this.ActiveMenuID = "store-preview-list-container";
  this.ScreenLists = ["store-preview-list-container", "store-preview-purchase-button-container"];
  this.ScreenName = "StorePreview";
}

StorePreview.prototype = Object.create(BaseMenuScreen.prototype);
StorePreview.prototype.constructor = StorePreview;

// rivets.bind($(LootboxSelector), {
//   screenData : StorePreviewData
// });

StorePreview.prototype.OnShow = function()
{
  //StorePreview.SetStoreItemsForPurchase();
  BaseMenuScreen.prototype.OnShow.call(this);
  engine.call("SetStorePreviewCamera");
  StorePreview.CreateStoreItemElements();
  StorePreview.SetStorePreviewItem(document.getElementById("store-preview-list").firstChild);
}

StorePreview.prototype.OnHide = function()
{
  BaseMenuScreen.prototype.OnHide.call(this);
}

StorePreview.prototype.OnClosed = function()
{
  engine.call("ClearStorePreviewController");
  engine.call("ResetCustomizationPreview");
  engine.call("PostSoundEvent", "Stop_AllTauntsCelebs");
  console.log("StorePreview OnClosed");
  console.log("StorePreviewController.Items.length " + StorePreviewController.Items.length);
  // StorePreviewController.Items.splice(0, StorePreviewController.Items.length);
  // StorePreviewController.Name = "";
  // StorePreviewController.ProductID = 0;
  // StorePreviewController.NumberOfItems = 0;
  // StorePreviewController.Cost = "";
  // StorePreviewController.PremiumCost = "";
  // StorePreviewController.bPurchasableByDollars = false;
	// StorePreviewController.bPurchasableByPremium = false;
  // StorePreviewController.DLCAppId = 0;
  // StorePreviewController.bIsOwned = false;
  // UpdateJSModel(StorePreviewController);
  BaseMenuScreen.prototype.OnClosed.call(this);
}

StorePreview.prototype.OnCreation = function()
{
  // engine.call("GetPurchasableItemsList", "Store").then(function(items) {
  //   console.log(JSON.stringify(items.PurchaseableItems[0]));
  //   StorePreviewDataArray = items.PurchaseableItems;
  //   StorePreview.CreateStoreItemElements();
  //   console.log(JSON.stringify(StorePreviewDataArray[0]));
  // });
  this.OnShow();
}

StorePreview.prototype.OnMenuActionClicked = function(MenuAction){
  if(MenuAction == "OpenBox"){
    console.log("Open Box");
  }
  BaseMenuScreen.prototype.OnMenuActionClicked.call(this, MenuAction);
}

StorePreview.prototype.OnButtonPressed = function(button)
{
  console.log("ONBUTTONPRESSED StorePreview");
  if(button == btn_Left)
  {
    // this.IncrementSelection(-1);
  }
  else if(button == btn_Right)
  {
    // this.IncrementSelection(1);
  }
  else if(button == btn_Down)
  {
    var currFocus = document.activeElement;
    var elemIndex = $(currFocus).index();
    if(this.ActiveMenu.getElementsByTagName("li").length == (elemIndex + 1))
    {
      if(!StorePreviewController.bIsOwned)
      {
        this.IncrementLists(1);
      }
      else
      {
        this.IncrementSelection(1);
      }
    }
    else
    {
      this.IncrementSelection(1);
    }
  }
  else if(button == btn_Up)
  {
    var currFocus = document.activeElement;
    var elemIndex = $(currFocus).index();
    if(elemIndex == 0)
    {
      if(this.ActiveMenuID == "store-preview-list-container")
      {
        if(!StorePreviewController.bIsOwned)
        {
          this.IncrementLists(-1);
        }
        else
        {
          this.IncrementSelection(-1);
        }
      }
      else
      {
        this.IncrementLists(-1);
      }
    }
    else
    {
      this.IncrementSelection(-1);
    }
  }
  else if(button == btn_Select)
  {
    var focusedItem = document.activeElement;
    if(focusedItem != undefined)
    {
      var event = document.createEvent("MouseEvents");
      event.initEvent('mousedown', true, true);
      focusedItem.dispatchEvent(event);
    }
  }
  else if(button == btn_Back && this.CanPopScreen())
  {
    PopScreen();
  }
  else if(button == btn_LT)
  {

  }
  else if(button == btn_RT)
  {

  }
  else if(button == btn_Pause)
  {
    console.log("btn_Pause");
    OpenCurrencyPurchaseWidget();
  }
}

// StorePreview.prototype.OnButtonPressed = function(button){
//   if(String(button) == "0"){
//     StorePreview.OpenLootBox();
//   }
//   BaseMenuScreen.prototype.OnButtonPressed.call(this, button);
// }

StorePreview.SetStoreItemsForPurchase = function(items)
{
  console.log(JSON.stringify(items[0]));
}

// StorePreview.OnClickPreviewItems = function(element)
// {
//   var elemIndex = $(element).index();
//
//   engine.call("GetPreviewItemsList", StorePreviewDataArray[elemIndex].ProductID).then(function(items)
//   {
//     StorePreviewController.Items = items.PurchaseableItems;
//     UpdateJSModel(StorePreviewController);
//     PushScreen("StorePreview");
//   });
//   console.log(elemIndex);
//   console.log(JSON.stringify(StorePreviewDataArray[elemIndex]));
// }

StorePreview.SetStorePreviewItem = function(element)
{
    var elemIndex = $(element).index();
    console.log(JSON.stringify(StorePreviewController.Items));
    console.log(elemIndex);
    if(StorePreviewController.Items.length > 0)
    {
      if(StorePreviewController.Items[elemIndex] != undefined && StorePreviewController.Items[elemIndex].ProductID != undefined)
      {
        console.log("SetStorePreviewItem " + StorePreviewController.Items[elemIndex].ProductID);
        var nProductIDInt = parseInt(StorePreviewController.ProductID, 10);
        var nItemID = parseInt(StorePreviewController.Items[elemIndex].ProductID, 10);
        engine.call("SetStorePreviewItem", nProductIDInt, elemIndex).then(function(itemNames){
          console.log(itemNames[0]);
          var itemList = document.getElementById("store-preview-item-list");
          var fc = itemList.firstChild;

          while(fc){
            itemList.removeChild(fc);
            fc = itemList.firstChild;
          }
          for(var i = 0; i < itemNames.length; ++i)
          {
            var liTag = document.createElement("li");
            liTag.textContent = itemNames[i];
            itemList.appendChild(liTag);
          }
          if(itemNames.length > 1)
          {
            document.getElementById("store-preview-item-list-container").classList.remove("hidden");
          }
          else
          {
            document.getElementById("store-preview-item-list-container").classList.add("hidden");
          }
        });
      }
    }
}

StorePreview.CreateStoreItemElements = function()
{
  var storeList = document.getElementById("store-preview-list");
  var fc = storeList.firstChild;

  while( fc ) {
      storeList.removeChild( fc );
      fc = storeList.firstChild;
  }
  //console.log("StorePreviewDataArray = " + JSON.stringify(StorePreviewDataArray[0]));
  for(var i = 0; i < StorePreviewController.Items.length; ++i)
  {
    var liTag = document.createElement("li");
    liTag.setAttribute("tabindex", "0");
    liTag.addEventListener("mousedown", function(){StorePreview.SetStorePreviewItem(this)});
    liTag.textContent = StorePreviewController.Items[i].ProductName;

    storeList.appendChild(liTag);
  }
  GetActiveScreen().SetNewActiveMenu(document.getElementById("store-preview-list-container"));

}

StorePreview.PurchasePreviewedItem = function()
{
  console.log("PurchasePreviewedItem");
  console.log("StorePreviewController.DLCAppId " + StorePreviewController.DLCAppId);
  var nProductIDInt = parseInt(StorePreviewController.ProductID, 10);
  var nPremiumCurrency = ClientwebData.PremiumCurrency;
  var nPremiumCost = parseInt(StorePreviewController.PremiumCost, 10);
  if(!StorePreviewController.bIsOwned)
  {
    if(StorePreviewController.DLCAppId == 0)
    {
      if (nPremiumCurrency >= nPremiumCost) //Check to see if we have the appropriate funds
      {
        var modalArgs = {
          options: ["YES", "NO"],
          title:"Purchase " + StorePreviewController.Name + "? <img src='/images/token.png' class='token-icon'>" + StorePreviewController.PremiumCost,
          bSupportsBackButton: true,
          modalID: "StorePurchaseConfirm",
          callback: function(option){
            if (option == "YES") {
              engine.call("PremiumPurchase", nProductIDInt, true);
              PopModal();
            }
            else {
              PopModal();
            }
          }
        };
      }
      else
      {
        var modalArgs = {
          options: ["YES", "NO"],
          title:"You need more Tokens. Purchase more Now?",
          bSupportsBackButton: true,
          modalID: "StorePurchaseConfirm",
          callback: function(option){
            if (option == "YES") {
              OpenCurrencyPurchaseWidget();
              PopModal();
            }
            else {
              PopModal();
            }
          }
        };
      }
      PushModal('Modal', modalArgs);
    }
    else
    {
      engine.call("IsStoreOverlayEnabled").then(function(isEnabled){
        if(!isEnabled)
        {
          var modalArgs = {
            options: ["OK"],
            title:"You currently have Steam Overlay disabled. Please enable to make your purchase.",
            bSupportsBackButton: true,
            modalID: "StoreOverlayEnabled",
            callback: function(option){
              if (option == "OK") {
                ClientwebData.PendingRealMoneyPurchaseProductID = 0;
                PopModal();
              }
            }
          };
          PushModal('Modal', modalArgs);
        }
        else
        {
          engine.call("PurchaseDLC", StorePreviewController.DLCAppId, StorePreviewController.XboxProductId);
        }
      });

    }
  }
}


// $.extend(ProfileScreen.prototype, HorizontalMenuMixin);

Screens['StorePreview'] = StorePreview;
