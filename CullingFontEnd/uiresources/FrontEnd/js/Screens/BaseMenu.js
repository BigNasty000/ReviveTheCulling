function BaseMenuScreen()
{
  Screen.call(this);
  this.lastFocusedItem = undefined;
  this.pageLength = 11;
  //this.LastItemIndex = 0;
}

BaseMenuScreen.prototype = Object.create(Screen.prototype);
BaseMenuScreen.prototype.constructor = BaseMenuScreen;

BaseMenuScreen.prototype.OnButtonPressed = function(button)
{
  console.log("BaseMenuScreen OnButtonPressedOverride");
  Screen.prototype.OnButtonPressedOverride.call(this, button);
}

BaseMenuScreen.prototype.OnButtonPressed = function(button)
{
  console.log("BaseMenuScreen OnButtonPressed");
  Screen.prototype.OnButtonPressed.call(this, button);
  if(button == btn_Back && (this.bSupportsBackButton == undefined || this.bSupportsBackButton == true))
  {
    if(this.IsModal())
    {
      PopModal();
    }
    else if(!IsRootScreen())
    {
      PopScreen();
    }
  }
  else if(button == btn_Select)
  {
    var focusedItem = this.GetFocusedItem();
    if(focusedItem != undefined)
    {
      this.OnOptionElemSelected(focusedItem);
    }
  }
}

BaseMenuScreen.prototype.OnKeyPressed = function(keyCode)
{
  Screen.prototype.OnKeyPressed.call(this, keyCode);
}

var allowConnectAttempt = true;

function HandleRequireOnline(screenDesired)
{
  if (IsOnline())
  {
    if (screenDesired) {
      PushScreen(screenDesired);
    }

    return;
  }

  if (allowConnectAttempt) {
    // Show connecting modal
    var modalArgs = {
      options: ["Cancel"],
      title: "Establishing connection...",
      bSupportsBackButton: true,
      callback: function(option){
        screenDesired = undefined;
      },
      modalID: "Connecting",
      screenDesired: screenDesired
    };
    PushModal('Modal', modalArgs);

    // Try to connect.
    ConnectWebsocketIfNeeded().then(
      function() {
        // success
        CloseConnectingModal(false);
      },
      function() {
        // fail
        CloseConnectingModal(false);

        if (GetActiveModal() == undefined) {
          var modalArgs = {
            options: ["OK"],
            title: "Failure when attempting to establish connection.",
            bSupportsBackButton: true,
            callback: function(option){
              screenDesired = undefined;
            },
            modalID: "Connecting",
            screenDesired: screenDesired
          };

          PushModal('Modal', modalArgs);
        }
      });

    /*
    allowConnectAttempt = false;
    setTimeout(function() {
      allowConnectAttempt = true;
    }, 5000);
    */

  }
  else
  {
    var modalArgs = {
      options: ["OK"],
      title: "You are trying to connect too often. Please try again in a few seconds.",
      bSupportsBackButton: true,
      callback: function(option){
        screenDesired = undefined;
      },
      modalID: "Connecting",
      screenDesired: screenDesired
    };
    PushModal('Modal', modalArgs);
  }
}

BaseMenuScreen.prototype.OnOptionElemSelected = function(element)
{
  if (element.dataset != undefined)
  {
    if (element.dataset.pushScreen != undefined)
	{
		if(element.dataset.pushScreen == "Play")
		{
			engine.call("OnOnlinePlaySelected");
		}
		else
		{
			if (element.dataset.requireOnline != undefined && !bIsPIEMode && element.dataset.requireOnline == "true" && ClientwebData.IsOffline()){
				HandleRequireOnline(element.dataset.pushScreen);
			}
			else {
				PushScreen(element.dataset.pushScreen);
			}
		}
		return;
    }
  }
}

engine.on("HandleOnPressPlay", function(CanPlayOnline)
{
	if(CanPlayOnline)
	{
		if (ClientwebData.IsOffline())
		{
			HandleRequireOnline("Play");
		}
		else
		{
			PushScreen("Play");
		}
	}
  else
  {
    var modalArgs = {
      options: ["OK"],
      title: "There was an internet failure or you do not have the permission to play online.",
      bSupportsBackButton: true,
      modalID: "Connecting"
    };

    PushModal('Modal', modalArgs);
  }
});

