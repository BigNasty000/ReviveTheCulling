var VerticalMenuMixin = {
  OnButtonPressed : function(button)
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
      var focusedItem = this.GetFocusedItem();
      if(focusedItem != undefined)
      {
        if(this.IncrementOnElement != undefined)
        {
          this.IncrementOnElement(focusedItem, 1)
        }
      }
    }
    else if(button == btn_Left)
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
        if(focusedItem.id == "Exit-Game")
        {
          OnQuitClicked();
        }
		else if(focusedItem.id == "Store-Button")
        {
          OpenStoreWidget();
        }

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
    else if(button == btn_LT)
    {
      console.log("LT");
      if(!ClientwebData.bIsConsole && this.ConsoleSpecific)
      {
        this.IncrementTabNav(-1);
      }
    }
    else if(button == btn_RT)
    {
      console.log("RT");
      if(!ClientwebData.bIsConsole && this.ConsoleSpecific)
      {
        this.IncrementTabNav(1);
      }
    }
    else if(button == btn_Pause)
    {
      console.log("btn_Pause");
      OpenCurrencyPurchaseWidget();
    }
  }
}
