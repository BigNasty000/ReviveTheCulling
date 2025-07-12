const StoreWidgetSelector = document.getElementById("store-widget-menu");

//Add your CSS files here
 $('head').append('<link rel="stylesheet" type="text/css" href="css/Screens/StoreWidget.css">');

var StoreWidgetDataItem = {
  ProductName : "",
  ProductID : 0,
  Category : "",
  bNew : false,
  bFeatured : false,
  Image : "",
  Description : "",
  Cost : ""
}
var bIsAbleToClose = false;
var Level3ItemsArray = [];
var Level1ItemsArray = [];
var Level2ItemsArray = [];

function StoreWidget()
{
  BaseMenuScreen.call(this);
  this.Selector = StoreWidgetSelector;
  this.ActiveMenu = document.getElementById("store-widget-featured-item-container");
  this.ScreenActions = [{value: "Select"}, {value:"Back"}];
  this.ActiveMenuID = "store-widget-featured-item-container";
  this.ScreenLists = ["store-widget-featured-item-container", "store-items-list-container", "store-widget-founders-item-container"];
  this.ScreenName = "StoreWidget";
}

StoreWidget.prototype = Object.create(BaseMenuScreen.prototype);
StoreWidget.prototype.constructor = StoreWidget;

// rivets.bind($(LootboxSelector), {
//   screenData : StoreWidgetData
// });

StoreWidget.prototype.OnShow = function()
{
  //StoreWidget.SetStoreItemsForPurchase();
  engine.call("GetPurchasableItemsList", "Store", "StoreWidgetGetSuccess", "StoreWidgetGetFail");
  BaseMenuScreen.prototype.OnShow.call(this);
  engine.call("SetStorePageCamera");
  console.log(this.ActiveMenu.innerHTML);
}

StoreWidget.prototype.OnHide = function()
{
  if (bIsAbleToClose)
  {
    document.getElementById("loading-store-items-container").classList.remove("hidden");
    document.getElementById("store-widget-menu-options").classList.add("hidden");
    bIsAbleToClose = false;
    BaseMenuScreen.prototype.OnHide.call(this);
  }
}

StoreWidget.prototype.OnClosed = function()
{
  if (bIsAbleToClose)
  {
    document.getElementById("loading-store-items-container").classList.remove("hidden");
    document.getElementById("store-widget-menu-options").classList.add("hidden");
    bIsAbleToClose = false;
    BaseMenuScreen.prototype.OnClosed.call(this);
  }
}

StoreWidget.prototype.OnCreation = function()
{

  this.OnShow();
}

engine.on("StoreWidgetGetSuccess", function (items) {

    Level3ItemsArray = items.Level3Items;
    Level1ItemsArray = items.Level1Items;
    Level2ItemsArray = items.Level2Items;

    StoreWidget.CreateFoundersItemElements();
    StoreWidget.CreateFeaturedItemElements();
    StoreWidget.CreateStoreItemElements();

    document.getElementById("loading-store-items-container").classList.add("hidden");
    document.getElementById("store-widget-menu-options").classList.remove("hidden");
    bIsAbleToClose = true;
    console.log("StoreWidgetGetSuccess:: " + Level3ItemsArray.length);
    console.log(JSON.stringify(Level3ItemsArray[0]));


    console.log(GetActiveScreen().ActiveMenu.innerHTML);
    GetActiveScreen().GetMenuItems()[0].focus();
});

engine.on("StoreWidgetGetFail", function (message) {
  if(message != '')
  {
    console.log(message);
  }
  bIsAbleToClose = true;
});

StoreWidget.prototype.OnMenuActionClicked = function(MenuAction){
  BaseMenuScreen.prototype.OnMenuActionClicked.call(this, MenuAction);
}

