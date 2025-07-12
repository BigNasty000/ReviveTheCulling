//Add your CSS files here
$('head').append('<link rel="stylesheet" type="text/css" href="css/Screens/Modal.css">');

function ModalScreen(args)
{
  if(args.options == undefined || args.options.length == 0 || args.title == undefined)
  {
    console.error("ModalScreen constructor missing args");
    return;
  }

  this.screenData = {
    options : args.options,
    title : args.title,
    needInput : args.needInput
  }
  this.bSupportsBackButton = args.bSupportsBackButton != undefined ? args.bSupportsBackButton : true;
  //this.ScreenActions = [];
  this.callback = args.callback;
  this.InitDynGen("ModalScreen");

}

ModalScreen.prototype = Object.create(BaseMenuScreen.prototype);
ModalScreen.prototype.constructor = ModalScreen;

ModalScreen.prototype.OnCreation = function()
{
  this.OnCreation_DynGen();
  this.ActiveMenu = $(this.Selector).find(".modal-menu")[0];
  this.rivetsBinder = rivets.bind($(this.Selector), {
    screenData : this.screenData
  });

  this.ResetFocus();

  $(this.Selector).find('li').hover(function(event){
    if(event)
    {
      OnMouseHover(event.target);
    }
  });

  BaseMenuScreen.prototype.OnCreation.call(this);
}

ModalScreen.prototype.OnShow = function()
{
  this.Selector.classList.remove("hidden");
  this.ResetFocus();
}

ModalScreen.prototype.IsModal = function()
{
  return true;
}

ModalScreen.prototype.OnClosed = function()
{
  if(this.rivetsBinder != undefined)
  {
    this.rivetsBinder.unbind();
  }
  this.OnClosed_DynGen();
}

ModalScreen.prototype.OnSelectionChanged = function(elem)
{
  BaseMenuScreen.prototype.OnSelectionChanged.call(this, elem);
}

ModalScreen.prototype.OnOptionElemSelected = function(elem)
{
  if(elem.dataset && elem.dataset.option)
  {
    var option = elem.dataset.option;

    PopModal();

    if(this.callback)
    {
      this.callback(option);
    }
  }

  BaseMenuScreen.prototype.OnOptionElemSelected.call(this, elem);
}

ModalScreen.prototype.OnButtonPressed = function(button)
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
  else if(button == btn_Right)
  {
    this.IncrementSelection(1)
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
  else if(button == btn_Back && (this.bSupportsBackButton == undefined || this.bSupportsBackButton == true))
  {
    PopModal();
  }
}

$.extend(ModalScreen.prototype, DynGenMixin);

Screens['Modal'] = ModalScreen;
