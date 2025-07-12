var HorizontalMenuMixin = {
  OnButtonPressed : function(button)
  {
    Screen.prototype.OnButtonPressed.call(this, button);
    if(button == btn_Left)
    {
      this.IncrementSelection(-1);
    }
    else if(button == btn_Right)
    {
      this.IncrementSelection(1)
    }
    else if(button == btn_Down)
    {
      var focusedItem = this.GetFocusedItem();
      if(focusedItem != undefined)
      {
        if(this.IncrementOnElement != undefined)
        {
          this.IncrementOnElement(focusedItem, 1)
        }
      }
    }
    else if(button == btn_Up)
    {
      var focusedItem = this.GetFocusedItem();
      if(focusedItem != undefined)
      {
        if(this.IncrementOnElement != undefined)
        {
          this.IncrementOnElement(focusedItem, -1)
        }
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
    else if(button == btn_Back)
    {
      if(!IsRootScreen() && this.CanPopScreen())
      {
        PopScreen();
      }
    }
    else if(button == btn_LT)
    {
      this.IncrementPage(-1);
    }
    else if(button == btn_RT)
    {
      this.IncrementPage(1);
    }
  }
}
