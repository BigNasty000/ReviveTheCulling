//Add your CSS files here
$('head').append('<link rel="stylesheet" type="text/css" href="css/Screens/DynAppearanceItems.css">');

function DynAppearanceItemScreen(args)
{
  BaseMenuScreen.call(this);
  this.custType = args.custType;
  this.category = args.category;
  this.Selector = document.getElementById("AppearanceItemScreen");
  //Allow us to push in a Localization Function, mostly used for the Screen name itself
  if(args.locFunction != undefined)
  {
    this.locFunction = args.locFunction;
  }

  this.InitDynGen(args.elemSource);
  this.ScreenActions = [{value:"Select"}, {value:"Back"}];
  this.screenData = {
    Items : [],
    ScreenName : "",
    PreviewItem : {},
    //AvailableCurrency : -1,
  };
  this.CurrencyElement = {};
}

var ClickedItemIndex = 0;
var bHasScreenBeenCreated = false;
var previewItemId = 0;
rivets.formatters.showBadgeForItem = function(isNew, isUnlocked)
{
    /*if(item == undefined){
      return false;
    }*/
    return (isNew || !isUnlocked);
}

DynAppearanceItemScreen.prototype = Object.create(BaseMenuScreen.prototype);
DynAppearanceItemScreen.prototype.constructor = DynAppearanceItemScreen;

DynAppearanceItemScreen.prototype.GetScreenName = function(){
  console.log(this.category);
  console.log(this.custType);
    return this.category.toUpperCase();
}

DynAppearanceItemScreen.prototype.OnShow = function()
{
  console.log(JSON.stringify(this.screenData.Items[0]));
  switch(this.custType)
  {
    case "hair":
      engine.call("SetHeadCamera");
      break;
    case "hat":
      engine.call("SetCharacterCamera");
      break;
    case "torso":
      engine.call("SetCharacterCamera");
      break;
    case "legs":
      engine.call("SetCharacterCamera");
      break;
     case "card":
       engine.call("SetCharacterCamera");
       break;
     case "taunt":
       engine.call("SetCharacterCamera");
       break;
     case "celebration":
       engine.call("SetCharacterCamera");
       break;
     case "weapitem":
       engine.call("SetWeaponsCamera");
       break;
    default:
      console.warn("Unsopported Customization Type: " + this.custType);
      //this.RefreshItems();
      // return;
  }

  BaseMenuScreen.prototype.OnShow.call(this);
  this.RefreshItems(previewItemId);
  //this.SetPreviewItem(this.screenData.Items[0]);
}

DynAppearanceItemScreen.prototype.OnCreation = function()
{
  this.OnCreation_DynGen();
  //console.log(this.Selector);
  this.ActiveMenu = $(this.Selector).find(".vertical-list-menu")[0];
  //console.log(this.ActiveMenu);
  this.rivetsBinder = rivets.bind($(this.Selector), {
    screenData : this.screenData,
    FooterData : FooterData
  });
  // console.log(this.Selector.innerHTML);
  this.CurrencyElement = $(this.Selector).find(".currency-container")[0]

  //this.screenData.ScreenName = this.category.toUpperCase() + " (" + this.custType.toUpperCase() + ")";
  this.screenData.ScreenName = this.GetScreenName();
  //this.RefreshItems(previewItemId);
  bHasScreenBeenCreated = true;
  this.OnShow();
  //this.RefreshCurrency();
  // console.log(this.custType);
  // console.log(this.category);this.RefreshItems();
  // engine.call("GetItemsForCustAndCat", this.custType, this.category).then($.proxy(function(items){
  //   console.log("Got Items")
  //   if(items.length > 0)
  //   {
  //     this.OnGetItems(items);
  //     this.SetPreviewItem(items[0]);
  //   }
  //
  //   this.OnShow();
  // }, this));
  // this.rivetsBinder.update({screenData : this.screenData});
}

