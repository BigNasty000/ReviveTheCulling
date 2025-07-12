/*FORMATTERS*/
rivets.formatters.formatGamesPlayed = function(games, wins){
	return games - wins;
};

rivets.formatters.formatTimeAlive = function(sec){
   var hours   = Math.floor(sec / 3600);
   var minutes = Math.floor((sec - (hours * 3600)) / 60);
   var seconds = Math.floor((sec- (hours * 3600)) - (minutes * 60));
   var time = "";

   if (hours != 0) {
     time = hours+":";
   }
   if (minutes != 0 || time !== "") {
     minutes = (minutes < 10 && time !== "") ? "0"+minutes : String(minutes);
     time += minutes+":";
   }
   if (time === "") {
     time = seconds+"s";
   }
   else {
     time += (seconds < 10) ? "0"+seconds : String(seconds);
   }
   return time;
};

rivets.formatters.formatAverage = function(value, against){
	var average = value / against;
	console.log(average);
	if(isNaN(average)){
		average = 0;
	}
	return Math.floor(average);
};

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

rivets.formatters.challengeImage = function(value){
	return "/images/Challenges/Challenge_" + value + ".svg";
};

rivets.formatters.challengeCheck = function(value){
	if(value.length > 0)
	{
		return true;
	}
	return false;
};

rivets.formatters.lootDisplayName = function(value){
	if(value == undefined || value == ""){
		return;
	}
	return loc("customizations." + value);
};

rivets.formatters.checkAvailableCrates = function(crates){
	if(crates > 0){
		return true;
	}
	return false;
};

rivets.formatters.formatMinutesAlive = function(min){
	var hours = Math.floor(min / 60);
	//var days = Math.floor(min / (60 * 24));
	//var hours = Math.floor((min % (60 * 24)) / 60);
	//var minutes = Math.floor((min % (60 * 24)) % 60);
	return hours;
};

rivets.formatters.formatLargeNumbers = function(num){
	if (num >= 1000000000) {
		 return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
	}
	if (num >= 1000000) {
		 return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
	}
	if (num >= 1000) {
		 return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
	}
	return num;
};

rivets.formatters.formatDistance = function(dist){
	var km = ((dist / 100) / 10).toFixed(2);
	if(isNaN(km)){
		return 0;
	}
	else{
		return km;
	}
};

rivets.formatters.checkForNull = function(value){
	if(!value){
		return 0;
	}
	else{
		return value;
	}
};

rivets.formatters.formatNextLevel = function(level){
	return level + 1;
};

