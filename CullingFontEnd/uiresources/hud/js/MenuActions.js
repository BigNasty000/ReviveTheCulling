var MenuActions = {
  "Select" : {
    "GamepadOnly" : true,
    "Symbol" : {
      "Gamepad" : "&#x0037;",
    },
    "Label" : "Select",
    "Clickable" : false,
  },
  "Back" : {
    "GamepadOnly" : false,
    "Symbol" : {
      "Keyboard" : "ESC",
      "Gamepad" : "&#x0038;",
    },
    "Label" : "Back",
    "Clickable" : true,
  },
  "IncrementOption" : {
    "GamepadOnly" : true,
    "Symbol" : {
      "Gamepad" : "&#x0034;",
    },
    "Label" : "Next",
    "Clickable" : false,
  },
  "DecrementOption" : {
    "GamepadOnly" : true,
    "Symbol" : {
      "Gamepad" : "&#x0033;",
    },
    "Label" : "Previous",
    "Clickable" : false,
  },
  "Spectate" : {
    "GamepadOnly" : false,
    "Symbol" : {
      "Keyboard" : "TAB",
      "Gamepad" : "&#x0037;",
    },
    "Label" : "Spectate",
    "Clickable" : true,
  },
  "LeaveGame" : {
    "GamepadOnly" : false,
    "Symbol" : {
      "Keyboard" : "ESC",
      "Gamepad" : "&#x0038;",
    },
    "Label" : "Leave Game",
    "Clickable" : true,
  },
  "MatchSummary": {
    "GamepadOnly" : false,
    "Symbol" : {
    "Keyboard" : "TAB",
    "Gamepad": "&#x0038;",
    },
    "Label": "Match Summary",
    "Clickable" : true,
  },
  "XBoxProfile" : {
    "GamepadOnly" : true,
    "Symbol" : {
      "Gamepad" : "&#x0035;",
    },
    "Label" : "View XBox Profile",
    "Clickable" : false,
    "ConsoleOnly" : true,
  }
}

function IsActionClickable(action)
{
  if(action != undefined && MenuActions[action] != undefined)
  {
    return MenuActions[action]["Clickable"];
  }
  return false;
}

function GetSymbolForAction(action)
{
    if(FooterData.bHasGamepad)
    {
      return MenuActions[action]["Symbol"]["Gamepad"];
    }
    else
    {
      return MenuActions[action]["Symbol"]["Keyboard"];
    }
}

function GetLabelForAction(action)
{
  return MenuActions[action]["Label"];
}

function IsActionVisibleForInput(action)
{
    console.log("IsActionVisibleForInput action: " + action);
    console.log("IsActionVisibleForInput MenuActions[action]: " + MenuActions[action]);

  if(action != undefined && MenuActions[action] != undefined)
  {
      console.log("action: " + action);
      if (!MenuActions[action]["GamepadOnly"] || (FooterData.bHasGamepad && MenuActions[action]["GamepadOnly"]))
      {
          console.log("IsActionVisibleForInput true ");
          return true;
      }
  }
  console.log("IsActionVisibleForInput false ");
  return false;
}