/*
DynAppearanceItemScreen.prototype.RefreshCurrency = function()
{
  engine.call("GetAvailableCurrency").then($.proxy(function(currency){
    if(this.screenData.AvailableCurrency == -1)
    {
      this.screenData.AvailableCurrency = currency;
    }
    else
    {
        var tweenable = new Tweenable();
        var preCurr = this.screenData.AvailableCurrency;
        var self = this;
        tweenable.tween({
          from: { 'curr': preCurr },
          to: { 'curr': currency },
          duration: 500,
          step: function(state){
            self.screenData.AvailableCurrency = Math.floor(state["curr"]);
          },
          finish: function(state){
            self.screenData.AvailableCurrency = currency;

          }
        });
    }
    console.log("Currency Refreshed: " + currency);
  },this));
}
*/
DynAppearanceItemScreen.prototype.RefreshItems = function(forceIdx)
{
  console.log("forceIdx " + forceIdx);
  engine.call("GetItemsForCustAndCat", this.custType, this.category).then($.proxy(function(items){
    console.log("Got Items")
    this.OnGetItems(items);
    console.log("forceIdx " + forceIdx);
    if(parseInt(forceIdx, 10) > this.screenData.Items.length)
    {
      for (var i = 0; i < this.screenData.Items.length; ++i)
      {
         // console.log("screendata " + JSON.stringify(this.screenData.Items[i]));
         // console.log("items " + JSON.stringify(items[i]));
        if (parseInt(this.screenData.Items[i].ItemID, 10) == parseInt(forceIdx, 10))
        {
          forceIdx = i;
          ClickedItemIndex = i;
        }
      }
    }
    console.log("forceIdx " + forceIdx);
    if(forceIdx != undefined)
    {
      this.ForceFocusIndex(forceIdx);
      console.log("RefreshItems SetPreviewItem 1");
      this.SetPreviewItem(this.screenData.Items[forceIdx]);
    }
    else
    {
      if(ClickedItemIndex != 0)
      {
        // console.log(JSON.strigify(items));
        console.log("RefreshItems SetPreviewItem 2" + ClickedItemIndex);
        this.SetPreviewItem(this.screenData.Items[ClickedItemIndex]);
      }
      else
      {
        console.log("RefreshItems SetPreviewItem 3");
        this.SetPreviewItem(this.screenData.Items[0]);
      }
    }
    this.rivetsBinder.update({screenData : this.screenData});
  }, this));

}

DynAppearanceItemScreen.prototype.UnlockEntitlement = function(entitlementID)
{
  console.log("previewItemId " + previewItemId);
  console.log("DynAppearanceItemScreen.prototype.UnlockEntitlement");
  if (this.screenData.Items != undefined)
  {
    for (var i = 0; i < this.screenData.Items.length; i++) {
		if (this.screenData.Items[i].ItemID == entitlementID) {
			console.log("Found item that was unlocked.");
			this.screenData.Items[i].bIsUnlocked = true;
      engine.call("SetCustomization", this.screenData.Items[i].AssetName, this.custType).then($.proxy(function(){
        console.log("Refreshing Items");
        console.log("previewItemId " + previewItemId);
        this.RefreshItems(previewItemId);
      }, this));
		}
	}
  }
}

DynAppearanceItemScreen.prototype.OnHide = function()
{
  ClickedItemIndex = 0;
  bHasScreenBeenCreated = false;
  BaseMenuScreen.prototype.OnHide.call(this);
}

DynAppearanceItemScreen.prototype.OnClosed = function()
{
  engine.call("PostSoundEvent", "Stop_AllTauntsCelebs");
  engine.call("ResetCustomizationPreview");
  if(this.rivetsBinder != undefined)
  {
    this.rivetsBinder.unbind();
  }
  bHasScreenBeenCreated = false;
  this.OnClosed_DynGen();
  ClickedItemIndex = 0;
}

DynAppearanceItemScreen.prototype.OnSelectionChanged = function(elem)
{
  console.log("DynAppearanceItemScreen OnSelectionChanged");
  if(elem.dataset && elem.dataset.index)
  {
    var index = Number(elem.dataset.index);
    if(index < this.screenData.Items.length)
    {
      var Item = this.screenData.Items[index];

      //this.SetPreviewItem(Item);

      if(Item.bIsUnlocked == true)
      {
        this.ScreenActions[0].value = "Equip";
        //console.log("Set Equip");
      }
      else if(Item.bIsPurchasable == true)
      {
        this.ScreenActions[0].value = "Purchase";
        //console.log("Set Purchase");
      }
      else
      {
        this.ScreenActions[0].value = "Locked";
      }

      //SetScreenActions(this.ScreenActions);

      // if(Item.bIsNew)
      // {
      //   Item.bIsNew = false;
      //   engine.call("SetEntitlementSeen", Item.ItemID);
        //this.screenData.Items[index] = Item;
        // this.rivetsBinder.update({ screenData: this.screenData });
        //this.RefreshItems();
      // }
    }
  }
}