rivets.formatters.UpdateHightXP = function(xp){
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

rivets.formatters.or = function(valueA, valueB) {
  console.log("rivets.formatters.or: " + valueA + " " + valueB);
	return valueA || valueB;
};

rivets.formatters.nor = function(valueA, valueB) {
  console.log("rivets.formatters.nor: " + valueA + " " + valueB);
	return !(valueA || valueB);
};
/*
rivets.formatters.leaderboardTierIcon = function(tier){
	if(tier == 0)
  {
    return "diamond-bg";
  }
  else if(tier == 1)
  {
    return "platinum-bg";
  }
	else if(tier == 2)
  {
    return "gold-bg";
  }
	else if(tier == 3)
  {
    return "silver-bg";
  }
	else
  {
    return "bronze-bg";
  }
};*/

rivets.formatters.leaderboardTierText = function(tier){
	if(tier == 0)
  {
    return "DIAMOND";
  }
  else if(tier == 1)
  {
    return "PLATINUM";
  }
	else if(tier == 2)
  {
    return "GOLD";
  }
	else if(tier == 3)
  {
    return "SILVER";
  }
	else
  {
    return "BRONZE";
  }
};

rivets.formatters.checkIfDiamond = function(tier){
	if(tier == 0)
  {
    return true;
  }
  else
  {
    return false;
  }
};

rivets.formatters.checkIfScoreIsZero = function(score){
	console.log(score);
	if(parseInt(score, 10) > 0)
  {
    return true;
  }
  else
  {
    return false;
  }
};

rivets.formatters.leaderboardSeasonScore = function(score){
	/*console.log(score);*/
	if(score){
		return score;
	}else{
		return "0";
	}
}

rivets.formatters.leaderboardRank = function(rank){
	return rank + 1;
};

rivets.formatters.checkPlace = function(place){
	/*console.log(place);*/
	if(place == 0)
  {
    return "/images/leaderboards/No_Rank.png";
  }
  return "/images/leaderboards/Rank_" + place + ".png";
};

rivets.formatters.checkKills = function(kills){
	if(kills){
		return "death-icon";
	}
};

rivets.formatters.profileTierIcon = function(tier){
	/*console.log(tier);*/
	if(tier >= 0){
		return "tier" + tier + "-bg";
	}else{
		return "tier4-bg";
	}
};

rivets.formatters.leaderboardTierIcon = function(tier){
	/*console.log(tier);*/
	if(tier >= 0){
		return "tier" + tier + "-alt-bg";
	}else{
		return "tier4-alt-bg";
	}
};

rivets.formatters.checkIDMatch = function(playerID){
	/*console.log(playerID);*/
	if(playerID){
		if(playerID == ClientwebRootData.stats.userID){
			return "userIDmatch";
		}
	}
	return "leaderboard-content";
};

rivets.formatters.customMapImage = function(map)
{
	console.log(map);
  if(map == "Island")
  {
    return "jungle-map-bg";
  }
  else if(map == "Prison")
  {
    return "prison-map-bg";
  }
}

rivets.formatters.hasEnoughCurrency = function(premiumPurchasable, purchasable, premium, cost){
	console.log(purchasable);
	console.log(premium);
	console.log(cost);
	if(premiumPurchasable)
	{
		if(Number(premium) <= Number(ClientwebData.PremiumCurrency))
		{
			return true;
		}
		else
		{
			return false;
		}
	}


	if(purchasable)
	{
		if(Number(cost) <= Number(ClientwebData.CullCredits))
		{
			return true;
		}
		else
		{
			return false;
		}
	}

	return false;
};

rivets.formatters.notEnoughCurrencyAndPurchasable = function(premiumPurchasable, purchasable, premium, cost){
	console.log(purchasable);
	console.log(premium);
	console.log(cost);
	if(premiumPurchasable || purchasable)
	{
		if(premiumPurchasable)
		{
			if(Number(premium) > Number(ClientwebData.PremiumCurrency))
			{
				return true;
			}
			else
			{
				return false;
			}
		}


		if(purchasable)
		{
			if(Number(cost) > Number(ClientwebData.CullCredits))
			{
				return true;
			}
			else
			{
				return false;
			}
		}
	}

	return false;
};


rivets.formatters.isInParentBundle = function(id){
	if(id == 0)
  {
		return false;
	}
	else
	{
		return true;
	}
};

rivets.formatters.bIsUnlockedAndPurchasable = function(unlocked, premium, cost, bundle){
	console.log("Unlocked " + unlocked);
	console.log("Premium " + premium);
	console.log("Cost " + cost);
	console.log("Bundle " + bundle);
	if(unlocked)
	{
		return true;
	}
	else {
		if(!unlocked && (premium || cost || bundle))
		{
			return true;
		}
		else
		{
			return false;
		}
	}
}

rivets.formatters.currencyIconShow = function(unlocked, premium, cost){
	console.log(unlocked);
	console.log(premium);
	console.log(cost);
	if(unlocked)
	{
		return true;
	}
	else {
		if(premium && cost)
		{
			return true;
		}
		else
		{
			return false;
		}
	}
}


/*BINDERS*/
rivets.binders.color = function(el, value){
	var textColor;
	switch(value){
		case 1:
			textColor = "#ffffff"; /*white*/
			break;
		case 2:
			textColor = "#54c63c"; /*green*/
			break;
		case 3:
			textColor = "#2680ed"; /*blue*/
			break;
		case 4:
			textColor = "#8d4be2"; /*purple*/
			break;
		case 5:
			textColor = "#d82e2e"; /*red*/
			break;
		case 103:
			textColor = "#2680ed"; /*blue*/
			break;
		case 104:
			textColor = "#8d4be2"; /*purple*/
			break;
		case 105:
			textColor = "#d82e2e"; /*red*/
			break;
		case 99:
			textColor = "#ffffff"; /*white*/
			break;
		case 23:
			textColor = "#2680ed"; /*blue - Premium Item*/
			break;
		case 24:
			textColor = "#8d4be2"; /*purple - Premium Item*/
			break;
		case 25:
			textColor = "#d82e2e"; /*red - Premium Item*/
			break;
		case 33:
			textColor = "#2680ed"; /*blue - Premium Bundle*/
			break;
		case 34:
			textColor = "#8d4be2"; /*purple - Premium Bundle*/
			break;
		case 35:
			textColor = "#d82e2e"; /*red - Premium Bundle*/
			break;
	}
	el.style.color = textColor;
};

rivets.binders.bgcolor = function(el, value){
	var bgColor;
	switch(value){
		case 1:
			bgColor = "#ffffff"; /*white*/
			break;
		case 2:
			bgColor = "#54c63c"; /*green*/
			break;
		case 3:
			bgColor = "#2680ed"; /*blue*/
			break;
		case 4:
			bgColor = "#8d4be2"; /*purple*/
			break;
		case 5:
			bgColor = "#d82e2e"; /*red*/
			break;
		case 103:
			bgColor = "#2680ed"; /*blue*/
			break;
		case 104:
			bgColor = "#8d4be2"; /*purple*/
			break;
		case 105:
			bgColor = "#d82e2e"; /*red*/
			break;
		case 99:
			bgColor = "#ffffff"; /*white*/
			break;
		case 23:
			bgColor = "#2680ed"; /*blue - Premium Item*/
			break;
		case 24:
			bgColor = "#8d4be2"; /*purple - Premium Item*/
			break;
		case 25:
			bgColor = "#d82e2e"; /*red - Premium Item*/
			break;
		case 33:
			bgColor = "#2680ed"; /*blue - Premium Bundle*/
			break;
		case 34:
			bgColor = "#8d4be2"; /*purple - Premium Bundle*/
			break;
		case 35:
			bgColor = "#d82e2e"; /*red - Premium Bundle*/
			break;
		default:
			bgColor = "#ffffff";
	}
	
	el.style.backgroundColor = hexToRgb(bgColor, .5);
};

function hexToRgb(hex, alpha) {
	if(hex != undefined)
	{
		hex   = hex.replace('#', '');
		var r = parseInt(hex.length == 3 ? hex.slice(0, 1).repeat(2) : hex.slice(0, 2), 16);
		var g = parseInt(hex.length == 3 ? hex.slice(1, 2).repeat(2) : hex.slice(2, 4), 16);
		var b = parseInt(hex.length == 3 ? hex.slice(2, 3).repeat(2) : hex.slice(4, 6), 16);
		if ( alpha ) {
			 return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
		}
		else {
			 return 'rgb(' + r + ', ' + g + ', ' + b + ')';
		}
	}
	return 'rgba(255, 255, 255, .5)';
}

rivets.binders.weaponsrc = function(el, value){
	el.src = "/images/weapons/" + value + ".png";
};

function GetCardBackgroundImageStyle(cardImagePath)
{
  /*if (cardImagePath == undefined || cardImagePath == null || cardImagePath == "") {
    return "url('/images/culling-cards/CC_Artboard-59.png')";
  }*/
	if (cardImagePath != undefined || cardImagePath != null || cardImagePath != "") {
  	return "url('/images/culling-cards/" + cardImagePath + ".png')";
	}
}

rivets.binders.cullingCardBGImage = function(el, value){
	console.log(value);
	el.style.backgroundImage = "url('/images/culling-cards/" + value + ".png')"
};

rivets.binders.cardbackgroundimage = function (el, value) {
    el.style.backgroundImage = GetCardBackgroundImageStyle(value);
};

rivets.binders.id = function(el, value){
	el.id = value;
};

rivets.binders['style-*'] = function(el, value){
	var bgColor;
	console.log(value);
	switch(value){
		case "Utility":
			bgColor = "#39b54a"; /*orange*/
			break;
		case "Melee Weapons":
			bgColor = "#999999"; /*yellow*/
			break;
		case "Health / Stamina":
			bgColor = "#fbb03b"; /*blue*/
			break;
		case "Ranged Weapons":
			bgColor = "#93278f"; /*green*/
			break;
		case "General Defense":
			bgColor = "#29abe2"; /*green*/
			break;
		case "Survival":
			bgColor = "#cc0000"; /*green*/
			break;
		case "General Offense":
			bgColor = "#f15a24"; /*green*/
			break;
	}
	el.style.setProperty(this.args[0], bgColor);
};

rivets.binders.toptensrc = function(el, place){
	if(place == 0){
    el.src = "/images/leaderboards/No_Rank.png";
  }else{
		el.src = "/images/leaderboards/Rank_" + place + ".png";
	}
};

rivets.binders.isInBundle = function(value){
	if(value == 0)
  {
    return false;
  }
  else {
    return true;
  }
};