BaseMenuScreen.prototype.OnShow = function()
{
  Screen.prototype.OnShow.call(this);
  this.Selector.classList.remove("hidden");
  this.ResetFocus();
  console.log(this.lastFocusedItem);
  if(this.lastFocusedItem != undefined)
  {
    this.ForceFocusElem(this.lastFocusedItem);
  }
}

BaseMenuScreen.prototype.OnHide = function()
{
  console.log(this.lastFocusedItem);
  this.lastFocusedItem = this.GetFocusedItem();
  Screen.prototype.OnHide.call(this);
  this.Selector.classList.add("hidden");
}

BaseMenuScreen.prototype.OnCreation = function()
{
  Screen.prototype.OnCreation.call(this);
  $(this.Selector).removeClass('hidden');
  this.ResetFocus();
}

BaseMenuScreen.prototype.OnClosed = function()
{
  Screen.prototype.OnClosed.call(this);
  this.Selector.classList.add("hidden");
}

BaseMenuScreen.prototype.OnMouseClicked = function(element)
{
  if(this.HasMenuItemElem(element))
  {
    //this.OnOptionElemSelected(this.GetFocusedItem());
    this.OnOptionElemSelected(this.GetAbsoluteMenuItemElem(element));
  }
}

BaseMenuScreen.prototype.OnMouseHover = function(element)
{
  if(this.HasMenuItemElem(element))
  {
    this.ForceFocusElem(element);
  }
}

BaseMenuScreen.prototype.OnMouseOut = function(element)
{
  if(this.HasMenuItemElem(element))
  {
    this.ForceFocusElem();
  }
}

BaseMenuScreen.prototype.ForceFocusIndex = function(index)
{
  var menuItems = this.GetMenuItems();
  if(menuItems.length > index)
  {
    //console.log("Forcing Focus");
    var element = menuItems[index];
    //this.OnSelectionChanged(element);
    element.focus();
  }
}

BaseMenuScreen.prototype.ForceFocusElem = function(element)
{
  //console.log("ForceFocusElem");
  var menuItems = this.GetMenuItems();
  var currFocus = document.activeElement;

  element = this.GetAbsoluteMenuItemElem(element);
  if(element != undefined && element != currFocus)
  {
    this.OnSelectionChanged(element);
    element.focus();
  }
  else if(element == undefined)
  {
    //console.warn("Tried to focus a non-menu item");
    //console.log(menuItems);
    var equipped;
    menuItems.forEach(function(element){
      if(element != undefined)
      {
        if(element.children[0] != undefined && element.children[0].classList.contains("equipped")){
          equipped = element;
        }
        element.blur();
      }
    });
    if(equipped == undefined){
      equipped = menuItems[0];
    }
    this.OnSelectionChanged(equipped);
  }
  /*
  for(var i = 0; i < menuItems.length; ++i)
  {
    if(menuItems[i] === element && element != currFocus)
    {
      this.OnSelectionChanged(element);
      element.focus();
      return;
    }
  }

  var parent = element.parentElement;
  if(parent != undefined && parent != element)
  {
    var parentMenuElement = this.GetAbsoluteMenuItemElem(parent);

    if(parentMenuElement && parentMenuElement != currFocus)
    {
      parentMenuElement.focus();
      this.OnSelectionChanged(parentMenuElement);
    }
  }
  */
}

BaseMenuScreen.prototype.HasMenuItemElem = function(element)
{
  var menuItems = this.GetMenuItems();
  for(var i = 0; i < menuItems.length; ++i)
  {
    if(menuItems[i] === element)
    {
      return true;
    }
  }

  var parent = element.parentElement;
  if(parent != undefined && parent != element && this.HasMenuItemElem(parent))
  {
    return true;
  }

  return false;
}

BaseMenuScreen.prototype.OnModalShowing = function()
{
  Screen.prototype.OnModalShowing.call(this);
  if(this.GetFocusedItem())
  {
    this.lastFocusedItem = this.GetFocusedItem()
  }
}