DynAppearanceItemScreen.prototype.SetPreviewItem = function(Item)
{
    //console.log("PreviewItem");
    console.log(JSON.stringify(Item));
    GetActiveScreen().screenData.PreviewItem = {};
    GetActiveScreen().rivetsBinder.update({screenData : this.screenData});
    GetActiveScreen().screenData.PreviewItem = Item;
    console.log("Calling SetPreviewItem with " + JSON.stringify(GetActiveScreen().screenData.PreviewItem));
    //this.rivetsBinder.update({screenData : this.screenData});
    //console.log("Calling SetPreviewItem with " + Item.AssetName + " & " + this.custType);
    if(Item != undefined)
    {
      if(Item.ItemID != undefined)
      {
        engine.call("SetPreviewItem", Item.ItemID, this.custType);
      }
    }
    var preItem = document.getElementsByClassName("active-preview-item")[0];
    if(preItem){
      console.log("REMOVE ACTIVE Selected");
      preItem.classList.remove("active-preview-item");
    }
}


DynAppearanceItemScreen.prototype.StartPurchaseProcess = function()
{
  //**********Check to see if we can use this --> this.screenData.PreviewItem

  var Item = GetActiveScreen().screenData.PreviewItem;
  console.log(ClickedItemIndex);

  if(Item.bIsPurchasable && (Number(Item.Cost) <= (Number(ClientwebData.CullCredits))))
  {
    if (IsOnline()) {
      //var self = this; //Double Proxy doesn't work - this is cleaner
      var modalArgs = {
        options: ["Yes", "Cancel"],
        title:"Purchase " + Item.DisplayName + "? <img src='/images/credit.png' style='width: 2vw; padding: 0; margin: 0; display: inline;'>" + Item.Cost,
        bSupportsBackButton: false,
        callback: function(option){
          if(option == "Yes" && IsOnline())
          {
            engine.call("TriggerPurchaseStarted");
            SendPurchaseEntitlementRequest(Item.ItemID);
            previewItemId = Item.ItemID;
            Item = GetActiveScreen().screenData.Items[ClickedItemIndex];
            Item.bIsNew = false;
            GetActiveScreen().RefreshItems(previewItemId);
            /*engine.call("PurchaseItem", Item.ItemID).then(function(result){
              if(result)
              {
                self.RefreshItems(ItemIndex);
                Item = self.screenData.Items[ItemIndex];
                Item.bIsNew = false;
                engine.call("SetEntitlementSeen", Item.ItemID)
                console.log("Setting purchased entitlement as seen");
                console.log("Purchase Successful");
              }
              else
              {
                console.log("Purchase Failed");
              }*/

              //self.RefreshCurrency();
              //Always refresh currency for now, so I can cheat to test :)
            /*});*/
          }
          else {
            engine.call("TriggerPurchaseCancelled");
          }
        }
      }

      PushModal('Modal', modalArgs);
      engine.call("TriggerPurchaseConfirm");
    }
    else {
      HandleRequireOnline();
    }
  }
  else if (Item.bIsPremiumPurchasable) {
      console.log("Selected Asset bIsPremiumPurchasable: " + Item.bIsPremiumPurchasable);
      console.log("Selected Asset PremiumPurchaseCost: " + Item.PremiumPurchaseCost);
      console.log("Selected Asset PremiumCurrency: " + ClientwebData.PremiumCurrency);

      if (Item.PremiumPurchaseCost <= ClientwebData.PremiumCurrency) {
          if (IsOnline()) {
              //var self = this; //Double Proxy doesn't work - this is cleaner
              var modalArgs = {
                  options: ["Yes", "Cancel"],
                  title: "Purchase " + Item.DisplayName + "? <img src='/images/token.png' style='width: 2vw; padding: 0; margin: 0; display: inline;'>" + Item.PremiumPurchaseCost,
                  bSupportsBackButton: false,
                  callback: function (option) {
                      if (option == "Yes" && IsOnline()) {
                          var nItemID = parseInt(Item.ItemID, 10);
                          previewItemId = Item.ItemID;
                          engine.call("PremiumPurchase", nItemID, false);
                          //SendPremiumPurchaseRequest(Item.ItemID);
                          Item = GetActiveScreen().screenData.Items[ClickedItemIndex];
                          Item.bIsNew = false;
                          GetActiveScreen().RefreshItems(previewItemId);
                      }
                      else {
                          engine.call("TriggerPurchaseCancelled");
                      }
                  }
              }

              PushModal('Modal', modalArgs);
              engine.call("TriggerPurchaseConfirm");
          }
          else {
              HandleRequireOnline();
          }
      }
      else {
          console.log("TODO Prompt to buy more PremiumCurrency ");
          // Prompt to buy more PremiumCurrency
          PurchaseWidgetController.ActiveCategory = 0;
          PurchaseWidgetController.ReturnToCrates = false;
          PurchaseWidgetController.ActiveCategory = 0;

          UpdateJSModel(PurchaseWidgetController);
          //engine.call("GetPurchasableItemsList", PurchaseWidgetController.Category[PurchaseWidgetController.ActiveCategory], "PurchaseWidgetGetSuccess", "PurchaseWidgetGetFail");
          PushScreen("PurchaseWidget");
      }
  }

}

