//I don't think I should make this a mix-in, as much I want to

function DynGenScreen(elemName)
{
  Screen.call(this);
  this.DynamicElementSource = document.getElementById(elemName);
  this.ElemName = elemName;
  this.IsStaticScreen = false;
  this.Selector = undefined;
}

DynGenScreen.prototype = Object.create(Screen.prototype);
DynGenScreen.prototype.constructor = DynGenScreen;

DynGenScreen.prototype.OnCreation = function()
{
  var newNode = this.DynamicElementSource.cloneNode(true);
  this.Selector = document.body.appendChild(newNode);
}

DynGenScreen.prototype.OnClosed = function()
{
  if(this.Selector)
  {
    this.Selector.remove();
    this.Selector = undefined;
    this.DynamicElementSource = undefined;
  }
  else
  {
    console.log("Failed to remove dynamic Element for Elem of Type: " + this.DynamicElementSource.ElemName);
  }
}
