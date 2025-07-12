//Add your CSS files here
$('head').append('<link rel="stylesheet" type="text/css" href="css/Screens/MainMenu.css">');

var isDraggingChar = false;
var startingPosChar = [];
var previousPosChar = [];
var currentPosChar = [];

$(document)
    .mousedown(function (evt) {
        isDraggingChar = true;
        startingPosChar = [evt.pageX, evt.pageY];
        currentPosChar = [evt.pageX, evt.pageY];
        previousPosChar = [evt.pageX, evt.pageY];
    })
    .mousemove(function (evt) {
        if (!(evt.pageX === startingPosChar[0] && evt.pageY === startingPosChar[1])) {
            if (isDraggingChar) {
              currentPosChar=[evt.pageX, evt.pageY];
              var offset = previousPosChar[0] - currentPosChar[0];
              engine.call("UpdateItemRotation", offset);
              previousPosChar=currentPosChar;
            }
        }
    })
    .mouseup(function () {
        isDraggingChar = false;
        startingPosChar = [];
    });

var MainMenuScreenData = {
  Version : "TEST_VERSION",
  bHasNewCust : false,
  bHasNewAirdrop : false,
  bHasNewCrate : false
}

var bPromptForTutorial = true;

var showMigrationModal = true;

function MainMenuScreen()
{
  BaseMenuScreen.call(this);
  this.Selector = document.getElementById("main-menu");
  this.ActiveMenu = document.getElementById("main-menu-options");
  this.ActiveMenuID = "main-menu-options";
  this.ScreenLists = ["main-menu-options", "store-crate-menu-options"];
  this.ScreenActions = [{value:"Select"}];
  this.ScreenName = "MainMenu";
}

MainMenuScreen.prototype = Object.create(BaseMenuScreen.prototype);
MainMenuScreen.prototype.constructor = MainMenuScreen;

rivets.bind($("#status-bar"), {
  ClientwebData : ClientwebData
});

rivets.bind($("#main-menu"), {
  screenData : MainMenuScreenData,
  Matchmaking: Matchmaking,
  LobbyData : LobbyData,
  ClientwebData : ClientwebData
});

rivets.bind($('#player-card'), {
  screenData : ProfileScreenData,
  ClientwebData : ClientwebData,
  FooterData: FooterData,
  PlayerProfileData : PlayerProfileData
});

rivets.formatters.hasNicknameAndLevel = function(valueA, valueB) {
	return (ClientwebData.Stats.level != undefined && ClientwebData.Stats.level != 0 && ClientwebData.Stats.level != "" && PlayerProfileData.Nickname != "");
};

//XAV_AFM Disable Challenges
//rivets.bind($('#challenges-sidebar'),{
//  challengeData : ClientwebData
//})

MainMenuScreen.prototype.OnCreation = function()
{
  BaseMenuScreen.prototype.OnCreation.call(this);
  engine.call("PostSoundEvent", "Stop_StartScreen_Loop");
  engine.call("PostSoundEvent", "Play_MenuMusic");
}

MainMenuScreen.prototype.OnShow = function()
{
  CheckMainMenuStartupModals();

  this.SetNewActiveMenu(this.ActiveMenu);
  //document.getElementById("debug-info").classList.remove("hidden");
  engine.call("HasNewCustomizations").then(function(result){
    MainMenuScreenData.bHasNewCust = result;
  });

  /* deprecated
  engine.call("HasNewCustomizationForType", "airdrop").then(function(result){
    MainMenuScreenData.bHasNewAirdrop = result;
  });
  */

  engine.call("SetHomeScreenCamemra");

  document.getElementById("player-card").classList.remove("hidden");
  document.getElementById("party-section").classList.remove("hidden");
  document.getElementById("status-bar").classList.remove("hidden");
    // XAV_AFM Disable Challenges document.getElementById("challenges-sidebar").classList.remove("hidden");
  BaseMenuScreen.prototype.OnShow.call(this);

  console.log("Checking SkipToScreen ");
  engine.call("GetSkipToScreen").then(function (screenName) {
      console.log("SkipToScreen " + screenName);
      if (screenName != "") {
          PushScreen(screenName);
          engine.call("ResetSkipToScreen");
      }
  });
}

