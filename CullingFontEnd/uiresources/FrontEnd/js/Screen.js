
function Screen()
{
  console.log("In Screen Constructor");
  this.ScreenName = "Default";
  this.IsStaticScreen = true;
  this.ScreenActions = [];
}

Screen.prototype.OnButtonPressedOverride = function(button)
{
  console.log("ButtonPressedOverride Screen: " + button);
}

Screen.prototype.OnButtonPressed = function(button)
{
  console.log("ButtonPressed Screen: " + button);
}

Screen.prototype.IsModal = function()
{
   return false;
}

Screen.prototype.OnShow = function()
{
  console.log("OnShow Screen Base");
  this.Selector.classList.remove("hidden");
  if(!this.IsModal())
  {
    SetScreenActions(this.ScreenActions);
  }
}

Screen.prototype.OnHide = function()
{
  console.log("OnHide Screen");
  this.Selector.classList.add("hidden");
}

Screen.prototype.OnCreation = function()
{
  console.log("OnCreation Screen");
  this.OnShow();
}

Screen.prototype.OnClosed = function()
{
  console.log("OnClosed Screen");
  this.Selector.classList.add("hidden");
}

Screen.prototype.OnMouseClicked = function(element)
{

}

Screen.prototype.OnMouseHover = function(element)
{

}

Screen.prototype.OnMouseOut = function(element)
{

}

Screen.prototype.OnModalShowing = function()
{

}

Screen.prototype.OnModalClosing = function()
{

}

Screen.prototype.CanPopScreen = function()
{
  return true;
}

Screen.prototype.OnKeyPressed = function(keyCode)
{
  console.log("Screen OnKeyPressed: " + keyCode);
}

Screen.prototype.OnMenuActionClicked = function(MenuAction)
{
  console.log("Menu Action Clicked: " + MenuAction);
  if(MenuAction == "Back" && !BackButtonDisabled)
  {
    this.OnButtonPressed(btn_Back);
  }else if(MenuAction == "Store" && !LobbyData.IsInLobby){
    PushScreen("StoreWidget");
  }
}

Screen.prototype.RefreshItems = function(forceIdx)
{
  // Could be called when entitlements are received this will be called on the active screen
}

Screen.prototype.UnlockEntitlement = function(entitlementID)
{
  // When purchases are made
  console.log("Screen.prototype.UnlockEntitlement");
}
