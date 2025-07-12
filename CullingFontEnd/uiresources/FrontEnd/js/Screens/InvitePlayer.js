const InvitePlayerSelector = document.getElementById("invite-player-menu");

//Add your CSS files here
$('head').append('<link rel="stylesheet" type="text/css" href="css/Screens/InvitePlayer.css">');

rivets.bind($(InvitePlayerSelector), {
  Friends : Friends
});

function  InvitePlayerScreen()
{
  BaseMenuScreen.call(this);
  this.Selector = InvitePlayerSelector;
  this.ActiveMenu = document.getElementById("invite-player-list");
  this.ScreenActions = [{value:"Select"}, {value:"Back"}];
  this.ScreenName = "InvitePlayerScreen";
}

InvitePlayerScreen.prototype = Object.create(BaseMenuScreen.prototype);
InvitePlayerScreen.prototype.constructor = InvitePlayerScreen;

InvitePlayerScreen.prototype.OnShow = function()
{
  console.log(this.ActiveMenu);
  this.ResetFocus();
  BaseMenuScreen.prototype.OnShow.call(this);
}

InvitePlayerScreen.prototype.OnCreation = function()
{
    BaseMenuScreen.prototype.OnCreation.call(this);
    engine.call("SetPlayCamera");
    engine.call("LoadFriends");
    $(this.Selector).find('content').hover(function(event){
      if(event)
      {
        OnMouseHover(event.target);
      }
    });
}

InvitePlayerScreen.prototype.ResetFocus = function()
{
  BaseMenuScreen.prototype.ResetFocus.call(this);
}

InvitePlayerScreen.prototype.OnOptionElemSelected = function(element)
{
  console.log(element.getAttribute('friend-id'));
  // console.log(element);
  if(element != undefined && element != null && element.getAttribute('friend-id') != undefined)
  {
      OnSendFriendInviteClicked(element.getAttribute('friend-id'));
      return;
  }
  BaseMenuScreen.prototype.OnOptionElemSelected.call(this, element);
}

InvitePlayerScreen.prototype.OnButtonPressed = function(button){
  if(button == btn_Up)
  {
    this.IncrementSelection(-4);
  }
  else if(button == btn_Down)
  {
    this.IncrementSelection(4);
  }
  else if(button == btn_Right)
  {
    this.IncrementSelection(1);
  }
  else if(button == btn_Left)
  {
    this.IncrementSelection(-1);
  }
  else if(button == btn_Select)
  {
    var focusedItem = this.GetFocusedItem();
    if(focusedItem != undefined)
    {
      this.OnOptionElemSelected(focusedItem);
    }
  }
  else if(button == btn_Back && this.CanPopScreen())
  {
    if(!IsRootScreen())
    {
      PopScreen();
    }
  }
  else if(button == btn_Invite){
    console.log("InvitePlayerScreen PRESSED")
    OnInvitePressed();
  }
  //BaseMenuScreen.prototype.OnButtonPressed.call(this, button);
}


InvitePlayerScreen.prototype.IncrementSelection = function(direction)
{
  console.log("IncrementSelection direction " + direction);
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
  console.log("idx " + idx);
  console.log("menuItems.length " + menuItems.length);
  console.log((idx + direction + menuItems.length) % menuItems.length);
  if(menuItems.length == 0){
    idx = 0;
  }else{
    idx = (idx + direction + menuItems.length) % menuItems.length;
  }
  console.log("idx " + idx);
  menuItems[idx].focus();
  this.OnSelectionChanged(menuItems[idx]);
}

InvitePlayerScreen.prototype.OnHide = function()
{
  BaseMenuScreen.prototype.OnHide.call(this);
}

InvitePlayerScreen.prototype.OnClosed = function()
{
  BaseMenuScreen.prototype.OnClosed.call(this);
}

InvitePlayerScreen.prototype.OnMenuActionClicked = function(MenuAction)
{
  BaseMenuScreen.prototype.OnMenuActionClicked.call(this, MenuAction);
}

//$.extend(WeaponsListScreen.prototype, VerticalMenuMixin);

Screens['InvitePlayerScreen'] = InvitePlayerScreen;
