rivets.formatters.hasChallengeProgressed = function(value){
	return value.Progress > 0;
}

rivets.formatters.formatChallengeProgress = function(value){
	if(value.Progress == undefined)
	{
		return "";
	}
	switch(value.ChallengeType)
	{
		case "Survive":
			return rivets.formatters.time(Number(value.Progress));
			break;
		default:
			return value.Progress + "/" + value.NumberRequired;
			break;
	}
};

rivets.formatters.formatChallengeEntry = function(value){
	console.log("Eval" + JSON.stringify(value));
	if(value.bIsComplete != undefined && value.bIsComplete == true){
		return "challenge-complete";
	}

	if(value.Progress > 0){
		return "challege-pending challenge-progress";
	}
	return "challenge-pending";
}

rivets.formatters.formatChallengeIcon = function(value){
	return GetIconForChallengeType(value);
}

rivets.formatters.getBuffBackgroundStyle = function(value){
	var bgColor = "";
	switch(value.WoundType){
		case 4: //Stamina Shot
			bgColor= "rgba(255,250,14,1)";
			break;
		case 10: //RunBoost
			bgColor = "rgba(230,16,255,1)";
			break;
		case 11: //MuscleManMilk
			bgColor = "rgba(5,196,255,1)";
			break;
		case 12: //Iron4Skin
			bgColor = "rgba(39,255,24,1)";
			break;
		case 17: //Damage Increase from OJ
			bgColor = "rgba(255,125,13,1)";
			break;
		case 30: //STEALTHY
			bgColor = "rgba(150,150,150,1)";
			break;
		case 30: //HEMO DRIP
			bgColor = "rgba(240,167,251,1)";
			break;
		default:
			bgColor = "rgba(255,255,255,1)";
			break;
	}

	var vwHeight = 2.25 * (value.DurationPerc * 0.01);
	return "height: " + vwHeight + "vw;" + "background-color: " + bgColor + ";";
}

rivets.formatters.getWoundBackgroundStyle = function(value){
	return "height: " + value.DurationPerc + "%;";
}

rivets.formatters.getWoundForegroundStyle = function(value){
		var icon = "background-image: url('images/Wounds/" + WoundEnumToIcon(value.WoundType) + ".png');";
		return icon;
}

rivets.formatters.getArmorBackgroundStyle = function(value, constBackgroundWidth){
	var newWidth = Math.min(value / 100.0, 1.0) * constBackgroundWidth;
	if(newWidth > constBackgroundWidth){
		newWidth = constBackgroundWidth;
	}
	return "width: " + newWidth + "vw;";
}

rivets.formatters.getArmorForegroundStyle = function(value){
	var bg = "background-image: url('images/Armor_Icon.png')";
	if(value > 0){
		bg = "background-image: url('images/Armor_Icon.png')";
	}
	return bg;
}

rivets.formatters.getMatchOutcomeBgClass = function(value){
	var classList = "endofmatch-outcome-background";
	if(value == true){
		classList += " winner";
	} else {
		classList += " loser";
	}

	return classList;
}

rivets.formatters.getAvatarURLStyle = function(value){
	var style = "background-image: url('" + value + "')";
	return style;
}

rivets.formatters.getWeaponLocalized = function(value){
		var weaponName = loc("items." + value + ".tooltip_title");
		if(weaponName.indexOf("!items.") > 0){
			weaponName = "UNKNOWN";
		}
		return weaponName;
}

rivets.formatters.shouldShowKillerInfo = function(value){
	if(deathData.bIsVictory || deathData.bWasSuicide){
		return false;
	}

	return true;
}

rivets.formatters.getStyleForPerk = function(value){
	return "background-image: url('../images/perks/" + value + ".png');";
}

rivets.formatters.getMouseOverForPerk = function(value){
	if(value == "" || value == undefined){
		return;
	}

	var perkName = loc("frontend.perks." + value + ".name");
	perkName = perkName.replace("'", "\'");
	perkName = perkName.replace('"', '\"');
	return 'OnEOMItemMouseOver("' + perkName + '")';
}



rivets.formatters.getStyleForAirdrop = function(value){

}

rivets.formatters.getMouseOverForAirdrop = function(value){
	if(value == "" || value == undefined){
		return;
	}
	var airDrop = value.toLowerCase().replace("airdrop_","");
	console.log("Airdrop: " + airDrop);
	var airDropString = loc("frontend.airdrops." + airDrop);
	airDropString = airDropString.replace("'", "\'");
	airDropString = airDropString.replace('"', '\"');
	return 'OnEOMItemMouseOver("' + airDropString + '")';
}

rivets.formatters.getSpectatorStaminaStyle = function(stamina){
	console.log("Stamina: " + stamina);
	return "width:" + stamina + "%;";
}

rivets.formatters.getPerkName = function(value){
	if(value == "" || value == undefined){
		return;
	}

	return loc("frontend.perks." + value + ".name");
}

