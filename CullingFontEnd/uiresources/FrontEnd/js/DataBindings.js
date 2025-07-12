var FooterData = {
  Actions : {},
  bHasGamepad : true,
  shouldShowAction : function(action){
    var result = IsActionVisibleForInput(action);
    return result;
  },
  shouldHideAction : function(action){
    return !this.shouldShowAction(action);
  },
  getActionClasses : function(){
    if(this.bHasGamepad)
    {
      return "control-icon controller";
    }
    else
    {
      return "control-icon kbm";
    }
  },
  getActionSymbol : function(action){
    var symbol = GetSymbolForAction(action);
    //console.log("getActionSymbol: " + symbol + " for action: " + action);
    return symbol;
  },
  getActionLabel : function(action){
    //TODO: localization hook
    return GetLabelForAction(action);
  },
  isActionClickable : function(action){
    //console.log("IsActionClickable: " + action);
    return IsActionClickable(action) && !this.bHasGamepad;
  },
  getInviteLabel : function(){
    return GetLabelForAction("InvitePlayer");
  },
  getInviteSymbol : function(){
    return GetSymbolForAction("InvitePlayer");
  }
}


function BindRivetsGlobals()
{
  rivets.bind($('#controls-footer'), {
    FooterData: FooterData,
    Friends : Friends,
    ClientwebData : ClientwebData
  });

  rivets.bind($('#debug-info'), {
    Matchmaking: Matchmaking,
    ClientwebData: ClientwebData
  });

  console.log("Rivets Globals bound.");
}

rivets.formatters.debugBoolToOnlineState = function(value)
{
  if(value)
  {
    return "Online";
  }

  return "Offline";
};

rivets.formatters.debugConnectionStatusToOnlineState = function(value)
{
  // just ignore the state and use the direct reference
  if (!ClientwebData.bIsConnected)
  {
    return "Offline";
  }

  switch (ClientwebData.connectionStatus)
  {
    // case CW_STATUS_RETRYING: return "Retrying";
    // case CW_STATUS_CONNECTED: return "Logging In";
    case CW_STATUS_AUTHENTICATED: return "Online";
  }

  return "Offline";
};

rivets.formatters.checkOfflineConnectionStatus = function(status){
	if(/*status != CW_STATUS_CONNECTED && */status != CW_STATUS_AUTHENTICATED){
		return true;
	}
	return false;
};

rivets.formatters.checkAuthingConnectionStatus = function(status){
  /*
	if(status == CW_STATUS_CONNECTED){
		return true;
	}
  */
	return false;
};

rivets.formatters.checkOnlineConnectionStatus = function(status){
	if(status == CW_STATUS_AUTHENTICATED){
		return true;
	}
	return false;
};


rivets.formatters.getNameOfAppID = function(value)
{
    var name = "Unknown " + value;
    switch (value)
    {
        case "399690":
            name = "Friends and Family";
            break;
        case "327590":
            name = "Development";
            break;
        case "437220":
            name = "";
            return name;
            break;
        default:
            name = "";
            return name;
            break;
    }
    return name + " ("+value+")";
}

rivets.formatters.debugChallengesFormatter = function(value)
{
  var output = "";
  for(var key in value) {
    output += key + ": " + Math.floor(value[key].progress * 100) + "%\n";
  }
  return output;
}

rivets.formatters.debugStatsFormatter = function(value)
{
    var output = "";
    if (value != undefined)
    {
        if (value.UserID != undefined) {
            delete value.UserID;
        }

        for (var key in value) {
            output += "<li>" + key + ": " + Math.floor(value[key]) + "</li>";
        }
    }
  return output;
}

