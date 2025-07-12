const PerksRootState_SlotSelect = 0;
const PerksRootState_CategorySelect = 1;
const PerksRootState_PerkSelect = 2;
const PerksRootSelector = document.getElementById("perks-root");

$('head').append('<link rel="stylesheet" type="text/css" href="css/Screens/PerksRoot.css">');

var PerksRootScreenData = {
  PerkSlots : {},
  PerkCategories : [],
  PerkList : [],
  PreviewPerk : undefined,
  SelectedSlot : 0,
  PerkMenuState : PerksRootState_SlotSelect,
  HideCategories : function() {
    console.log("WTF");
    return this.PerkMenuState != PerksRootState_CategorySelect;
  },
  HidePerks : function() { return this.PerkMenuState != PerksRootState_PerkSelect;},
  bHidePreviewPerk : false,
};

rivets.bind($(PerksRootSelector), {
  screenData : PerksRootScreenData
});

function PerksRoot()
{
  BaseMenuScreen.call(this);
  this.Selector = PerksRootSelector;
  this.ActiveMenu = document.getElementById("perks-root-menu-options");
  this.ScreenActions = [{value:"Select"}, {value:"Back"}];
  PerksRootScreenData.PerkMenuState = PerksRootState_SlotSelect;
  PerksRootScreenData.PerkList = [];
  PerksRootScreenData.PerkCategories = [];
  PerksRootScreenData.SelectedSlot = 0;
  PerksRootScreenData.bHidePreviewPerk = false;
  PerksRootScreenData.PreviewPerk = undefined;
  PerksRootScreenData.CurrentCategory = "";
  this.PreviousIndex = 0;
  this.PreviousItemStack = [];
}

PerksRoot.prototype = Object.create(BaseMenuScreen.prototype);
PerksRoot.prototype.constructor = PerksRoot;

PerksRoot.prototype.OnCreation = function()
{
  BaseMenuScreen.prototype.OnCreation.call(this);

  //First, ask the Engine for our current perks
  this.GetCurrentlyEquippedPerks();

  //Then go ahead and get the category list too, since it won't change
  this.GetPerkCategories();

  engine.call("SetPerksCamera");
}

PerksRoot.prototype.GetCurrentlyEquippedPerks = function()
{
  engine.call("GetCurrentlyEquippedPerks").then($.proxy(function(perks){
    console.log("Got Perks: " + JSON.stringify(perks));
    this.OnGetCurrentlyEquippedPerks(perks);
    }, this)
  );
}

PerksRoot.prototype.GetPerkCategories = function()
{
  engine.call("GetPerkCategories").then($.proxy(function(categories){
    console.log("Got Perk Categories: " +  JSON.stringify(categories));
    this.OnGetPerkCategories(categories);
    }, this)
  );
}

PerksRoot.prototype.GetPerksForCategory = function(category)
{
  engine.call("GetPerksForCategory", category).then($.proxy(function(perks){
    console.log("Got Perks: " +  JSON.stringify(perks));
    this.OnGetPerks(perks);
    }, this)
  );
}

PerksRoot.prototype.OnClosed = function()
{
  BaseMenuScreen.prototype.OnClosed.call(this);
}

PerksRoot.prototype.OnGetPerkCategories = function(categories)
{
  PerksRootScreenData.PerkCategories = categories;
}

PerksRoot.prototype.OnGetCurrentlyEquippedPerks = function(perks)
{
  PerksRootScreenData.PerkSlots = perks;
}

PerksRoot.prototype.OnOptionElemSelected = function(element)
{
  this.PreviousItemStack.push(element);

  if(this.IsElementPerkSlot(element))
  {
    if(element.dataset != undefined && element.dataset.perkSlot != undefined)
    {
      this.OnPerkSlotSelected(Number(element.dataset.perkSlot));
    }
  }
  else if(PerksRootScreenData.PerkMenuState == PerksRootState_CategorySelect && this.HasMenuItemElem(element))
  {
    if(element.dataset != undefined && element.dataset.category != undefined)
    {
      PerksRootScreenData.CurrentCategory = element.dataset.category;
      this.GetPerksForCategory(PerksRootScreenData.CurrentCategory);
    }

  }
  else if(PerksRootScreenData.PerkMenuState == PerksRootState_PerkSelect && this.HasMenuItemElem(element))
  {
    if(element.dataset != undefined && element.dataset.perkAssetName != undefined && !element.classList.contains("equipped"))
    {
      engine.call("SetPerkForSlot", element.dataset.perkAssetName, PerksRootScreenData.SelectedSlot - 1)
      .then($.proxy(function(){
        this.GetCurrentlyEquippedPerks();
        this.SetPerkMenuState(PerksRootState_SlotSelect);
        this.ForceFocusIndex(PerksRootScreenData.SelectedSlot - 1);
      }, this));
    }
  }
}

PerksRoot.prototype.OnSelectionChanged = function(elem)
{
  console.log("PerksRoot OnSelectionChanged");
  if(PerksRootScreenData.PerkMenuState == PerksRootState_PerkSelect)
  {
    if(elem.dataset != undefined && elem.dataset.perkAssetName != undefined)
    {
      var AssetName = elem.dataset.perkAssetName;
      console.log("Hovered Perk: " + AssetName);
      for(var i = 0; i < PerksRootScreenData.PerkList.length; ++i)
      {
        var Perk = PerksRootScreenData.PerkList[i];
        if(Perk && Perk.AssetName == AssetName)
        {
          this.SetPreviewPerk(Perk);
          break;
        }
      }
    }
  }
}