DynAppearanceItemScreen.prototype.OnOptionElemSelected = function(elem)
{
  //console.log(ClientwebData.CullCredits);
  if(elem.dataset && elem.dataset.index)
  {
    var ItemIndex = Number(elem.dataset.index);
    ClickedItemIndex = ItemIndex;
    if(ItemIndex < this.screenData.Items.length && this.screenData.Items[ItemIndex] != undefined)
    {
      var Item = this.screenData.Items[ItemIndex];
      console.log("OnOptionElemSelected SetPreviewItem");
      this.SetPreviewItem(Item);
      console.log(JSON.stringify(Item));
      //this.SetPurchaseButtonInfo();
      console.log("Selected Asset: " + Item.AssetName);
      var preItem = document.getElementsByClassName("active-preview-item")[0];
      if(preItem){
        document.getElementsByClassName("active-preview-item")[0].classList.remove("active-preview-item");
      }

      elem.classList.add("active-preview-item");
    }
  }
}

DynAppearanceItemScreen.prototype.EquipPreviewedItem = function()
{
  var Item = GetActiveScreen().screenData.PreviewItem;
  previewItemId = GetActiveScreen().screenData.PreviewItem.ItemID;
  engine.call("SetCustomization", Item.AssetName, GetActiveScreen().custType).then($.proxy(function(){
    console.log("Refreshing Items");
    console.log("previewItemId " + previewItemId);
    GetActiveScreen().RefreshItems(previewItemId);
  }, this));
}

DynAppearanceItemScreen.prototype.SetPurchaseButtonInfo = function()
{
  var Item = this.screenData.PreviewItem;
  var notEnoughCurrencyText = document.getElementById("cust-purchase-need-currency");
  var isInBundleText = document.getElementById("cust-purchase-in-bundle");
  var purchaseBundleButton = document.getElementById("cust-purchase-bundle-button");

  console.log(JSON.stringify(Item));
  if(Item.PremiumPurchaseCost <= ClientwebData.PremiumCurrency) {
    notEnoughCurrencyText.classList.remove("hidden");
  }
  else
  {
    notEnoughCurrencyText.classList.add("hidden");
  }

  console.log(Item.ParentBundle);
  if(Item.ParentBundle == 0)
  {
    isInBundleText.classList.add("hidden");
    purchaseBundleButton.classList.add("hidden");
  }
  else
  {
    isInBundleText.classList.remove("hidden");
    purchaseBundleButton.classList.remove("hidden");
  }
}

DynAppearanceItemScreen.prototype.NotEnoughCurrency = function()
{
  var Item = GetActiveScreen().screenData.PreviewItem;
  if(Item.bIsPremiumPurchasable)
  {
    OpenCurrencyPurchaseWidget();
  }
  else
  {
    OpenCratePurchaseWidget();
  }
}