rivets.formatters.debugStatsBreakDownFormatter = function (value) {
    var output = "";
    if (value != undefined) {
        if (value.UserID != undefined) {
            delete value.UserID;
        }

        var highestDamage = 0;
        var highestDamageType = "";
        var totalDamageDone = 0;
        var totalDamageDone_Melee = 0;
        var totalDamageDone_Ranged = 0;
        var totalDamageDone_Traps = 0;
        var totalDamageDone_Explosives = 0;

        for (var key in value) {
            var damageValue = Math.floor(value[key]);
            if (key.indexOf("damage_") !== -1) {
                totalDamageDone += value[key];


                switch (key)
                {
                    case "damage_Blade":
                    case "damage_Bludgeon":
                    case "damage_Fists":
                    case "damage_Spear":
                        totalDamageDone_Melee += value[key];
                        break;
                    case "damage_Bow":
                    case "damage_Gun":
                    case "damage_Throw":
                        totalDamageDone_Ranged += value[key];
                        break;
                    case "damage_Trap":
                        totalDamageDone_Traps += value[key];
                        break;
                    case "damage_Explosion":
                        totalDamageDone_Explosives += value[key];
                        break;
                }


                if (highestDamage < damageValue) {
                    highestDamage = damageValue;
                    highestDamageType = key;
                }
            }

        }

        if (highestDamage != "")
        {
            output += "<li> Highest Damage " + highestDamageType + ": " + highestDamage + "</li>";
        }

        var DamagePct_Melee = 0.0;
        var DamagePct_Ranged = 0.0;
        var DamagePct_Traps = 0.0;
        var DamagePct_Explosives = 0.0;
        if (totalDamageDone > 0)
        {
            DamagePct_Melee = (totalDamageDone_Melee / totalDamageDone * 100).toFixed(1);
            DamagePct_Ranged = (totalDamageDone_Ranged / totalDamageDone * 100).toFixed(1);
            DamagePct_Traps = (totalDamageDone_Traps / totalDamageDone * 100).toFixed(1);
            DamagePct_Explosives = (totalDamageDone_Explosives / totalDamageDone * 100).toFixed(1);
        }


        output += "<li> Total Damage: " + Math.floor(totalDamageDone) + "</li>";
        output += "<li> Damage Melee: " + DamagePct_Melee + "%</li>";
        output += "<li> Damage Ranged: " + DamagePct_Ranged + "%</li>";
        output += "<li> Damage Traps: " + DamagePct_Traps + "%</li>";
        output += "<li> Damage Explosives: " + DamagePct_Explosives + "%</li>";

    }
    return output;
}


rivets.formatters.formatMenuActionName = function(value){
  return ActionToDisplayText(value);
}

rivets.formatters.formatActionButton = function(value){
  if(FooterData.bHasGamepad)
  {
    return ActionToCullDing(value);
  }

  return ActionToKBM(value); //TODO: GET KEY
}

rivets.formatters.getLocalizedDescriptionForDetailItem = function(value){
  if(value != undefined && value.AssetName != undefined){
    var locDesc = value.AssetName;
    if(value.Type == "perk"){
      locDesc = value.Description;
    } else if(value.Type == "airdrop"){
      locDesc = value.DisplayName;
    } else if(value.Type == "customization"){
      locDesc = value.DisplayName;
    }
    return locDesc;
  } else {
    //console.log("Failed to localize for asset: " + JSON.stringify(value));
    return "";
  }
}

rivets.formatters.getLocalizedNameForCustomization = function(value){
  if(value == undefined){
    return "Empty";
  }
  // console.log("GetLocalizedNameForCustomization: " + value);
  return loc("customizations." + value);
}

rivets.formatters.getLocalizedNameForAirdrop = function(value){
  var airdrop = value;
  if(airdrop != undefined){
    airdrop = airdrop.toLowerCase().replace("airdrop_", "");
    return loc("airdrops." + airdrop);
  } else {
    return "Unknown";
  }
}

rivets.formatters.getPerkIconFromAssetName = function(value){
  if(value == undefined)
  {
    return "";
  }
  return "../images/perks/" + value + ".png";
}

rivets.formatters.isPerkSlotSelected = function(selectedSlot, currentSlot)
{
  console.log("IsSlotSelect: " + selectedSlot + " " + currentSlot);
  return Number(selectedSlot) == Number(currentSlot);
}

rivets.formatters.getBadgeClassesForItem = function(item)
{
  if(item == undefined){
    return "customization-badge new";
  }

  if(!item.bIsUnlocked)
  {
    return "customization-badge locked";
  }
  else if(item.bIsNew)
  {
    return "customization-badge new";
  }
}

rivets.formatters.getItemDescription = function(value){
  return loc("items." + value + ".description");
}

rivets.formatters.getLocalizedNameForItem = function(value){
  return loc("items." + value);
}

rivets.formatters.numToGender = function(value)
{
  var retInt = value;

  switch(value)
  {
    case Gender_Male:
      retString = "Male";
      break;
    case Gender_Female:
      retString = "Female";
      break;
    case Gender_MaleBot:
      retString = "ManDroid";
      break;
    case Gender_FemaleBot:
      retString = "FemDroid";
      break;
  }

  return retString;
}

rivets.formatters.playConnStatus = function(value){
  if(value == CW_STATUS_UNKNOWN || value == CW_STATUS_RETRYING || value == CW_STATUS_CONNECTING){
    return true;
  }
  return false;
}

rivets.formatters.playConnStatusText = function(value){
  if(value == CW_STATUS_UNKNOWN || value == CW_STATUS_RETRYING || value == CW_STATUS_CONNECTING){
    return "CONNECTING";
  } else if(value == CW_STATUS_FAILED || value == CS_STATUS_FAILEDW_RETRY){
    return "OFFLINE";
  }
  return "PLAY";
}

rivets.formatters.queuetime = function(value){
  return rivets.formatters.time(Math.floor(value/1000));
};

rivets.formatters.noFriendsOnline = function(value){
  if(value != undefined && value.length != undefined){
    for (var i = 0; i < value.length; i++) {
      if (value[i].ResolvedCard) {
        return false;
      }
    }
  }

  return true;
}
