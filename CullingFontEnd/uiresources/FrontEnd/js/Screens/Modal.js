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
    title2: args.title2,
    description: args.description,
    needInput : args.needInput,
    isInviteModal : args.isInviteModal,
    hideOptions : args.hideOptions
  }
  this.bSupportsBackButton = args.bSupportsBackButton != undefined ? args.bSupportsBackButton : true;
  //this.ScreenActions = [];
  this.callback = args.callback;
  this.InitDynGen("ModalScreen");
  this.modalID = (args.modalID != undefined ? args.modalID : "");
  this.screenDesired = (args.screenDesired != undefined ? args.screenDesired : "");
}

ModalScreen.prototype = Object.create(BaseMenuScreen.prototype);
ModalScreen.prototype.constructor = ModalScreen;

ModalScreen.GetInputValue = function ()
{
  console.log("GetInputValue");
    //return document.getElementById('lobby-code-input').value;
    //return $('#lobby-code-input').val();
    return $('#modal-body').val();
}

ModalScreen.prototype.OnCreation = function()
{
  this.OnCreation_DynGen();
  this.ActiveMenu = $(this.Selector).find(".modal-menu")[0];
  this.InputField = $(this.Selector).find('input')[0];
  this.rivetsBinder = rivets.bind($(this.Selector), {
    screenData : this.screenData,
    Friends : Friends
  });
  this.ResetFocus();
  $(this.Selector).find('li').hover(function(event){
    if(event)
    {
      OnMouseHover(event.target);
    }
  });
  if(this.screenData.hideOptions){
    this.ActiveMenu.classList.add("hidden");
  }
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
  if (elem.dataset != undefined)
  {
     if(elem.dataset.filter != undefined)
     {
       PlayScreen.FilterPressed(elem);
     }
  }

  BaseMenuScreen.prototype.OnOptionElemSelected.call(this, elem);
}


ModalScreen.prototype.OnButtonPressed = function(button)
{
  Screen.prototype.OnButtonPressed.call(this, button);
  if(button == btn_Right)
  {
    this.IncrementSelection(1);
  }
  else if(button == btn_Left)
  {
    this.IncrementSelection(-1)
  }
  else if(button == btn_Up)
  {
    if(document.getElementById("filter-list-container") != null)
    {
      this.SetNewActiveMenu(document.getElementById("filter-list-container"));
      this.ResetFocus();
    }
    else{
      this.IncrementSelection(1);
    }
  }
  else if(button == btn_Down)
  {
    this.SetNewActiveMenu($(this.Selector).find(".modal-menu")[0]);
    this.ResetFocus();
  }
  else if(button == btn_Select)
  {
    var focusedItem = this.GetFocusedItem();
    console.log(focusedItem);
    if(focusedItem != undefined)
    {
      console.log(focusedItem);
      this.OnOptionElemSelected(focusedItem);
    }
  }
  else if(button == btn_Back && (this.bSupportsBackButton == undefined || this.bSupportsBackButton == true))
  {
    PopModal();
  }
}

ModalScreen.prototype.OnMouseClicked = function(elem){
    BaseMenuScreen.prototype.OnMouseClicked.call(this, elem);
}

$.extend(ModalScreen.prototype, DynGenMixin);

Screens['Modal'] = ModalScreen;
