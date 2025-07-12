function DynWeaponSkinItemScreen(args)
{
  DynAppearanceItemScreen.call(this, args);
}

DynWeaponSkinItemScreen.prototype = Object.create(DynAppearanceItemScreen.prototype);
DynWeaponSkinItemScreen.prototype.constructor = DynWeaponSkinItemScreen;

DynWeaponSkinItemScreen.prototype.RefreshItems = function(forceIdx)
{
  engine.call("GetWeaponCustomizations", this.category).then($.proxy(function(items){
    console.log("Got Items: " + JSON.stringify(items))
    this.OnGetItems(items);
    if(parseInt(forceIdx, 10) > this.screenData.Items.length)
    {
      for (var i = 0; i < this.screenData.Items.length; ++i)
      {
        console.log("screendata " + JSON.stringify(this.screenData.Items[i]));
        console.log("items " + JSON.stringify(items[i]));
        if (parseInt(this.screenData.Items[i].ItemID, 10) == parseInt(forceIdx, 10))
        {
          forceIdx = i;
          ClickedItemIndex = i;
        }
      }
    }
    if(forceIdx != undefined)
    {
      this.ForceFocusIndex(forceIdx);
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

DynWeaponSkinItemScreen.prototype.GetScreenName = function()
{
    return rivets.formatters.getLocalizedNameForItem(this.category).toUpperCase();
}

DynWeaponSkinItemScreen.prototype.UnequipItem = function()
{
  engine.call("ClearWeaponCustomization", this.category).then($.proxy(function(){
    console.log("Refreshing Items");
    this.RefreshItems();
  }, this));
}

Screens['DynWeaponSkinItem'] = DynWeaponSkinItemScreen;