StoreWidget.prototype.OnButtonPressed = function(button)
{
  console.log(this.ActiveMenu.innerHTML);
  console.log("ONBUTTONPRESSED StoreWidget");
  if(button == btn_Left)
  {
    var currFocus = document.activeElement;
    var elemIndex = $(currFocus).index();
    if(this.ActiveMenuID == "store-items-list-container")
    {
      if(elemIndex % 3 == 0){
        console.log("MOVELIST");
        this.IncrementLists(-1);
      }else{
        this.IncrementSelection(-1);
      }
    }
    else
    {
      this.IncrementLists(-1);
    }

  }
  else if(button == btn_Right)
  {
    var currFocus = document.activeElement;
    var elemIndex = $(currFocus).index();
    console.log(elemIndex % 3);
    if(this.ActiveMenu.getElementsByTagName("li").length == (elemIndex + 1)){
      this.IncrementLists(1);
    }else{
      if(this.ActiveMenuID == "store-items-list-container"){
        if(elemIndex % 3 == 2){
          console.log("MOVELIST");
          this.IncrementLists(1);
        }else{
          this.IncrementSelection(1);
        }
      }else{
        this.IncrementLists(1);
      }
    }
  }
  else if(button == btn_Down)
  {
    if(this.ActiveMenuID != "store-items-list-container")
    {
      this.IncrementSelection(1);
    }
    else {
      this.IncrementSelection(3);
    }

  }
  else if(button == btn_Up)
  {
    if(this.ActiveMenuID != "store-items-list-container")
    {
      this.IncrementSelection(-1);
    }
    else {
      this.IncrementSelection(-3);
    }
  }
  else if(button == btn_Select)
  {
    console.log(document.activeElement.innerHTML);
    var focusedItem = document.activeElement;
    if(focusedItem != undefined)
    {
      var event = document.createEvent("MouseEvents");
      event.initEvent('click', true, true);
      focusedItem.dispatchEvent(event);
    }
  }
  else if(button == btn_Back && this.CanPopScreen())
  {
    if(bIsAbleToClose)
    {
      PopScreen();
    }
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

// StoreWidget.prototype.OnButtonPressed = function(button){
//   if(String(button) == "0"){
//     StoreWidget.OpenLootBox();
//   }
//   BaseMenuScreen.prototype.OnButtonPressed.call(this, button);
// }

StoreWidget.SetStoreItemsForPurchase = function(items)
{

}

StoreWidget.OnClickPreviewItems = function(element)
{
  var elemIndex = $(element).index();

  //engine.call("Cheat_PurchaseItem", Level3ItemsArray[elemIndex].ProductID, Level3ItemsArray[elemIndex].ProductName);
  engine.call("GetPreviewItemsList", Level3ItemsArray[elemIndex].ProductID).then(function(items)
  {
      console.log("GetPreviewItemsList");
    StorePreviewController.Items = items.Level3Items;
    StorePreviewController.Name = Level3ItemsArray[elemIndex].ProductName;
    StorePreviewController.ProductID = Level3ItemsArray[elemIndex].ProductID;
    StorePreviewController.NumberOfItems = items.NumberOfItems;
    StorePreviewController.Cost = Level3ItemsArray[elemIndex].Cost;
    StorePreviewController.PremiumCost = Level3ItemsArray[elemIndex].PremiumCost;
    StorePreviewController.DLCAppId = Level3ItemsArray[elemIndex].DLCAppId;
	StorePreviewController.XboxProductId = Level3ItemsArray[elemIndex].XboxProductId;
    if(items.bIsOwned != undefined){
      StorePreviewController.bIsOwned = items.bIsOwned;
    }
    else
    {
      StorePreviewController.bIsOwned = false;
    }
    if(StorePreviewController.DLCAppId == 0)
    {
      StorePreviewController.bPurchasableByDollars = true;
      StorePreviewController.bPurchasableByPremium = false;
    }
    else
    {
      StorePreviewController.bPurchasableByDollars = false;
      StorePreviewController.bPurchasableByPremium = true;
    }
    UpdateJSModel(StorePreviewController);
    PushScreen("StorePreview");
  });
  console.log(elemIndex);
  console.log(JSON.stringify(Level3ItemsArray[elemIndex]));
}

StoreWidget.OnClickPurchaseFounders = function(element)
{
    alert("BUY FOUNDERS PACK");
    var elemIndex = $(element).index();

    engine.call("GetPreviewItemsList", Level1ItemsArray[elemIndex].ProductID).then(function(items)
    {
      StorePreviewController.Items = items.Level3Items;
      StorePreviewController.Name = Level1ItemsArray[elemIndex].ProductName;
      StorePreviewController.NumberOfItems = items.NumberOfItems;
      StorePreviewController.Cost = Level1ItemsArray[elemIndex].Cost;
      StorePreviewController.PremiumCost = Level1ItemsArray[elemIndex].PremiumCost;
      StorePreviewController.DLCAppId = Level1ItemsArray[elemIndex].DLCAppId;
	  StorePreviewController.XboxProductId = Level1ItemsArray[elemIndex].XboxProductId;
      if(items.bIsOwned != undefined){
        StorePreviewController.bIsOwned = items.bIsOwned;
      }
      else
      {
        StorePreviewController.bIsOwned = false;
      }
       if(StorePreviewController.DLCAppId == 0)
       {
         StorePreviewController.bPurchasableByDollars = true;
         StorePreviewController.bPurchasableByPremium = false;
       }
       else
       {
         StorePreviewController.bPurchasableByDollars = false;
         StorePreviewController.bPurchasableByPremium = true;
       }
      UpdateJSModel(StorePreviewController);
      PushScreen("StorePreview");
    });
}

StoreWidget.OnClickPreviewFeaturedItems = function(element)
{
    alert("Preview Feature item");
    var elemIndex = $(element).index();

    engine.call("GetPreviewItemsList", Level2ItemsArray[elemIndex].ProductID).then(function(items)
    {
      console.log(items.bIsOwned);
      StorePreviewController.Items = items.Level3Items;
      StorePreviewController.Name = Level2ItemsArray[elemIndex].ProductName;
      StorePreviewController.NumberOfItems = items.NumberOfItems;
      StorePreviewController.Cost = Level2ItemsArray[elemIndex].Cost;
      StorePreviewController.PremiumCost = Level2ItemsArray[elemIndex].PremiumCost;
	  StorePreviewController.ProductID = Level2ItemsArray[elemIndex].ProductID;
      StorePreviewController.DLCAppId = Level2ItemsArray[elemIndex].DLCAppId;
	  StorePreviewController.XboxProductId = Level2ItemsArray[elemIndex].XboxProductId;
      if(items.bIsOwned != undefined){
        StorePreviewController.bIsOwned = items.bIsOwned;
      }
      else
      {
        StorePreviewController.bIsOwned = false;
      }

       if(StorePreviewController.DLCAppId == 0)
       {
         StorePreviewController.bPurchasableByDollars = true;
         StorePreviewController.bPurchasableByPremium = false;
       }
       else
       {
         StorePreviewController.bPurchasableByDollars = false;
         StorePreviewController.bPurchasableByPremium = true;
       }
      UpdateJSModel(StorePreviewController);
      PushScreen("StorePreview");
    });
}

StoreWidget.CreateFoundersItemElements = function()
{
  var foundersStoreList = document.getElementById("store-widget-founders-item-list");
  var fc = foundersStoreList.firstChild;

  while( fc ) {
      foundersStoreList.removeChild( fc );
      fc = foundersStoreList.firstChild;
  }

  for(var i = 0; i < Level1ItemsArray.length; ++i)
  {
    console.log(Level1ItemsArray[i].Image);
    var liFounderTag = document.createElement("li");
    liFounderTag.setAttribute("tabindex", "0");
    liFounderTag.addEventListener("click", function(){StoreWidget.OnClickPurchaseFounders(this)});
    // var imageFounderDiv = document.createElement("div");
    // imageFounderDiv.classList.add(Level1ItemsArray[i].Image);
    liFounderTag.classList.add("founders-item");
    liFounderTag.style.backgroundImage = "url('/images/Store/" + Level1ItemsArray[i].ProductID + ".png')";
    var costFounderDiv = document.createElement("div");
    costFounderDiv.classList.add("founders-info-container");
    var itemFounderName = document.createElement("h1");
    itemFounderName.textContent = Level1ItemsArray[i].ProductName;
    var itemFounderCost = document.createElement("h2");
    if(Level1ItemsArray[i].bIsOwned || Level1ItemsArray[i].Cost == 0)
    {
      itemFounderCost.textContent = "ITEMS OWNED";
      itemFounderCost.classList.add("item-owned-grey");
    }
    else
    {
      // itemFounderCost.innerHTML = "USD " + Level1ItemsArray[i].Cost;
      itemFounderCost.innerHTML = " ";
    }
    costFounderDiv.appendChild(itemFounderName);
    costFounderDiv.appendChild(itemFounderCost);
    liFounderTag.appendChild(costFounderDiv);
    foundersStoreList.appendChild(liFounderTag);
  }

  var liTagCrates = document.createElement("li");
  liTagCrates.setAttribute("tabindex", "0");
  liTagCrates.addEventListener("click", function(){OpenCratePurchaseWidget();});
  //var imageDivCrates = document.createElement("div");
  // imageDiv.classList.add("tiled-menu-rollover");
  liTagCrates.classList.add("cullcrate-bg-sm");
  liTagCrates.classList.add("crate-item");
  var costDivCrates = document.createElement("div");
  costDivCrates.classList.add("crate-info-container");
  var itemNameCrates = document.createElement("h1");
  itemNameCrates.textContent = "GET CULL CRATES";

  costDivCrates.appendChild(itemNameCrates);
  liTagCrates.appendChild(costDivCrates);
  foundersStoreList.appendChild(liTagCrates);
  // console.log(document.getElementById("store-widget-founders-item-container").innerHTML);
  // console.log(foundersStoreList.innerHTML);
  //GetActiveScreen().SetNewActiveMenu(document.getElementById("store-widget-founders-item-container"));
}

StoreWidget.CreateFeaturedItemElements = function()
{
  var featuredStoreList = document.getElementById("store-widget-featured-item-list");
  var fc = featuredStoreList.firstChild;

  while( fc ) {
      featuredStoreList.removeChild( fc );
      fc = featuredStoreList.firstChild;
  }

  for(var i = 0; i < Level2ItemsArray.length; ++i)
  {
    console.log(Level2ItemsArray[i].Image);
    var liFeaturedTag = document.createElement("li");
    liFeaturedTag.setAttribute("tabindex", "0");
    liFeaturedTag.addEventListener("click", function(){StoreWidget.OnClickPreviewFeaturedItems(this)});
    //var imageFeaturedDiv = document.createElement("div");
    //liFeaturedTag.classList.add(Level2ItemsArray[i].Image);
    liFeaturedTag.style.backgroundImage = "url('/images/Store/" + Level2ItemsArray[i].ProductID + ".png')";
    liFeaturedTag.classList.add("featured-item");
    var costFeaturedDiv = document.createElement("div");
    costFeaturedDiv.classList.add("featured-info-container");
    var itemFeaturedName = document.createElement("h1");
    itemFeaturedName.textContent = Level2ItemsArray[i].ProductName;
    var itemFeaturedCost = document.createElement("h2");
    if(Level2ItemsArray[i].bIsOwned || Level2ItemsArray[i].Cost == 0)
    {
      itemFeaturedCost.textContent = "ITEMS OWNED";
      itemFeaturedCost.classList.add("item-owned-grey");
    }
    else
    {
      var tokenIcon = document.createElement("img");
      tokenIcon.src = "/images/token.png";
      tokenIcon.classList.add("token-icon-md");
      itemFeaturedCost.appendChild(tokenIcon);
      itemFeaturedCost.innerHTML += Level2ItemsArray[i].Cost;
    }

    costFeaturedDiv.appendChild(itemFeaturedName);
    costFeaturedDiv.appendChild(itemFeaturedCost);
    liFeaturedTag.appendChild(costFeaturedDiv);
    // liFeaturedTag.appendChild(imageFeaturedDiv);
    featuredStoreList.appendChild(liFeaturedTag);
  }
  // console.log(document.getElementById("store-widget-featured-item-container").innerHTML);
  // console.log(featuredStoreList.innerHTML);
  //GetActiveScreen().SetNewActiveMenu(document.getElementById("store-widget-featured-item-container"));
}

StoreWidget.CreateStoreItemElements = function()
{
  var storeList = document.getElementById("store-widget-list");
  var fc = storeList.firstChild;

  while( fc ) {
      storeList.removeChild( fc );
      fc = storeList.firstChild;
  }
  console.log(JSON.stringify(Level3ItemsArray[1]));
  for(var i = 0; i < Level3ItemsArray.length; ++i)
  {
    var liTag = document.createElement("li");
    liTag.setAttribute("tabindex", "0");
    liTag.addEventListener("click", function(){StoreWidget.OnClickPreviewItems(this)});
    // var imageDiv = document.createElement("div");
    // imageDiv.classList.add("tiled-menu-rollover");
    // imageDiv.classList.add(Level3ItemsArray[i].Image);
    liTag.style.backgroundImage = "url('/images/Store/" + Level3ItemsArray[i].ProductID + ".png')";
    liTag.classList.add("store-item");
    var costDiv = document.createElement("div");
    costDiv.classList.add("store-info-container");
    var itemName = document.createElement("h3");
    itemName.textContent = Level3ItemsArray[i].ProductName;
    var itemCost = document.createElement("h4");
    if(Level3ItemsArray[i].bIsOwned || Level3ItemsArray[i].Cost == 0)
    {
      itemCost.textContent = "ITEMS OWNED";
      itemCost.classList.add("item-owned-grey");
    }
    else
    {
      if(Level3ItemsArray[i].DLCAppId == 0)
      {
        var tokenIcon = document.createElement("img");
        tokenIcon.src = "/images/token.png";
        tokenIcon.classList.add("token-icon-sm");
        itemCost.appendChild(tokenIcon);
        itemCost.innerHTML += Level3ItemsArray[i].Cost;
      }
      else{
        itemCost.innerHTML = " ";
      }

    }


    costDiv.appendChild(itemName);
    costDiv.appendChild(itemCost);
    // liTag.appendChild(imageDiv);
    liTag.appendChild(costDiv);
    storeList.appendChild(liTag);
  }


  // console.log(document.getElementById("store-items-list-container").innerHTML);
  // console.log(storeList.innerHTML);
  //GetActiveScreen().SetNewActiveMenu(document.getElementById("store-widget-menu-options"));

}


// $.extend(ProfileScreen.prototype, HorizontalMenuMixin);

Screens['StoreWidget'] = StoreWidget;
