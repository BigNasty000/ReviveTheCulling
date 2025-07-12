const OutcomeScreenSelector = document.getElementById("EOMOutcomeContainer");

//Add your CSS files here
$('head').append('<link rel="stylesheet" type="text/css" href="css/Screens/EndOfMatch.css">');

var ReadyForEOMSummary = true;

function OutcomeScreen()
{
  console.log("Outcome Construct");
  BaseMenuScreen.call(this);
  this.Selector = OutcomeScreenSelector;
  this.bIsVictory;
  this.ScreenName = "OutcomeScreen";

}

OutcomeScreen.prototype = Object.create(BaseMenuScreen.prototype);
OutcomeScreen.prototype.constructor = OutcomeScreen;

rivets.bind($('#EOMOutcomeContainer'), {
    deathData: deathData
});

rivets.bind($('#EOMHeaderContainer'), {
    deathData: deathData
});


OutcomeScreen.prototype.OnCreation = function()
{
  console.log("OnCreation");
  console.log(JSON.stringify(deathData));
  BaseMenuScreen.prototype.OnCreation.call(this);
}

OutcomeScreen.prototype.OnShow = function()
{
    engine.call("EnableCoherentInput", true);
    console.log(JSON.stringify(deathData));
    console.log("EOMOnShow");
    //EOMHeaderContainer.classList.remove("hidden");
    //EOMContainer.classList.remove("hidden");
    if(deathData.bIsVictory){
  		EOMBackground.classList.remove("loser");
  		EOMBackground.classList.add("winner");
  		deathData.HeaderText = "VICTORY";
  		EOMHeaderOutcomeTitle.classList.add("header-outcome-victory");
  	} else {
      EOMBackground.classList.remove("winner");
  		EOMBackground.classList.add("loser");
  		if(deathData.bWasSuicide){
  			deathData.HeaderText = "SUICIDE";
  		} else {
  			deathData.HeaderText = "HUNTED";
  		}
  		EOMHeaderOutcomeTitle.classList.add("header-outcome-hunted");
  	}
  	EOMStatusImg.classList.add(deathData.HeaderText);
    EOMHeaderOutcomeTitle.classList.remove("hidden");
  	EOMOutcomeContainer.classList.remove("hidden");
    setTimeout(function () {
        EOMOutcomeContainer.classList.add("hidden");
        //OutcomeScreen.CheckForEOMSummary();
        EOMBackground.classList.add("hidden");
    }, 5500);

    BaseMenuScreen.prototype.OnShow.call(this);
}

//OutcomeScreen.OnEOMStatsReady = function (showXpProgress)
//{
//    ReadyForEOMSummary = true;
//}

//OutcomeScreen.CheckForEOMSummary = function(){
//  if(ReadyForEOMSummary){
//    PushScreen("EndOfMatchScreen");
//    EOMBackground.classList.add("hidden");
//  }
//  else{
//    OutcomeScreen.CheckForEOMSummary();
//  }
//}

OutcomeScreen.prototype.OnHide = function()
{
  console.log("OutcomeScreenHide");
  BaseMenuScreen.prototype.OnHide.call(this);
}

OutcomeScreen.prototype.OnClosed = function()
{
  console.log("OutcomeScreenClose");
  BaseMenuScreen.prototype.OnClosed.call(this);
}

OutcomeScreen.prototype.OnMouseClicked = function(elem)
{
  console.log("OutcomeScreen OnMouseClicked" + elem);
    //BaseMenuScreen.prototype.OnMouseClicked.call(this, elem);
}

OutcomeScreen.prototype.OnMenuActionClicked = function(MenuAction){
    console.log("OutcomeScreen MenuActionClicked: " + MenuAction);
    if(MenuAction != "Back"){
      BaseMenuScreen.prototype.OnMenuActionClicked.call(this, MenuAction);
    }
    /*if (MenuAction == "Spectate") {
        if (bEOMSummaryComplete) {
            OnSpectateClicked();
            PushScreen('SpectateMatch');
        }
    }*/
}

OutcomeScreen.prototype.OnButtonPressed = function(button)
{
  console.log("OutcomeScreenButtonPressed: " + button);
  switch(String(button))
  {
    case "1":
        console.log("ShowPauseMenu: " + isPauseVisible);
        engine.call("ShowPauseMenu");
      return;
      break;
    case "9":
      console.log("ShowPauseMenu: " + isPauseVisible);
      engine.call("ShowPauseMenu");
      return;
      break;
      /*
    case "6":
      SetActiveTab(-1);
      break;
    case "7":
      SetActiveTab(1);
      break;
    case "12":
      SetActivePlayer(-1)
      break;
    case "13":
      SetActivePlayer(1)
      break;*/
  }
  BaseMenuScreen.prototype.OnButtonPressed.call(this, button);
}
Screens['OutcomeScreen'] = OutcomeScreen;
