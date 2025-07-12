const PurchaseWidgetSelector = document.getElementById("purchase-widget-menu");

//Add your CSS files here
 $('head').append('<link rel="stylesheet" type="text/css" href="css/Screens/StoreWidget.css">');

var PurchaseWidgetDataItem = {
  ProductName : "",
  ProductID : 0,
  Category : "",
  bNew : false,
  bFeatured : false,
  Image : "",
  Description : "",
  Cost : ""
}

var PurchaseWidgetDataArray = [];

var purchaseItemCategory = "Crates";
var bIsAbleToClose = false;
rivets.bind($('#purchase-widget-menu'), {
  ClientwebData : ClientwebData,
  FooterData : FooterData
});

function PurchaseWidget()
{
  BaseMenuScreen.call(this);
  this.Selector = PurchaseWidgetSelector;
  this.ActiveMenu = document.getElementById("purchase-widget-options-container");
  //this.ScreenActions = [{value:"Back"}];
  this.ScreenName = "PurchaseWidget";
}

PurchaseWidget.prototype = Object.create(BaseMenuScreen.prototype);
PurchaseWidget.prototype.constructor = PurchaseWidget;

// rivets.bind($(LootboxSelector), {
//   screenData : PurchaseWidgetData
// });

PurchaseWidget.prototype.OnShow = function()
{
  // console.log("OnShow PurchaseWidget");
  console.log(PurchaseWidgetController.Category[PurchaseWidgetController.ActiveCategory]);
  engine.call("GetPurchasableItemsList", PurchaseWidgetController.Category[PurchaseWidgetController.ActiveCategory], "PurchaseWidgetGetSuccess", "PurchaseWidgetGetFail");
  //PurchaseWidget.SetStoreItemsForPurchase();
  BaseMenuScreen.prototype.OnShow.call(this);
}

PurchaseWidget.prototype.OnHide = function()
{
  // console.log("OnHide PurchaseWidget");
  if (ClientwebData.PendingRealMoneyPurchaseProductID == 0 && bIsAbleToClose)
  {
    // console.log("OnHide PurchaseWidget true " + bIsAbleToClose);
    BaseMenuScreen.prototype.OnHide.call(this);
    PurchaseWidget.ShowPendingModal(true);
    bIsAbleToClose = false;
  }
}

PurchaseWidget.prototype.OnClosed = function()
{
  // console.log("OnClosed PurchaseWidget");
  if (ClientwebData.PendingRealMoneyPurchaseProductID == 0 && bIsAbleToClose)
  {
    // console.log("OnClosed PurchaseWidget true " + bIsAbleToClose);
    BaseMenuScreen.prototype.OnClosed.call(this);
    PurchaseWidget.ShowPendingModal(true);
    bIsAbleToClose = false;
  }
}

PurchaseWidget.prototype.OnCreation = function()
{
  console.log("OnCreation");
  this.OnShow();
}

engine.on("PurchaseWidgetGetSuccess", function (items) {
  console.log(JSON.stringify(items.Level3Items[0]));
  PurchaseWidgetDataArray = items.Level3Items;
  PurchaseWidget.CreateStoreItemElements();
  console.log(JSON.stringify(PurchaseWidgetDataArray[0]));
  PurchaseWidget.ShowPendingModal(false);
  bIsAbleToClose = true;
  GetActiveScreen().GetMenuItems()[0].focus();
});

engine.on("PurchaseWidgetGetFail", function (message) {
    console.log("PurchaseWidgetGetFail");
  if(message != '')
  {
    console.log(message);
  }
  bIsAbleToClose = true;
});

PurchaseWidget.prototype.OnMenuActionClicked = function(MenuAction){

  BaseMenuScreen.prototype.OnMenuActionClicked.call(this, MenuAction);
}

PurchaseWidget.prototype.OnButtonPressed = function(button)
{
  console.log("ONBUTTONPRESSED PurchaseWidget");
  if(button == btn_Left)
  {
    this.IncrementSelection(-1);
  }
  else if(button == btn_Right)
  {
    this.IncrementSelection(1)
  }
  else if(button == btn_Down)
  {
    // this.IncrementSelection(1);
  }
  else if(button == btn_Up)
  {
    // this.IncrementSelection(-1);
  }
  else if(button == btn_Select)
  {
    var focusedItem = document.activeElement;
    if(focusedItem != undefined)
    {
      var event = document.createEvent("MouseEvents");
      event.initEvent('click', true, true);
      focusedItem.dispatchEvent(event);
    }
  }
  else if(button == btn_Back && this.CanPopScreen() && bIsAbleToClose)
  {
    PurchaseWidget.OnClickCloseButton();
  }
  else if(button == btn_LT)
  {

  }
  else if(button == btn_RT)
  {

  }
}

