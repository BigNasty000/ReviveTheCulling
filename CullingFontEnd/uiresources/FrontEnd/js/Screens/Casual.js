//Add your CSS files here
$('head').append('<link rel="stylesheet" type="text/css" href="css/Screens/Casual.css">');

function CasualScreen()
{
  BaseMenuScreen.call(this);
  this.Selector = document.getElementById("casual-menu");
  this.ActiveMenu = document.getElementById("casual-menu-options");
  this.ScreenActions = [{value:"Select"}, {value:"Back"}];
}

CasualScreen.prototype = Object.create(BaseMenuScreen.prototype);
CasualScreen.prototype.constructor = CasualScreen;

CasualScreen.prototype.OnOptionElemSelected = function(elem)
{
  if(elem.dataset && elem.dataset.queue && Matchmaking.IsMatchmaking == false)
  {
    var queueToJoin = null;
    var queue = elem.dataset.queue;
    if(queue == "ffa")
    {
        queueToJoin = "ffa_jungle";
    }
    else if(queue == "teams")
    {
        queueToJoin = "ffa_jungle_coop2";
    }
    else if (queue == "quick_play")
    {
        queueToJoin = "quick_play";
    }
    else
    {
        ShowError("Queue doesn't exist: " + queue);
    }
    console.log("LobbyData.IsInLobby: " + LobbyData.IsInLobby);
    
    if (queueToJoin != null && !LobbyData.IsInLobby)
    {
        QueueMatchmaking(queueToJoin).then(function (result) {
            console.log("Queue Result: " + result);
            if (result) {
                //TODO: Create a return to main menu function and don't be lazy
                PopScreenToMainMenu();
            }
            else {
                ShowError("Failed to join queue. Please try again.");
            }
        });
    }
  }
  else
  {
    BaseMenuScreen.prototype.OnOptionElemSelected.call(this, elem);
  }
}

$.extend(CasualScreen.prototype, HorizontalMenuMixin);

Screens['Casual'] = CasualScreen;

/*
return $.when(
  engine.call("GetAppID"),
  engine.call("GetClientwebUrl", ClientwebData.ActualDataCenter),
  engine.call("GetClientwebOverride"),
  engine.call("GetClientBuild"),
).done(function(appid, url, override, build, rank){
    console.log("AppID: " + appid + " URL: " + url + " Override: " + override + " Build: " + build + " Rank: " + rank);
    return url;
  }
);*/
