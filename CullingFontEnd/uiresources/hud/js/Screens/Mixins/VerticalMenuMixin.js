var VerticalMenuMixin = {
  OnButtonPressed : function(button)
  {
    console.log(button);
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
        this.OnOptionElemSelected(focusedItem);
      }
    }
    else if(button == btn_Back)
    {
      //this.BackButtonAction();
      console.log(this.ScreenName);
      if(!IsRootScreen() && this.CanPopScreen())
      {
        console.log("VERT POP " + isPauseVisible);
        PopScreen();
      }
    }
    else if(button == btn_Pause)
    {
      if(!IsRootScreen() && this.CanPopScreen())
      {
        console.log("VERT POP " + isPauseVisible);
        PopScreen();
      }
      //this.PauseButtonAction();

      /*if(this.ScreenName == "PauseMainScreen"){
        if(deathData.bDeathScreenShown){
          console.log("VERTICALPAUSE POP");
          PopScreen();
        }
        else{
          console.log("VERTICALPAUSE TOGGLE");
          PauseMainScreen.TogglePauseMenu();
        }
      }*/
    }
    else if(button == btn_LT)
    {
      console.log("LT");
      if(!matchData.bIsConsole && this.ConsoleSpecific)
      {
        this.IncrementTabNav(-1);
      }
    }
    else if(button == btn_RT)
    {
      console.log("RT");
      if(!matchData.bIsConsole && this.ConsoleSpecific)
      {
        this.IncrementTabNav(1);
      }
    }
  }
}