// PurchaseWidget.prototype.OnButtonPressed = function(button){
//   if(String(button) == "0"){
//     PurchaseWidget.OpenLootBox();
//   }
//   BaseMenuScreen.prototype.OnButtonPressed.call(this, button);
// }

PurchaseWidget.ShowPendingModal = function(value)
{
  console.log("ClientwebData.PendingRealMoneyPurchaseProductID: " + ClientwebData.PendingRealMoneyPurchaseProductID);
  if(value)
  {
    document.getElementById("loading-purchasable-items-container").classList.remove("hidden");
    document.getElementById("purchase-widget-options-container").classList.add("hidden");
  }
  else
  {
    document.getElementById("loading-purchasable-items-container").classList.add("hidden");
    document.getElementById("purchase-widget-options-container").classList.remove("hidden");
  }
}

PurchaseWidget.SetStoreItemsForPurchase = function(items)
{
  console.log(JSON.stringify(items[0]));
}

PurchaseWidget.OnClickCloseButton = function()
{
  // console.log("OnClickCloseButton " + ClientwebData.PendingRealMoneyPurchaseProductID);
  if(PurchaseWidgetController.ActiveCategory == 0)
  {
    // console.log("PurchaseWidgetController.ActiveCategory " + PurchaseWidgetController.ActiveCategory);
    if(PurchaseWidgetController.ReturnToCrates)
    {
      // console.log("PurchaseWidgetController.ReturnToCrates true ");
      PurchaseWidgetController.ActiveCategory = 1;
      UpdateJSModel(PurchaseWidgetController);
      engine.call("GetPurchasableItemsList", PurchaseWidgetController.Category[PurchaseWidgetController.ActiveCategory], "PurchaseWidgetGetSuccess", "PurchaseWidgetGetFail");
    }
    else
    {
      // console.log("PurchaseWidgetController.ReturnToCrates false ");
      PurchaseWidgetController.ReturnToCrates = false;
      if (ClientwebData.PendingRealMoneyPurchaseProductID == 0 && bIsAbleToClose)
      {
        PopScreen();
      }
    }
  }
  else
  {
    // console.log("PurchaseWidgetController.ActiveCategory " + PurchaseWidgetController.ActiveCategory);
    PurchaseWidgetController.ReturnToCrates = false;
    if (ClientwebData.PendingRealMoneyPurchaseProductID == 0 && bIsAbleToClose)
    {
      PopScreen();
    }
  }

}

PurchaseWidget.OnClickPurchaseItem = function(element)
{
    var elemIndex = $(element).index();
    console.log("PurchaseWidgetController.ActiveCategory = " + PurchaseWidgetController.ActiveCategory);

  if(PurchaseWidgetController.ActiveCategory == 1)
  {
      var nPremiumCurrency = ClientwebData.PremiumCurrency;
      var nPremiumCost = parseInt(PurchaseWidgetDataArray[elemIndex].PremiumCost, 10);
      console.log("nPremiumCurrency= " + nPremiumCurrency);
      console.log("nPremiumCost = " + nPremiumCost);

    if (nPremiumCurrency >= nPremiumCost) //Check to see if we have the appropriate funds
    {
      var modalArgs = {
        options: ["YES", "NO"],
        title:"Purchase " + PurchaseWidgetDataArray[elemIndex].ProductName + " for <img src='/images/token.png' style='width: 2vw; padding: 0; margin: 0; display: inline;'>" + PurchaseWidgetDataArray[elemIndex].PremiumCost,
        bSupportsBackButton: true,
        modalID: "CratePurchaseConfirm",
        callback: function(option){
          if (option == "YES") {
            engine.call("PremiumPurchase", PurchaseWidgetDataArray[elemIndex].ProductID, true);
            PopModal();
          }
          else {
            PopModal();
          }
        }
      };
      console.log("call PremiumPurchase");
      PushModal('Modal', modalArgs);
    }
    else
    {
      var modalArgs = {
        options: ["YES", "NO"],
        title:"You need more Tokens. Purchase more Now?",
        bSupportsBackButton: true,
        modalID: "CratePurchaseConfirm",
        callback: function(option){
          if (option == "YES") {
            console.log("Show purchase premium currency screen.");
            PurchaseWidgetController.ActiveCategory = 0;
            PurchaseWidgetController.ReturnToCrates = true;
            UpdateJSModel(PurchaseWidgetController);
            engine.call("GetPurchasableItemsList", PurchaseWidgetController.Category[PurchaseWidgetController.ActiveCategory], "PurchaseWidgetGetSuccess", "PurchaseWidgetGetFail");
            PopModal();
          }
          else {
            PopModal();
          }
        }
      };

      PushModal('Modal', modalArgs);
    }
  }
  else if(PurchaseWidgetController.ActiveCategory == 0)
  {
        console.log("PendingRealMoneyPurchaseProductID = " + ClientwebData.PendingRealMoneyPurchaseProductID);
        if (ClientwebData.PendingRealMoneyPurchaseProductID == 0)
        {
            ClientwebData.PendingRealMoneyPurchaseProductID = PurchaseWidgetDataArray[elemIndex].ProductID;
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
                engine.call("PurchaseRealMoneyItem", PurchaseWidgetDataArray[elemIndex].ProductID, PurchaseWidgetDataArray[elemIndex].ProductName, PurchaseWidgetDataArray[elemIndex].XboxProductId);
              }
            });
            if(g_PlateformSettings.bIsPC)
            {
              PurchaseWidget.ShowPendingModal(true);
            }

            if(g_PlateformSettings.bIsXbox)
            {
              ClientwebData.PendingRealMoneyPurchaseProductID = 0;
            }
        }
  }

  console.log(elemIndex);
  console.log(JSON.stringify(PurchaseWidgetDataArray[elemIndex]));
}