BaseMenuScreen.prototype.OnModalClosing = function()
{
  Screen.prototype.OnModalClosing.call(this);
  this.OnShow();
}

BaseMenuScreen.prototype.GetMenuItemIndex = function(element)
{
  var menuItems = this.GetMenuItems();

  for(var i = 0; i < menuItems.length; ++i)
  {
    if(menuItems[i] === element)
    {
      return i;
    }
  }

  var parent = element.parentElement;
  var idx = 0;
  if(parent != undefined && parent != element)
  {
    idx = this.GetMenuItemIndex(parent);
  }

  return idx;
}

BaseMenuScreen.prototype.GetAbsoluteMenuItemElem = function(element)
{
  if(element != undefined){
    var menuItems = this.GetMenuItems();
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
      return this.GetAbsoluteMenuItemElem(parent);
    }
  }
  return undefined;
}


BaseMenuScreen.prototype.GetMenuItems = function()
{
  var elems = [];
  var menuParent = $(this.ActiveMenu);
  //console.log(menuParent);
  //console.log(this.ActiveMenu);
  menuParent.children('ul').children('li').each(function(index){
    if(this.tabIndex != undefined && Number(this.tabIndex) == 0)
    {
      elems.push(this);
    }
  });
  //console.log(elems.length);
  return elems;
}

BaseMenuScreen.prototype.IncrementSelection = function(direction)
{
  //console.log("direction " + direction);
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
  //console.log("idx " + idx);
  //console.log("menuItems.length " + menuItems.length);
  if(menuItems.length == 0){
    idx = 0;
  }else{
    idx = (idx + direction + menuItems.length) % menuItems.length;
  }
  //console.log("idx " + idx);
  if(menuItems[idx])
  {
    menuItems[idx].focus();
    this.OnSelectionChanged(menuItems[idx]);
  }
}

BaseMenuScreen.prototype.IncrementPage = function(direction)
{
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

  direction = direction * this.pageLength;
  idx = (idx + direction);
  if(idx >= menuItems.length)
  {
    idx = menuItems.length - 1;
  }
  else if(idx < 0)
  {
    idx = 0;
  }

  if(menuItems[idx] != undefined)
  {
    menuItems[idx].focus();
    this.OnSelectionChanged(menuItems[idx]);
  }
  else {
    console.warn("Out of Index IncrementPage Val: " + idx);
  }
}

BaseMenuScreen.prototype.OnSelectionChanged = function(elem, idx)
{

}

BaseMenuScreen.prototype.GetFirstItem = function()
{
  //console.log(this.GetMenuItems()[0]);
  return this.GetMenuItems()[0];
}

BaseMenuScreen.prototype.ResetFocus = function()
{
  console.log("Reset Focus");
  if(this.GetFirstItem() != undefined)
  {
    this.GetFirstItem().focus();
    this.OnSelectionChanged(this.GetFirstItem());
  }
}

BaseMenuScreen.prototype.IsFocusInside = function()
{
  var currFocus = document.activeElement;
  return this.HasMenuItemElem(currFocus);
}

BaseMenuScreen.prototype.GetFocusedItem = function()
{
  var currFocus = document.activeElement;
  var menuItems = this.GetMenuItems();
  for( var i = 0; i < menuItems.length; ++i )
  {
    if(menuItems[i] === currFocus)
    {
      return menuItems[i];
    }
  }
  return undefined;
}


BaseMenuScreen.prototype.IncrementTabNav = function(direction)
{
  var currActiveTab = document.getElementsByClassName("tab-focus");
  var menuItems = this.TabNavigation;
  var idx = 0;
  console.log(currActiveTab);
  for( var i = 0; i < menuItems.length; ++i )
  {
    if(menuItems[i] === currActiveTab[0])
    {
      idx = i;
      break;
    }
  }
  console.log(idx);
  if(menuItems.length == 0){
    idx = 0;
  }else{
    idx = (idx + direction + menuItems.length) % menuItems.length;
    console.log(idx);
  }
  console.log(currActiveTab[0].id);
  console.log(menuItems[idx].id);
  this.RemoveTabFocus(currActiveTab[0].id);
  this.SetTabFocus(menuItems[idx].id);
  this.SetNewActiveMenu(document.getElementById(menuItems[idx].id+"-container"));
}

