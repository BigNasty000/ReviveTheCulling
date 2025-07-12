//Add your CSS files here
$('head').append('<link rel="stylesheet" type="text/css" href="css/Screens/Ranked.css">');

function RankedScreen()
{
  BaseMenuScreen.call(this);
  this.Selector = document.getElementById("ranked-menu");
  this.ActiveMenu = document.getElementById("ranked-menu-options");
  this.ScreenActions = [{value:"Select"}, {value:"Back"}];
}

RankedScreen.prototype = Object.create(BaseMenuScreen.prototype);
RankedScreen.prototype.constructor = RankedScreen;

RankedScreen.prototype.OnOptionElemSelected = function(elem)
{
  if(elem.dataset && elem.dataset.queue && Matchmaking.IsMatchmaking == false)
  {
    var queue = elem.dataset.queue;
    if(queue == "ffa")
    {
      QueueMatchmaking("ranked_ffa").then(function(result){
        console.log("Queue Result: " + result);
        if(result)
        {
          //TODO: Create a return to main menu function and don't be lazy
          PopScreen();
          PopScreen();
        }
        else
        {
          ShowError("Failed to join queue. Please try again.");
        }
      });
    }
    else if(queue == "teams")
    {
      QueueMatchmaking("ranked_coop2").then(function(result){
        console.log("Queue Result: " + result);
        if(result)
        {
          //TODO: Create a return to main menu function and don't be lazy
          PopScreen();
          PopScreen();
        }
        else
        {
          ShowError("Failed to join queue. Please try again.");
        }
      });
    }
    else
    {
      ShowError("Queue doesn't exist");
    }
  }
  else
  {
    BaseMenuScreen.prototype.OnOptionElemSelected.call(this, elem);
  }
}

$.extend(RankedScreen.prototype, HorizontalMenuMixin);
Screens['Ranked'] = RankedScreen;