rivets.formatters.getAirdropName = function(value){
	if(value == undefined || value == ""){
		return;
	}
	var airDrop = value.toLowerCase().replace("airdrop_","");
	airDrop = airDrop.replace("'", "\'");
	airDrop = airDrop.replace('"', '\"');

	return loc("frontend.airdrops." + airDrop);
}

rivets.formatters.getAirdropItemName = function(value){
	if(value == undefined || value == ""){
		return;
	}
	value = value.toLowerCase().replace("_c", "");
	return loc("frontend.items." + value);
}

rivets.formatters.getAirdropItemIcon = function(value){
	if(value == undefined || value == ""){
		return;
	}
	value = value.toLowerCase().replace("_c", "");
	return "../images/weapons/" + value + ".png";
}

rivets.formatters.getIconForPerk = function(value){
	return "../images/Perks/" + value + ".png";
}

rivets.formatters.getBorderStyleForRewardRarity = function(value){
	var style = "border: 2px solid ";
	var color = GetColorForRarity(value);


	return style + color + ";";
}

rivets.formatters.getTextStyleForRewardRarity = function(value){
	var style = "color: ";
	var color = GetColorForRarity(value);
	return style + color + ";";
}

rivets.formatters.getIconStyleForReward = function(value){
	var style = "background-image: url('" + value + "');";
	return style;
}

function GetColorForRarity(rarity){
	var color = "white";
	switch(rarity){
		case 0:
			color = "#ffffff";
			break;
		case 1:
			color = "#ffffff";
			break;
		case 2:
			color = "#24ff00";
			break;
		case 3:
			color = "#0066ff";
			break;
		case 4:
			color = "#fdff00";
			break;
		case 5:
		case 105:
			color = "#8900ff";
			break;
		case 6:
		case 106:
			color = "#ff8400";
			break;
		case 7:
		case 107:
			color = "#ff0000";
			break;
	}

	return color;
}

rivets.formatters.getReportPlayerName = function(value){
	if(value != undefined && value['name'] != undefined){
		return value['name'];
	}

	return "Unknown";
};

rivets.formatters.and = function(comparator, comparatee){
	return comparator && comparatee;
};

rivets.formatters.or = function(comparator, comparatee){
	return comparator || comparatee;
};

rivets.formatters.iconConversion = function(value){
	if(value == undefined || value == ""){
		return;
	}
	return icon("items." + value + ".tooltip_icon");
};

rivets.formatters.perkTitle = function(value){
	if(value == undefined || value == ""){
		return;
	}
	return loc("perks." + value + ".tooltip_title");
};

rivets.formatters.perkText = function(value){
	if(value == undefined || value == ""){
		return;
	}
	return loc("perks." + value + ".tooltip_text");
};

rivets.formatters.perkImage = function(value){
	return "/images/perks/" + value + ".png";
};


rivets.formatters.teamBg = function(value){
	if(value % 2 > 0){
		return "cell-dark team-body";
	} else {
		return "cell-light team-body";
	}
}

rivets.formatters.airdropTitle = function(value){
	if(value == undefined || value == ""){
		return;
	}
	return loc("airdrops." + value + ".tooltip_title");
};

rivets.formatters.airdropText = function(value){
	if(value == undefined || value == ""){
		return;
	}
	return loc("airdrops." + value + ".tooltip_text");
};

rivets.formatters.airdropImage = function(value){
	return "/images/customizations." + value + ".png";
};

rivets.formatters.orderRanking = function(playerIndex, teamNum, teamIndex){
	console.log("INDEX " + playerIndex);
	console.log("TEAM NUMBER " + teamNum);
	console.log("TEAM INDEX " + teamIndex);
	if(teamNum == 0){
		return playerIndex + 1;
	}else{
		return teamIndex + 1;
	}

};

rivets.formatters.challengeImage = function(value){
	return "/images/Challenges/Challenge_" + value + ".svg";
};

function GetCardBackgroundImageStyle(cardImagePath)
{
  if (cardImagePath == undefined || cardImagePath == null || cardImagePath == "") {
    return "url('/images/culling-cards/CC_Artboard-59.png')";
  }
  return "url('/images/culling-cards/" + cardImagePath + ".png')";
}

rivets.binders.cardbackgroundimage = function (el, value) {
    el.style.backgroundImage = GetCardBackgroundImageStyle(value);
}

rivets.formatters.formatAverageKills = function(kills, games){
	var average = kills / games;
	if(isNaN(average)){
		average = 0;
	}
	return average.toFixed(2);
};

rivets.formatters.formatAverageDamage = function(damage, games){
	var average = damage / games;
	if(isNaN(average)){
		average = 0;
	}
	return average.toFixed(2);
};

rivets.formatters.formatAverageFUNC = function(func, games){
	var average = func / games;
	if(isNaN(average)){
		average = 0;
	}
	return average.toFixed(2);
};

