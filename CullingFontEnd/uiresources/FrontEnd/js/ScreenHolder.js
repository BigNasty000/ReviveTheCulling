var Screens = {};
var ActiveScreen = {};
var ScreenStack = [];
var ModalStack = [];

/*
A Screen should have:
  -Selector
  -FocusElem
  -OnButtonPressed
  -OnShow
  -OnHide
  -OnCreation
  -OnClosed
  -Prolly other stuff

*/

function GetActiveScreen()
{
  if(ScreenStack.length > 0){
    return ScreenStack[ScreenStack.length - 1];
  }

  return undefined;
}

function GetActiveModal()
{
  if(ModalStack.length > 0){
    return ModalStack[ModalStack.length - 1];
  }

  return undefined;
}

function PushScreen(screen, args)
{
  if (screen == "SUBSYSTEM_FRIENDS") {
    // special case scenario
    engine.call("ShowSubsystemInviteFriendUI");
    return;
  }

  if(GetActiveScreen() != undefined)
  {
    GetActiveScreen().OnHide();
  }

  // console.trace();
  ScreenStack.push(new Screens[screen](args));
  GetActiveScreen().OnCreation();
}

function PushModal(screen, args)
{
  if (args.modalID != undefined)
  {
    // Close any existing modals with this ID already, such as connecting dialogs.
    PopModalByID(args.modalID);
  }

  if(GetActiveModal())
  {
    GetActiveModal().OnHide();
  }
  else if(GetActiveScreen())
  {
    GetActiveScreen().OnModalShowing();
  }
  ModalStack.push(new Screens[screen](args));
  GetActiveModal().OnCreation();
}

function PopScreenToMainMenu()
{
  while (GetActiveScreen() != undefined)
  {
    // hard coding is bad, but deadlines and re-occuring issues are worse -- SDH
    if (GetActiveScreen().ScreenName == undefined || GetActiveScreen().ScreenName == null || GetActiveScreen().ScreenName != "MainMenu" && GetActiveScreen().ScreenName != "TitleScreen") {
      PopScreen();
    }
    else {
      break;
    }
  }
  GetActiveScreen().ResetFocus();
}

function PopScreen(allowPopMainMenu)
{
  // console.log("PopScreen(): " + (new Error).stack);

  if ((allowPopMainMenu == undefined || !allowPopMainMenu) && GetActiveScreen().ScreenName != undefined && GetActiveScreen().ScreenName === "MainMenu")
  {
    console.log("Avoiding PopScreen() past main menu.");
    return; // don't pop main menu
  }

  GetActiveScreen().OnClosed();
  ScreenStack.pop();

  if(GetActiveScreen() != undefined)
  {
    GetActiveScreen().OnShow();
  }
}

function PopModal()
{
  if(GetActiveModal())
  {
    GetActiveModal().OnClosed();
    ModalStack.pop();

    if(GetActiveModal())
    {
      GetActiveModal().OnShow();
    }
    else if(GetActiveScreen())
    {
      GetActiveScreen().OnModalClosing();
    }
  }
}

function PopModalByID(modalID)
{
  if (modalID == undefined) {
    return null;
  }

  // Remove modals with this ID, regardless of Z order, showing the one that is topmost if the one above it was topmost and closed, or notifying the screen if all modals are closed
  var topModalIndex = ModalStack.length - 1;
  var closedModal = null;

  for (var i = topModalIndex; i >= 0; i--)
  {
    if (ModalStack[i].modalID == modalID)
    {
      // Matches this ID,  may or may not be the one on top
      closedModal = ModalStack[i];
      ModalStack[i].OnClosed();
      ModalStack.splice(i, 1);

      if (i == topModalIndex)
      {
        if (i > 0)
        {
          // If I'm the top one, then closing this one should show the modal prior to this one, if there is one
          ModalStack[i-1].OnShow();
        }
      }

      topModalIndex--;

      // For now, let's assume the ID is unique (since we made PushModal ensure uniqueness)
      break;
    }
  }

  if (closedModal != null && topModalIndex < 0)
  {
    GetActiveScreen().OnModalClosing();
  }

  return closedModal;
}

function GetScreenBelow()
{
    if(ScreenStack.length > 1)
    {
      return ScreenStack[ScreenStack.length - 2];
    }

    return undefined;
}

function OnMouseClicked(element)
{
  if(GetActiveModal() != undefined)
  {
    GetActiveModal().OnMouseClicked(element);
  }
  else if(GetActiveScreen() != undefined)
  {
    GetActiveScreen().OnMouseClicked(element);
  }
}

function OnFocusOut(event)
{
  if(GetActiveModal() != undefined)
  {
    GetActiveModal().OnFocusOut(event);
  }
  else if(GetActiveScreen() != undefined)
  {
    GetActiveScreen().OnFocusOut(event);
  }
}

function OnMouseHover(element)
{
  if(GetActiveModal() != undefined)
  {
    GetActiveModal().OnMouseHover(element);
  }
  else if(GetActiveScreen() != undefined)
  {
    GetActiveScreen().OnMouseHover(element);
  }
}

function OnMouseOut(element)
{
  if(GetActiveModal() != undefined)
  {
    GetActiveModal().OnMouseOut(element);
  }
  else if(GetActiveScreen() != undefined)
  {
    GetActiveScreen().OnMouseOut(element);
  }
}

function OnButtonPressed(button, controllerID)
{
  console.log("Controller " + controllerID + " pressed button " + button);
  if(button == btn_Invite)
  {
    if(GetActiveScreen().ScreenName != "TitleScreen"){
      InvitePlayer();
    }
  }
  else if(button == btn_Y)
  {
    OnCancelMatchmaking();
  }

  if(GetActiveModal() != undefined)
  {
    GetActiveModal().OnButtonPressed(button);
  }
  else if(GetActiveScreen() != undefined)
  {
    console.log("ScreenHolder OnButtonPressed: " + button);
    GetActiveScreen().OnButtonPressed(button);
  }
  //window[controllerData.handler](button);
}

function IsRootScreen()
{
  return (ScreenStack.length <= 1);
}

function SetScreenActions(Actions)
{
  console.log("Setting new actions: " + JSON.stringify(Actions));
  if(Actions == undefined || Actions.length == 0)
  {
    document.getElementById("controls-footer").classList.add("hidden");
    return;
  }

  /*
  if(Actions.length == FooterData.Actions.length)
  {
    var dirty = false;
    for(var i = 0; i < FooterData.Actions.length; ++i)
    {
      console.log("Testing: " + FooterData.Actions[i] + " vs " + Actions[i]);
      if(FooterData.Actions[i] != Actions[i])
      {
        dirty = true;
        break;
      }
    }

    if(dirty != true)
    {
      console.log("Early out");
      return;
    }
  }
  */

  //Rivets isn't picking up shrinking array size changes without first triggering the rebind.
  //A new version will probably fix this, but this isn't the end of the world.
  FooterData.Actions = [];
  //console.log("Setting new Screen Actions: " + JSON.stringify(Actions));
  FooterData.Actions = Actions;
  document.getElementById("controls-footer").classList.remove("hidden");
}

function OnMenuActionClicked(element)
{
  if(element && element.dataset && element.dataset.menuAction)
  {
    if(GetActiveScreen() != undefined)
    {
      GetActiveScreen().OnMenuActionClicked(element.dataset.menuAction)
    }
  }
}
