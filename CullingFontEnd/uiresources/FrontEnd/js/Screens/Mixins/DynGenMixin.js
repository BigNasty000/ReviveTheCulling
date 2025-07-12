var DynGenMixin = {
  InitDynGen : function(elemName)
  {
    this.DynamicElementSource = document.getElementById(elemName);
    this.ElemName = elemName;
    this.IsStaticScreen = false;
    this.Selector = undefined;
  },

  OnCreation_DynGen : function()
  {
    var newNode = this.DynamicElementSource.cloneNode(true);
    this.Selector = document.body.appendChild(newNode);
  },

  OnClosed_DynGen : function()
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
}