PurchaseWidget.CreateStoreItemElements = function()
{
  document.getElementById("purchase-widget-title").textContent = PurchaseWidgetPageData[PurchaseWidgetController.Category[PurchaseWidgetController.ActiveCategory]].Title;
  document.getElementById("purchase-widget-subtitle").textContent = PurchaseWidgetPageData[PurchaseWidgetController.Category[PurchaseWidgetController.ActiveCategory]].Subtitle;
  var storeList = document.getElementById("purchase-widget-list");
  var fc = storeList.firstChild;

  while( fc ) {
      storeList.removeChild( fc );
      fc = storeList.firstChild;
  }
  console.log(JSON.stringify(PurchaseWidgetDataArray[3]));
  for(var i = 0; i < PurchaseWidgetDataArray.length; ++i)
  {
    var liTag = document.createElement("li");
    liTag.setAttribute("tabindex", "0");
    liTag.addEventListener("click", function(){PurchaseWidget.OnClickPurchaseItem(this)});
    if(PurchaseWidgetController.ActiveCategory == 0)
    {
      liTag.style.backgroundImage = "url('/images/Store/" + PurchaseWidgetDataArray[i].ProductID + ".png')";
    }
    else
    {
      liTag.classList.add("cullcrate-bg");
    }
    // var imageDiv = document.createElement("div");
    // imageDiv.classList.add("item-image");
    var costDiv = document.createElement("div");
    costDiv.classList.add("info-box");
    var itemName = document.createElement("h1");
    itemName.textContent = PurchaseWidgetDataArray[i].DisplayName;
    var itemDescriptionContainer = document.createElement("div");
    itemDescriptionContainer.classList.add("purchase-item-description-container");
    var itemDescription = document.createElement("span");
    itemDescription.classList.add("purchase-item-description");
    var itemDescriptionBonus = document.createElement("span");
    itemDescriptionBonus.classList.add("purchase-item-bonus");
    if(PurchaseWidgetDataArray[i].Description.indexOf("+") > -1)
    {
      var descripton = PurchaseWidgetDataArray[i].Description.split("+");
      itemDescription.textContent = descripton[0];
      itemDescriptionBonus.textContent = "+" + descripton[1];
    }
    else
    {
      itemDescription.textContent = PurchaseWidgetDataArray[i].Description;
    }

    var itemCost = document.createElement("h2");
    if(PurchaseWidgetDataArray[i].bPurchasableByDollars)
    {
      if(g_PlateformSettings.bIsPC)
      {
        itemCost.textContent = PurchaseWidgetDataArray[i].Cost;
      }
      else
      {
        itemCost.textContent = "";
      }
    }
    else if(PurchaseWidgetDataArray[i].bPurchasableByPremium)
    {
      //Add premium currency icon here
      var tokenIcon = document.createElement("img");
      tokenIcon.src = "/images/token.png";
      tokenIcon.classList.add("token-icon");
      itemCost.appendChild(tokenIcon);
      itemCost.innerHTML += PurchaseWidgetDataArray[i].PremiumCost;
    }


    costDiv.appendChild(itemName);
    itemDescriptionContainer.appendChild(itemDescription);
    itemDescriptionContainer.appendChild(itemDescriptionBonus);
    costDiv.appendChild(itemDescriptionContainer);
    costDiv.appendChild(itemCost);
    // liTag.appendChild(imageDiv);
    liTag.appendChild(costDiv);
    storeList.appendChild(liTag);
  }
  GetActiveScreen().SetNewActiveMenu(document.getElementById("purchase-widget-options-container"));

}


// $.extend(ProfileScreen.prototype, HorizontalMenuMixin);

Screens['PurchaseWidget'] = PurchaseWidget;
