const QueueWidgetSelector = document.getElementById("queue-widget");

//Add your CSS files here
$('head').append('<link rel="stylesheet" type="text/css" href="css/QueueWidget.css">');

rivets.bind($(QueueWidgetSelector), {
  widgetData : Matchmaking,
  FooterData : FooterData,
  LobbyData : LobbyData
});

function OnCancelMatchmaking()
{
  if(Matchmaking.IsMatchmaking)
  {
      LeaveMatchmaking();
  }
  if(LobbyData.IsInLobby)
  {
    LeaveLobby();
    if(GetActiveScreen().ScreenName == "CustomScreen")
    {
      PopScreen();
    }
  }
}
