const AirdropSelector = document.getElementById("airdrop-menu");

//Add your CSS files here
$('head').append('<link rel="stylesheet" type="text/css" href="css/Screens/Airdrop.css">');

var AirdropScreenData = {
  Airdrops : [],
  PreviewAirdrop: {}
}

rivets.bind($(AirdropSelector), {
  screenData : AirdropScreenData
});

function AirdropScreen()
{
  BaseMenuScreen.call(this);
  this.Selector = AirdropSelector;
  this.ActiveMenu = document.getElementById("airdrop-menu-options");
  this.ScreenActions = [{value: "Select"}, {value: "Back"}];
}

AirdropScreen.prototype = Object.create(BaseMenuScreen.prototype);
AirdropScreen.prototype.constructor = AirdropScreen;

AirdropScreen.prototype.OnCreation = function()
{
  BaseMenuScreen.prototype.OnShow.call(this);
  this.RefreshAirdrops();
  engine.call("SetAirdropCamera");
}

AirdropScreen.prototype.RefreshAirdrops = function(forceIdx)
{
  engine.call("GetAirdropData").then($.proxy(function(airdrops){
    // var sortedAirdrops = airdrops.sort(function(a, b){
    //   var nameA=a.AssetName.toLowerCase(), nameB=b.AssetName.toLowerCase()
    //   if (nameA < nameB)
    //       return -1;
    //   if (nameA > nameB)
    //       return 1;
    //   return 0;
    // });

    var sortedAirdrops = airdrops.sort(function(a,b){
      // sort by rarity, then alphabetically
      var compareVal = (a.bIsUnlocked === b.bIsUnlocked ? (a.Rarity - b.Rarity) : (a.bIsUnlocked ? -1 : 1));

      if (compareVal == 0) {
        var assetNameA = a.AssetName.toLowerCase();
        var assetNameB = b.AssetName.toLowerCase();

        // item.AssetName | getLocalizedNameForCustomization
        compareVal = (assetNameA < assetNameB) ? -1 : (assetNameA > assetNameB);
      }
  	  return compareVal;
  	});
    console.log(JSON.stringify(sortedAirdrops));
    this.OnGetAirdrops(sortedAirdrops);
    if(forceIdx != undefined)
    {
      this.ForceFocusIndex(forceIdx);
    }
  }, this));
}

AirdropScreen.prototype.OnGetAirdrops = function(airdrops)
{
  var bNeedsFocusReset = (AirdropScreenData.Airdrops == undefined || (AirdropScreenData.Airdrops && AirdropScreenData.Airdrops.length == 0));
  AirdropScreenData.Airdrops = airdrops;
  if(bNeedsFocusReset)
  {
    console.log("Set new Active Menu");
    this.SetNewActiveMenu(this.ActiveMenu);
    this.ResetFocus();
    if(airdrops.length > 0)
    {
      this.SetPreviewAirdrop(airdrops[0]);
    }
  }
}

AirdropScreen.prototype.OnOptionElemSelected = function(elem)
{
  if(elem.dataset && elem.dataset.index)
  {
    var index = Number(elem.dataset.index);
    if(index < AirdropScreenData.Airdrops.length)
    {
      var airdrop = AirdropScreenData.Airdrops[index];
      engine.call("SetAirdropPackage", airdrop.AssetName).then($.proxy(function(){
        this.RefreshAirdrops();
      }, this));
    }
  }
}

AirdropScreen.prototype.OnSelectionChanged = function(elem)
{
  if(elem.dataset && elem.dataset.index)
  {
    var index = Number(elem.dataset.index);
    if(index < AirdropScreenData.Airdrops.length)
    {
      var airdrop = AirdropScreenData.Airdrops[index];
      console.log("New Preview Airdrop: " + JSON.stringify(airdrop));
      if(airdrop.bIsNew)
      {
        airdrop.bIsNew = false;
        engine.call("SetEntitlementSeen", airdrop.ItemID);
      }
      this.SetPreviewAirdrop(airdrop);
    }
  }
}

AirdropScreen.prototype.SetPreviewAirdrop = function(airdrop)
{
  AirdropScreenData.PreviewAirdrop = airdrop;
}

$.extend(AirdropScreen.prototype, VerticalMenuMixin);

Screens['Airdrop'] = AirdropScreen;
