//Add your CSS files here
$('head').append('<link rel="stylesheet" type="text/css" href="css/Screens/TitleScreen.css">');

function TitleScreen()
{
  BaseMenuScreen.call(this);
  this.Selector = document.getElementById("title-screen");
  this.ActiveMenu = document.getElementById("title-screen");
  this.isBlockingInput = false;
  this.ScreenActions = [{value: "Select"}];
  this.video = document.getElementById("title-screen-video");
  this.video.loop = true;
  this.bIsPaused = true;
  this.ScreenName = "TitleScreen";
}

TitleScreen.prototype = Object.create(BaseMenuScreen.prototype);
TitleScreen.prototype.constructor = TitleScreen;

TitleScreen.prototype.OnButtonPressed = function(button)
{
  if(this.isBlockingInput){
    return;
  }

  //if(button == btn_Select || button == btn_Pause){
  //  PushScreen("MainMenu");
  //}
}

engine.on("ShowClientWebLoginProgress", function () {
    console.log("ShowClientWebLoginProgress");

    var modalArgs = {
        options: [""],
        title: "Connecting...",
        bSupportsBackButton: true,
        callback: function (option) {
            if (option == "Cancel") {
                //DoQuit();
            }
        }
    }

    //PushModal('Modal', modalArgs);

    //engine.call("IsConsole").then(function (bIsConsole) {
    //    console.log("bIsConsole: " + bIsConsole);
    //    ClientwebData.bIsConsole = bIsConsole;
    //    engine.call("GetDataCenter").then(SelectAndConnectDataCenter);

    //    engine.call("GetOnlineIdentityName").then(function (playername) {
    //        PlayerProfileData.Nickname = playername;
    //    });

    //});

    // Skip any login dialog for now.
    //PushScreen("MainMenu");
    engine.call("ClientWebSignInComplete", true);
});

//function UserSignInComplete(success)
//{
//    if (false) {
//        PopModal();
//        success = true // Bypass failures to allow for offline play.  Need to take a better look how to handle connection issues.
//        engine.call("ClientWebSignInComplete", success);

//        if (success) {

//            engine.call("GetOnlineIdentityName").then(function (playername) {
//                PlayerProfileData.Nickname = playername;
//            });

//            PushScreen("MainMenu");
//            //PopModal();
//        }
//        else {
//            //var modalArgs = {
//            //    options: ["OK"],
//            //    title: "Failed to connect to client web.",
//            //    bSupportsBackButton: true,
//            //    callback: function (option) {

//            //    }
//            //}
//            //PushModal('Modal', modalArgs);
//        }
//    }

//    // We may still need this even if the above code is disabled. -- SDH
//    if (success) {
//      engine.call("GetOnlineIdentityName").then(function (playername) {
//        console.log("Online Identity: " + playername);
//        PlayerProfileData.Nickname = playername;
//      });
//    }
//}

engine.on("UserSignInComplete", function (success) {
   console.log("UserSignInComplete");
    //UserSignInComplete(success);
   if (success)
   {
       BeginMainMenu();
   }
});

engine.on("UserSignInStarted", function(){
  document.getElementById("start-game").classList.add("hidden");
  document.getElementById("connecting-game").classList.remove("hidden");
});

TitleScreen.prototype.OnShow = function ()
{
  this.Selector.classList.remove("slide-off");
  this.isBlockingInput = false;
  this.StartVideo();

  Screen.prototype.OnShow.call(this);

  engine.call("WelcomeScreenActive");

//  this.ResetFocus();
}

TitleScreen.prototype.StartVideo = function()
{
  //this.video.addEventListener('ended', this.OnTitleScreenVideoEnded);
  this.video.parentNode.classList.remove("hidden");
  if(this.bIsPaused == true)
  {
    this.video.play();
    this.bIsPaused = false;
  }
}

TitleScreen.prototype.OnTitleScreenVideoEnded = function()
{
  document.getElementById("title-screen-video").play();
}

TitleScreen.prototype.StopVideo = function()
{
  //this.video.removeEventListener('ended', this.OnVideoEnded);
  this.video.parentNode.classList.add("hidden");
  this.video.pause();
  this.bIsPaused = true;
}

TitleScreen.prototype.OnHide = function()
{
  console.log("TITLESCREEN ONHIDE");
  this.StopVideo();
  this.Selector.classList.add("hidden");
  engine.call("SetHomeScreenCamemra");
  document.getElementById("start-game").classList.remove("hidden");
  document.getElementById("connecting-game").classList.add("hidden");
}

Screens['TitleScreen'] = TitleScreen;