PerksRoot.prototype.SetPreviewPerk = function(Perk)
{
  var self = this;
  PerksRootScreenData.PreviewPerk = Perk;
  PerksRootScreenData.bHidePreviewPerk = false;
  /*
  setTimeout(function(){
    PerksRootScreenData.PreviewPerk = Perk;
    console.log("Set Preview Perk: " + JSON.stringify(Perk));
  },50);
  */
}

PerksRoot.prototype.OnGetPerks = function(perks)
{
  PerksRootScreenData.PerkList = perks;
  this.SetPerkMenuState(PerksRootState_PerkSelect);
}

PerksRoot.prototype.SetPerkMenuState = function(menuState)
{
  if(menuState == PerksRootState_CategorySelect)
  {
    PerksRootScreenData.PerkMenuState = PerksRootState_CategorySelect;
    this.SetNewActiveMenu(document.getElementById("perks-root-categories"));
  }
  else if(menuState == PerksRootState_PerkSelect)
  {
    PerksRootScreenData.PerkMenuState = PerksRootState_PerkSelect;
    this.SetNewActiveMenu(document.getElementById("perks-root-perklist"));
  }
  else
  {
    PerksRootScreenData.PerkMenuState = PerksRootState_SlotSelect;
    this.SetNewActiveMenu(document.getElementById("perks-root-menu-options"));
  }

  this.ResetFocus();
}

PerksRoot.prototype.OnPerkSlotSelected = function(slot){
  PerksRootScreenData.SelectedSlot = slot;
  this.SetPerkMenuState(PerksRootState_CategorySelect);
}

//We need to override HasMenuItem, since the perk slots need to be
//clickable at all times - so when we do a HasMenuItem check, we'll
//always check GetPerkSlotMenuItems() if the base call is false
PerksRoot.prototype.HasMenuItemElem = function(element)
{
  var bHasItem = BaseMenuScreen.prototype.HasMenuItemElem.call(this, element);
  if(!bHasItem && PerksRootScreenData.PerkMenuState != PerksRootState_SlotSelect){
    bHasItem = this.IsElementPerkSlot(element);
  }

  return bHasItem;
}

PerksRoot.prototype.GetPerkSlotMenuItems = function()
{
  var elems = [];
  var menuParent = $("#perks-root-menu-options");
  menuParent.children('ul').children('li').each(function(index){
    elems.push(this);
  });

  return elems;
}

PerksRoot.prototype.IsElementPerkSlot = function(element)
{
  var elems = this.GetPerkSlotMenuItems();

  for(var i = 0; i < elems.length; ++i)
  {
    if(elems[i] === element)
    {
      return true;
    }
  }

  return false;
}

//We need to override GetAbsoluteMenuItemElem because it needs to consider
//Perk Slots if we're not in the PerksRootState_SlotSelect state - otherwise
//BaseMenuScreen will register the click as an undefined element
PerksRoot.prototype.GetAbsoluteMenuItemElem = function(element)
{
  var menuItems = this.GetMenuItems();

  if(PerksRootScreenData.PerkMenuState != PerksRootState_SlotSelect)
  {
    menuItems = menuItems.concat(this.GetPerkSlotMenuItems());
  }

  for(var i = 0; i < menuItems.length; ++i)
  {
    if(menuItems[i] === element)
    {
      return element;
    }
  }

  var parent = element.parentElement;
  if(parent != undefined && parent != element && this.HasMenuItemElem(parent))
  {
    return parent;
  }

  return undefined;
}

PerksRoot.prototype.OnButtonPressed = function(button)
{
  Screen.prototype.OnButtonPressed.call(this, button);
  if(button == btn_Up)
  {
    this.IncrementSelection(-1);
  }
  else if(button == btn_Down)
  {
    this.IncrementSelection(1)
  }
  else if(button == btn_Select)
  {
    var focusedItem = this.GetFocusedItem();
    if(focusedItem != undefined)
    {
      this.OnOptionElemSelected(focusedItem);
    }
  }
  else if(button == btn_Back)
  {
    if(PerksRootScreenData.PerkMenuState == PerksRootState_PerkSelect)
    {
      this.SetPerkMenuState(PerksRootState_CategorySelect);
      if(this.PreviousItemStack.length > 0)
      {
          this.ForceFocusElem(this.PreviousItemStack.pop());
      }

    }
    else if(PerksRootScreenData.PerkMenuState == PerksRootState_CategorySelect)
    {
      this.SetPerkMenuState(PerksRootState_SlotSelect);
      if(this.PreviousItemStack.length > 0)
      {
          this.ForceFocusElem(this.PreviousItemStack.pop());
      }
    }
    else
    {
      console.log("Leaving Perk Screen");
      if(!IsRootScreen())
      {
        PopScreen();
      }
    }
  }
  else if(button == btn_Pause)
  {
    console.log("btn_Pause");
    OpenCurrencyPurchaseWidget();
  }
}

Screens['PerksRoot'] = PerksRoot;