DynAppearanceItemScreen.prototype.OnGetItems = function(items)
{
  console.log("Got Items for " + this.custType + ": " + JSON.stringify(items));
  items.sort(function(a,b){
    // sort by rarity, then alphabetically
    var compareVal = (a.bIsUnlocked === b.bIsUnlocked ? (a.Rarity - b.Rarity) : (a.bIsUnlocked ? -1 : 1));

    if (compareVal == 0) {
      var assetNameA = a.DisplayName;
      var assetNameB = b.DisplayName;

      // item.AssetName | getLocalizedNameForCustomization
      compareVal = (assetNameA < assetNameB) ? -1 : (assetNameA > assetNameB);
    }
	  return compareVal;
	});
  var bNeedsFocusReset = (this.screenData.Items == undefined || (this.screenData.Items && this.screenData.Items.length == 0));
  this.screenData.Items = [];
  this.rivetsBinder.update({screenData : this.screenData});
  this.screenData.Items = items;

  if(bNeedsFocusReset)
  {
    //this.ResetFocus();
  }

  if(this.screenData.PreviewItem != undefined && this.screenData.PreviewItem != {})
  {
    for(var i = 0; i < items.length; ++i)
    {
      var Item = items[i];
      if(Item.ItemID == this.screenData.PreviewItem.ItemID)
      {
        this.screenData.PreviewItem = Item;
        break;
      }
    }
  }
console.log(this.screenData.PreviewItem);
  $(this.Selector).find('li').hover(function(event){
      if(event)
      {
        OnMouseHover(event.target);
      }
    });

    // , function(event){
    //   if(event)
    //   {
    //     event.target.blur();
    //     OnMouseOut(event.target);
    //   }
    // });
}

DynAppearanceItemScreen.prototype.UnequipItem = function()
{
  console.log("UnequipItem");
    engine.call("ClearCustomizationSlot", this.custType).then($.proxy(function(){
      console.log("Refreshing Items");
      this.RefreshItems();
    }, this));
}

DynAppearanceItemScreen.prototype.OnMenuActionClicked = function(MenuAction)
{
  BaseMenuScreen.prototype.OnMenuActionClicked.call(this, MenuAction);
  /*if(MenuAction == "Unequip")
  {
    this.UnequipItem();
  }*/
}

DynAppearanceItemScreen.prototype.OnKeyPressed = function(keyCode)
{
  BaseMenuScreen.prototype.OnKeyPressed.call(this, keyCode);
  /*if(keyCode == keyCodes.U)
  {
    this.UnequipItem();
  }*/
}

DynAppearanceItemScreen.prototype.OnButtonPressed = function(button)
{

  if(button == btn_Up)
  {
    this.IncrementSelection(-1);
    var focusedItem = this.GetFocusedItem();
    if(focusedItem != undefined)
    {
      this.OnOptionElemSelected(focusedItem);
    }
  }
  else if(button == btn_Down)
  {
    this.IncrementSelection(1);
    var focusedItem = this.GetFocusedItem();
    if(focusedItem != undefined)
    {
      this.OnOptionElemSelected(focusedItem);
    }
  }
  else if(button == btn_Right)
  {
    var focusedItem = this.GetFocusedItem();
    if(focusedItem != undefined)
    {
      if(this.IncrementOnElement != undefined)
      {
        this.IncrementOnElement(focusedItem, 1)
      }
    }
  }
  else if(button == btn_Left)
  {
    var focusedItem = this.GetFocusedItem();
    if(focusedItem != undefined)
    {
      if(this.IncrementOnElement != undefined)
      {
        this.IncrementOnElement(focusedItem, -1)
      }
    }
  }
  else if(button == btn_Select)
  {
    var focusedItem = this.GetFocusedItem();
    if(focusedItem != undefined)
    {
      if(this.screenData.PreviewItem != undefined && this.screenData.PreviewItem != {})
      {
        if(this.screenData.PreviewItem.bIsUnlocked)
        {
          this.EquipPreviewedItem();
        }
        else
        {
          if(checkIfPurchasable(this.screenData.PreviewItem.bIsPremiumPurchasable, this.screenData.PreviewItem.bIsPurchasable, this.screenData.PreviewItem.PremiumPurchaseCost, this.screenData.PreviewItem.Cost))
          {
            this.NotEnoughCurrency();
          }
          else
          {
            this.StartPurchaseProcess();
          }
        }
      }
      // console.log("OnButtonPressed " + button);
      // this.OnOptionElemSelected(focusedItem);
    }
  }
  /*else if(button == btn_Y)
  {
    this.UnequipItem();
  }*/
  else if(button == btn_LT)
  {
    this.IncrementPage(-1);
  }
  else if(button == btn_RT)
  {
    this.IncrementPage(1);
  }
  else if(button == btn_Pause)
  {
    console.log("btn_Pause");
    OpenCurrencyPurchaseWidget();
  }
  else if(button == btn_Y)
  {
    var focusedItem = this.GetFocusedItem();
    if(focusedItem != undefined)
    {
      if(this.screenData.PreviewItem != undefined && this.screenData.PreviewItem != {})
      {
        if(this.screenData.PreviewItem.ParentBundle != 0)
        {
          this.PurchaseParentBundle();
        }
      }
  	}
  }
  else
  {
    BaseMenuScreen.prototype.OnButtonPressed.call(this, button);
  }
}