BaseMenuScreen.prototype.SetTabFocus = function(id)
{
  console.log(id);
  var elem = document.getElementById(id);
  var elemContainer = document.getElementById(id+"-container");
  elem.classList.add("tab-focus");
  elemContainer.classList.remove("hidden");
  if(this.ScreenName == "LeaderboardSolo")
  {
    document.getElementById("header-solo-tier").textContent = elem.dataset.tier;
    document.getElementById("header-solo-score").textContent = elem.dataset.score;
  }
  else if(this.ScreenName == "LeaderboardCoop")
  {
    document.getElementById("header-coop-tier").textContent = elem.dataset.tier;
    document.getElementById("header-coop-score").textContent = elem.dataset.score;
  }
}

BaseMenuScreen.prototype.RemoveTabFocus = function(id)
{
  console.log(id);
  document.getElementById(id).classList.remove("tab-focus");
  document.getElementById(id+"-container").classList.add("hidden");
}

BaseMenuScreen.prototype.MouseTabClick = function(tab)
{
  console.log(tab);
  var currActiveTab = document.getElementsByClassName("tab-focus");
  console.log(currActiveTab[0].id);
  this.RemoveTabFocus(currActiveTab[0].id);
  this.SetTabFocus(tab.id);
}

BaseMenuScreen.prototype.ResetTabFocus = function()
{
  for( var i = 0; i < this.TabNavigation.length; i++){
    if(this.TabNavigation[i].classList.contains("tab-focus")){
        this.RemoveTabFocus(this.TabNavigation[i].id);
    }
  }
}

//Helper function that changes a screen's ActiveMenu, and rebinds
//the needed events for Mouse hover, etc

BaseMenuScreen.prototype.SetNewActiveMenu = function(MenuElem)
{
  this.ActiveMenu = MenuElem;
  if(MenuElem){
    this.ResetFocus();
  }
  $(MenuElem).find('li').hover(function(event){
    if(event)
    {
      OnMouseHover(event.target);
    }
  });
}

BaseMenuScreen.prototype.OnMenuActionClicked = function(MenuAction)
{
  Screen.prototype.OnMenuActionClicked.call(this, MenuAction);
}

BaseMenuScreen.prototype.DisplayPlayersTopTen = function(userID)
{

}

BaseMenuScreen.prototype.GetTopTenUserData = function(elem)
{

}

BaseMenuScreen.prototype.StartPurchaseProcess = function()
{

}

BaseMenuScreen.prototype.SetPurchaseButtonInfo = function()
{

}

BaseMenuScreen.prototype.IncrementLists = function(direction)
{
  var lists = this.ScreenLists;
  var menuID = this.ActiveMenuID;
  var idx = 0;
  for( var i = 0; i < lists.length; ++i )
  {
    if(lists[i] === menuID)
    {
      idx = i;
      break;
    }
  }
  idx = (idx + direction + lists.length) % lists.length;
  this.ActiveMenu = document.getElementById(lists[idx]);
  this.ActiveMenuID = lists[idx];
  if(this.ActiveMenu.getElementsByTagName("li").length <= 0){
    this.IncrementLists(direction);
  }else{
    if(direction == -1)
    {
      if(this.ActiveMenuID == "store-items-list-container"){
        this.GetMenuItems()[2].focus();
        //this.LastItemIndex = 2;
      }
      else if(this.ActiveMenuID == "store-preview-list-container")
      {
        this.GetMenuItems()[StorePreviewController.Items.length - 1].focus();
      }
      else
      {
        this.SetNewActiveMenu(this.ActiveMenu);
      }
    }

    if(direction == 1)
    {
      this.SetNewActiveMenu(this.ActiveMenu);
    }
  }
}
//$.extend(BaseMenuScreen.prototype, VerticalMenuMixin.prototype);
//Screens['MainMenu'] = MainMenuScreen;