function CheckMainMenuStartupModals()
{
  // Make sure connected before running this
  if (!IsOnline()) {
    return;
  }

  if (GetActiveScreen() == undefined || GetActiveScreen().ScreenName == "TitleScreen") {
    return;
  }

  if(!ClientwebData.Migrated && showMigrationModal){
      showMigrationModal = false;
      var waitingForItemMigration = false;
    var modalArgsConvert = {
        options: ["OK"],
        title: "New Loot System!",
        description: "<p style='font-size: 1vw;'><b style='font-family: ForgottenFuturist-Bold'>Attention Contestant:</b> Our recent update features an all-new loot system, which <b style='color: #fbaa0f;'>no longer utilizes the Steam Item Inventory.</b><br><br> <b style='color: #fbaa0f;'>This process will award you equivalent items,</b> along with additional new cosmetic items and Cull Crates,<br>based on an analysis of your inventory.<br></p>",
        bSupportsBackButton: false,
        needInput: false,
        callback: function (option) {
            if (option == "OK") {
                PopModal();
                var modalArgsProcessing = {
                    options: ["OK"],
                    title: "",
                    description: "<b class='pulse'>Processing. Please wait....</b>",
                    bSupportsBackButton: false,
                    needInput: false,
                    hideOptions:true,
                }
                PushModal('Modal', modalArgsProcessing);

                waitingForItemMigration = true;
                setTimeout(function () {
                    if (waitingForItemMigration)
                    {
                        console.log("item migration fail timeout ");
                        waitingForItemMigration = false;
                        PopModal();
                        var modalArgsFailed = {
                            options: ["OK"],
                            title: "Item Migration Failed",
                            description: "Error: Time out",
                            bSupportsBackButton: false,
                            needInput: false,
                            hideOptions: false,
                            callback: function (failedResponse) {
                                //while (ScreenStack.length > 0) {
                                //    PopScreen();
                                //}
                                //PushScreen("TitleScreen");
                                showMigrationModal = true;
                            }
                        }
                    }
                }, 15000);

                ConnectWebsocketIfNeeded().then(function () {
                  if (IsOnline()) {
                    socketConnection.on("item-migration", function (msg) {
                        console.log(msg);
                        if (waitingForItemMigration) {
                            waitingForItemMigration = false;
                            ClientwebData.Migrated = true;
                            PopModal();

                            //ShowTutorialPromptIfNeeded();
                        }
                    });

                    socketConnection.on("item-migration-fail", function (msg) {
                        console.log("item-migration-fail:: " + JSON.stringify(msg));
                        //engine.call("OnQuitClicked");
                        if (waitingForItemMigration) {
                            waitingForItemMigration = false;
                            PopModal();
                            var modalArgsFailed = {
                                options: ["OK"],
                                title: "Item Migration Failed",
                                description: "Error: " + JSON.stringify(msg),
                                bSupportsBackButton: false,
                                needInput: false,
                                hideOptions: false,
                                callback: function (failedResponse) {
                                    //while (ScreenStack.length > 0) {
                                    //    PopScreen();
                                    //}
                                    //PushScreen("TitleScreen");
                                    showMigrationModal = true;
                                }
                            }
                            PushModal('Modal', modalArgsFailed);
                        }
                    });
                    socketConnection.emit("start-item-migration");
                  }
                });
            }
        }
    }
    PushModal('Modal', modalArgsConvert);
  }
  /*else {
    if (ClientwebData.Migrated) {
      ShowTutorialPromptIfNeeded();
    }
  }*/
}

function ShowTutorialPromptIfNeeded()
{
  console.log("GamesPlayed: " + ClientwebData.Stats.gamesPlayed);

  if (bPromptForTutorial && ClientwebData.Stats.gamesPlayed == 0)
  {
      bPromptForTutorial = false;
      console.log("Checking Tutorial Prompt ");
      engine.call("ShouldPromptForTutorial").then(function (bPromptTutorial) {
          if (bPromptTutorial)
          {
              var modalArgs = {
                  options: ["PLAY TUTORIAL", "SKIP"],
                  title: "LEARN HOW TO SURVIVE IN THE CULLING WITH THIS SHORT TUTORIAL",
                  bSupportsBackButton: true,
                  callback: function (option) {

                      switch (option)
                      {
                          case "PLAY TUTORIAL":
                              engine.call("StartTraining", "Tutorial");
                              break;
                          case "SKIP":
                              engine.call("DismissedTutorialPrompt");
                              break;
                      }
                  }
              }
              PushModal('Modal', modalArgs);
          }
      });
  }
}

MainMenuScreen.prototype.OnHide = function()
{
  document.getElementById("status-bar").classList.add("hidden");
  this.ActiveMenu = document.getElementById("main-menu-options");
  this.ActiveMenuID = "main-menu-options";
    // XAV_AFM Disable Challenges document.getElementById("challenges-sidebar").classList.add("hidden");
  //document.getElementById("debug-info").classList.add("hidden");
  BaseMenuScreen.prototype.OnHide.call(this);
}

MainMenuScreen.prototype.OnClosed = function()
{
  this.ActiveMenu = document.getElementById("main-menu-options");
  this.ActiveMenuID = "main-menu-options";
  BaseMenuScreen.prototype.OnClosed.call(this);
}

MainMenuScreen.prototype.OnButtonPressed = function(button)
{
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
    this.IncrementLists(1);
  }
  else if(button == btn_Left)
  {
    this.IncrementLists(-1);
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
      else if(focusedItem.id == "Crates-Button")
      {
        OpenCratePurchaseWidget();
      }
      this.OnOptionElemSelected(focusedItem);
    }
  }
  else if(button == btn_Back && (this.bSupportsBackButton == undefined || this.bSupportsBackButton == true))
  {
    if(this.IsModal())
    {
      PopModal();
    }
  }
  else if(button == btn_LT)
  {

  }
  else if(button == btn_RT)
  {

  }
  else if(button == btn_Pause)
  {
    console.log("btn_Pause");
    OpenCurrencyPurchaseWidget();
  }
  // else if(button == btn_Y && !LobbyData.IsInLobby)
  // {
  //   OpenCurrencyPurchaseWidget();
  // }
  //BaseMenuScreen.prototype.OnButtonPressed.call(this, button);
}

// MainMenuScreen.prototype.OnButtonPressedOverride = function(button)
// {
//   if(button == btn_Y && !LobbyData.IsInLobby)
//   {
//     PurchaseWidgetController.ActiveCategory = 0;
//     UpdateJSModel(PurchaseWidgetController);
//     PushScreen("PurchaseWidget");
//   }
//   BaseMenuScreen.prototype.OnButtonPressed.call(this, button);
// }
MainMenuScreen.prototype.OnMenuActionClicked = function(MenuAction){

  BaseMenuScreen.prototype.OnMenuActionClicked.call(this, MenuAction);
}

//$.extend(MainMenuScreen.prototype, VerticalMenuMixin);

Screens['MainMenu'] = MainMenuScreen;