function checkIfPurchasable(premiumPurchasable, purchasable, premium, cost){
	console.log(purchasable);
	console.log(premium);
	console.log(cost);
	if(premiumPurchasable || purchasable)
	{
		if(premiumPurchasable)
		{
			if(Number(premium) > Number(ClientwebData.PremiumCurrency))
			{
				return true;
			}
			else
			{
				return false;
			}
		}


		if(purchasable)
		{
			if(Number(cost) > Number(ClientwebData.CullCredits))
			{
				return true;
			}
			else
			{
				return false;
			}
		}
	}

	return false;
}

DynAppearanceItemScreen.prototype.PurchaseParentBundle = function()
{
    console.log("PurchaseParentBundle: " + GetActiveScreen().screenData.PreviewItem.ParentBundle);
  if(GetActiveScreen().screenData.PreviewItem.ParentBundle != 0)
  {
      var nItemID = GetActiveScreen().screenData.PreviewItem.ParentBundle;
      console.log("nItemID: " + nItemID);
      console.log("nItemID as int: " + parseInt(nItemID, 10));
    engine.call("GetParentBundleInfo", parseInt(nItemID, 10)).then(function(bundle)
    {
        console.log("GetParentBundleInfo " + JSON.stringify(bundle));


        StorePreviewController.Name = bundle.BundleName;
        StorePreviewController.ProductID = bundle.ProductID;
        StorePreviewController.NumberOfItems = bundle.NumberOfItems;
        StorePreviewController.Cost = bundle.Cost;
        StorePreviewController.PremiumCost = bundle.PremiumCost;
        StorePreviewController.DLCAppId = bundle.DLCAppId;
		StorePreviewController.XboxProductId = bundle.XboxProductId;
        StorePreviewController.bPurchasableByDollars = bundle.bPurchasableByDollars;
        StorePreviewController.bPurchasableByPremium = bundle.bPurchasableByPremium;

        engine.call("GetPreviewItemsList", parseInt(nItemID, 10)).then(function (items)
        {
            console.log("GetPreviewItemsList " + JSON.stringify(items));
            StorePreviewController.Items = items.Level3Items;

            if (items.bIsOwned != undefined) {
                StorePreviewController.bIsOwned = items.bIsOwned;
            }
            else {
                StorePreviewController.bIsOwned = false;
            }
            if (StorePreviewController.DLCAppId == 0) {
                StorePreviewController.bPurchasableByDollars = true;
                StorePreviewController.bPurchasableByPremium = false;
            }
            else {
                StorePreviewController.bPurchasableByDollars = false;
                StorePreviewController.bPurchasableByPremium = true;
            }
            UpdateJSModel(StorePreviewController);
            PushScreen("StorePreview");

        });
    });
  }

}

//$.extend(DynAppearanceItemScreen.prototype, VerticalMenuMixin);
$.extend(DynAppearanceItemScreen.prototype, DynGenMixin);
$.extend(DynAppearanceItemScreen.prototype, PawnPreviewMixin);

Screens['DynAppearanceItem'] = DynAppearanceItemScreen;
