var MenuActions = {
    "Purchase" : {
      "GamepadOnly" : true,
      "Symbol" : {
        "Gamepad" : "&#x0037;",
      },
      "Label" : "Purchase",
      "Clickable" : false,
    },
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
    "ChangeProfile" : {
      "GamepadOnly" : true,
      "Symbol" : {
        "Gamepad" : "&#x003B;",
      },
      "Label" : "Change Profile",
      "Clickable" : false,
    },
    "Loadout" : {
      "GamepadOnly" : true,
      "Symbol" : {
        "Gamepad" : "&#x0035;",
      },
      "Label" : "Loadout",
      "Clickable" : false,
    },
    "Equip" : {
      "GamepadOnly" : true,
      "Symbol" : {
        "Gamepad" : "&#x0037;",
      },
      "Label" : "Equip",
      "Clickable" : false,
    },
    "Locked" : {
      "GamepadOnly" : true,
      "Symbol" : {
        "Gamepad" : "&#x0037;",
      },
      "Label" : "Locked",
      "Clickable" : false,
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
    "InvitePlayer" : {
      "GamepadOnly" : false,
      "Symbol" : {
        "Gamepad" : "&#x0036;",
        "Keyboard" : "I",
      },
      "Label" : "InvitePlayer",
      "Clickable" : true,
    },
    "Unequip" : {
      "GamepadOnly" : false,
      "Symbol" : {
        "Gamepad" : "&#x0035;",
        "Keyboard" : "U",
      },
      "Label" : "Unequip",
      "Clickable" : true,
    },
    "PageDown" : {
      "GamepadOnly" : true,
      "Symbol" : {
        "Gamepad" : "&#x003F;"
      },
      "Label" : "Next Page",
      "Clickable" : false,
    },
    "PageUp" : {
      "GamepadOnly" : true,
      "Symbol" : {
        "Gamepad" : "&#x003E;"
      },
      "Label" : "Prev Page",
      "Clickable" : false,
    },
    "AutoDetect" : {
      "GamepadOnly" : false,
      "Symbol" : {
        "Gamepad" : "&#x003E;",
        "Keyboard" : "A",
      },
      "Label" : "AutoDetect Settings",
      "Clickable" : true,
    },
    "RestoreDefaults" : {
      "GamepadOnly" : false,
      "Symbol" : {
        "Gamepad" : "&#x003E;",
        "Keyboard" : "D",
      },
      "Label" : "Restore Defaults",
      "Clickable" : true,
    },
    "OpenBox" : {
      "GamepadOnly" : true,
      "Symbol" : {
        "Gamepad" : "&#x0037;",
      },
      "Label" : "Open Box",
      "Clickable" : false,
    },
    "QuickPlayFilter" : {
      "GamepadOnly" : false,
      "Symbol" : {
        "Gamepad" : "&#x0035;",
        "Keyboard" : "F",
      },
      "Label" : "Quick Play Filter",
      "Clickable" : true,
    },
    "PlayerProfile" : {
      "GamepadOnly" : true,
      "Symbol" : {
        "Gamepad" : "&#x0037;",
      },
      "Label" : "View Player's Top Ten",
      "Clickable" : false,
    },
    "XBoxProfile" : {
      "GamepadOnly" : true,
      "Symbol" : {
        "Gamepad" : "&#x0035;",
      },
      "Label" : "View XBox Profile",
      "Clickable" : false,
      "ConsoleOnly" : true,
    },
    "PurchaseCurrency" : {
      "GamepadOnly" : false,
      "Symbol" : {
        "Gamepad" : "&#x0035;",
      },
      "Label" : "Purchase Tokens",
      "Clickable" : true,
      "ConsoleOnly" : false,
    },
    "Store" : {
      "GamepadOnly" : false,
      "Symbol" : {
        "Gamepad" : "&#x0035;",
      },
      "Label" : "Store",
      "Clickable" : true,
      "ConsoleOnly" : false,
    }
};

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
  //console.log(MenuActions[action]["ConsoleOnly"]);
  //console.log(ClientwebData.bIsConsole);
  if(action != undefined && MenuActions[action] != undefined)
  {
    if(MenuActions[action]["ConsoleOnly"]){
      if(ClientwebData.bIsConsole){
        return true;
      }else{
        return false;
      }

    }else{
      return !MenuActions[action]["GamepadOnly"] || (FooterData.bHasGamepad && MenuActions[action]["GamepadOnly"]);
    }
  }

  return false;
}
