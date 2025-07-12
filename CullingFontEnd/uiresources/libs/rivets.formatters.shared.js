rivets.formatters.time = function(value){
	var minutes = Math.floor(value / 60);
	var seconds = value % 60;
	var timeString = "";

	if(minutes >= 0 && seconds >= 0)
	{
		if(minutes == 0){
			timeString = "00:";
		} else if (minutes < 10) {
			timeString = "0" + minutes + ":";
		} else {
			timeString = minutes + ":";
		}

		if(seconds == 0){
			timeString = timeString + "00";
		} else if(seconds < 10) {
			timeString = timeString + "0" + seconds;
		} else {
			timeString = timeString + seconds;
		}
	} else {
		timeString = "--:--";
	}

	return timeString;
};

rivets.formatters.not = function(value){
  return !value;
}

rivets.formatters.equals = function(value, otherValue)
{
  return value == otherValue;
}

rivets.formatters.empty = function(value){
  return (value == undefined || (value.length != undefined && value.length == 0));
}

rivets.formatters.increment = function(value)
{
  return Number(value) + 1;
}

rivets.formatters.formatDataCenter = function(value){
  if(value == "us-east"){
    return "North America East";
  } else if(value == "us-west"){
    return "North America West";
  } else if(value == "eu"){
    return "Europe";
  } else if(value =="ocn"){
    return "Oceania";
  }else {
    return value;
  }
}

rivets.formatters.screenMode = function(value){
  var optionString = "";
	switch(value){
		case 0:
			optionString = "FullScreen";
			break;
		case 1:
			optionString = "Borderless Windowed";
			break;
		case 2:
			optionString = "Windowed";
			break;
    }

    return optionString;
}

rivets.formatters.trueFalseSetting = function(value)
{
  if(value == 0){
    return "False";
  } else {
    return "True";
  }
};

rivets.formatters.basicSetting = function(value){
  var optionString = "";
  if(value == 1){
    optionString = "Low";
  } else if (value == 2){
    optionString = "Medium";
  } else if (value == 3){
    optionString = "High";
  } else if (value == 0){
    optionString = "Off";
  }

  return optionString;
};

rivets.formatters.getIconForAssetName = function(value){
  var Icon = "../images/weapons/";
  Icon += value + ".png";

  return Icon;
}

rivets.formatters.getIconForWeaponBPName = function(value){
	if(value){
		var Icon = "images/InventoryIcons/";
		Icon += value + ".png";

		return Icon;
	}
}

rivets.formatters.checkIconForWeaponBP = function(value){
	if(value){
		return true;
	}
		return false;
}