rivets.formatters.formatExperienceEarned = function(endXP, startXP){
	return endXP - startXP;
};

rivets.formatters.formatNextLevel = function(level){
	return level + 1;
};

rivets.formatters.formatNextLevelXP = function(xp){
	var nextLvlXP;
	engine.call("GetLevelFromXP", xp).then(function(level){
		engine.call("GetLevelXPHigh", level).then(function(exp){
			nextLvlXP = exp;
		});
	});
	console.log("nextLvlXP" + nextLvlXP);
	return nextLvlXP;
};

rivets.formatters.formatTimeAlive = function(time){
    var matchInSec = matchData.matchlength;
    console.log("matchInSec:" + matchInSec);
	var timeLeft = matchInSec - time;
	var min = Math.floor(timeLeft / 60);
	var sec = (timeLeft - min * 60);
	return min + ":" + sec;
};

rivets.formatters.MatchState = function(state){
	console.log(state);
	if(state == "over"){
		return true;
	}
	else{
		return false;
	}
};

rivets.formatters.UpdateHightXP = function(xp){
	return xp + 1;
};

rivets.formatters.controllerImage = function(layout){
	return xp + 1;
};

rivets.formatters.controllerImage = function(layout){
	if(layout == 0){
		layout = 1;
	}
	var path = "/images/ControllerLayout/Layout";
	path += layout + ".png";

	return path;
}

rivets.formatters.controllerBtnConversion = function(button){
	/*console.log(button);
	console.log(JSON.stringify(ActionMapDB.ActionMappings));*/
	var controllerBtn;
	if(button){
		if(button.indexOf('Gamepad') == 0)
		{
			switch(button){
				case "Gamepad_DPad_Up": //DPad Up
					controllerBtn = "\0031";
					break;
				case "Gamepad_DPad_Down": //DPad Down
					controllerBtn = "\0032";
					break;
				case "Gamepad_DPad_Left": //DPad Left
					controllerBtn = "\0033";
					break;
				case "Gamepad_DPad_Right": //DPad Right
					controllerBtn = "\0034";
					break;
				case "Gamepad_FaceButton_Top": //Y
					controllerBtn = "\0035";
					break;
				case "Gamepad_FaceButton_Bottom": //A
					controllerBtn = "\0037";
					break;
				case "Gamepad_FaceButton_Left": //X
					controllerBtn = "\0036";
					break;
				case "Gamepad_FaceButton_Right": //B
					controllerBtn = "\0038";
					break;
				case "Gamepad_Special_Right": //Start
					controllerBtn = "\0037";
					break;
				case "Gamepad_Special_Left": //Back
					controllerBtn = "\0037";
					break;
				case "Gamepad_LeftTrigger": //Left Trigger
					controllerBtn = "\003E";
					break;
				case "Gamepad_LeftShoulder": //Left Bumper
					controllerBtn = "\003D";
					break;
				case "Gamepad_RightTriggerAxis": //Right Trigger
					controllerBtn = "\003F";
					break;
				case "Gamepad_RightShoulder": //Right Bumper
					controllerBtn = "\0040";
					break;
				case "Gamepad_RightThumbstick": //Right Thumb Stick
					controllerBtn = "\003A";
					break;
				case "Gamepad_LeftThumbstick": //Left Thumb Stick
					controllerBtn = "\0039";
					break;
				default:
					controllerBtn = "\0037";
					break;
			}
		}
		else{
			return "[" + button + "]";
		}
		return controllerBtn;
	}
	return "";
}

rivets.formatters.setCullDings = function(button)
{
	if(button){
		if(button.indexOf('Gamepad') == 0)
		{
	    return "cullDings";
	  }
	}
	return "";

};

rivets.formatters.checkPlace = function(place){
	console.log(place);
	if(place == undefined)
  {
    return "/images/leaderboards/Rank_16.png";
  }
  return "/images/leaderboards/Rank_" + place + ".png";
};

rivets.formatters.textFormatPlace = function(place){
	if(place == 1){
		return place + "st";
	}else if(place == 2){
		return place + "nd";
	}else if(place == 3){
		return place + "rd";
	}else{
		return place + "th";
	}
	if(!place){
		return "16th";
	}

};

rivets.formatters.checkValue = function(value)
{
	if(value){
		return value;
	}else{
		return "0";
	}
};

rivets.formatters.checkGameModeType = function(mode, offline){
	var val = false;
	console.log(mode);
	console.log(offline);
	if(offline){
		val = false;
	}else{
		if(mode)
		{
			switch(mode){
				case "Classic":
					val = true;
					break;
				case "ClassicTeams":
					val = true;
					break;
				case "Lightning":
					val = false;
					break;
				case "LightningTeams":
					val = false;
					break;
				case "Survival":
					val = false;
					break;
				case "Custom":
					val = false;
					break;
				default:
					val = false;
					break;
				}
		}
	}

	return val;
}
