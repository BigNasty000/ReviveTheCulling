
var locDB = {};
var steamItems = [];
var currLanguage = "en";
var ShowDebugMessages = true;
var healthPulseColors = {
	'positive': "rgba(36, 189, 11, 0.5)",
	'negative': "rgba(189, 11, 11, 0.5)",
	'neutral': "rgba(255, 255, 220, 0.5)"
};

var overDrive = false;

var lootCrateID = 150201;

//var bIsLocalGame = true;


var bHasPartyMember = false;

var boundOptions = undefined;

//////////////////////////////
// Scoreboard Data (This is separate from scoreboard.js which has similar logic)
//////////////////////////////
var scoreData = {
  teams: [],
  bShowScoreboard : false
}


function ConvertScoreboardDataForBinding(players)
{
    var data = [];
    for(var i = 0; i < players.length; ++i){
      var player = players[i];
      if(data[player.team] == undefined){
        data[player.team] = [];
      }
      if(player.bIsAlive == 0){
        player.bIsAlive = false;
      } else {
        player.bIsAlive = true;
      }
      data[player.team].push(player);
    }
    return data;
}

engine.on("UpdateScoreboardList", function(players)
{
  var ConvertedData = ConvertScoreboardDataForBinding(players);
  ConvertedData = SortTeams(ConvertedData);
  RefreshScoreboardWithData(ConvertedData);
});

function RefreshScoreboardWithData(Data)
{
	scoreData.teams = Data;
	scoreData.bShowScoreboard = true;
	EndOfMatchScreen.RebindEOMScoreboard();
}

//////////////////////////////
//				Misc init					//
//////////////////////////////
Array.prototype.move = function(from, to) {
    this.splice(to, 0, this.splice(from, 1)[0]);
};
//////////////////////////////
//		Coherent Bindings			//
//////////////////////////////

engine.on('InitActiveChallenges', function(challenges){
	console.log("Got " + challenges.length + " challenges: " + JSON.stringify(challenges));
	setTimeout(function(challenges){
		//ChallengeData.Challenges = challenges;
		PauseMainScreenData.Challenges = challenges;
		EOMChallengeData.Challenges = challenges;
		if(challenges != undefined && challenges.length > 0)
		{
			//document.getElementById('challenge-container').classList.remove("obj-hidden");
		}
		else
		{
			//document.getElementById('challenge-container').classList.add("obj-hidden");
		}
	}, 1000, challenges)
});

engine.on('UpdateChallengeData', function(updateData){
	for(var i = 0; i < PauseMainScreenData.Challenges.length; ++i){
		var challenge = PauseMainScreenData.Challenges[i];
		if(challenge != undefined && challenge.Name == updateData.Challenge)
		{
			console.log("Updating Entry: " + JSON.stringify(challenge) + " with: " + JSON.stringify(updateData));
			challenge.Progress = updateData.Progress;
			challenge.NumComplete = updateData.ObjectsCompleted;
			if(updateData.bIsComplete != challenge.bIsComplete)
			{
				challenge.bIsComplete = updateData.bIsComplete;
				PauseMainScreenData.Challenges.move(i, PauseMainScreenData.Challenges.length);
			}
			EOMChallengeData.Challenges[i] = challenge;
			if(EOMChallengeData.Progress > EOMChallengeData.NumberRequired){
				EOMChallengeData.Progress == EOMChallengeData.NumberRequired
			}
			console.log(JSON.stringify(EOMChallengeData));
			AddChallengeUpdate(challenge);
			console.log("Post Update: " + JSON.stringify(challenge));
			break;
		}
	}
});

engine.on('ShowHelpOverlay', function(){
    $('.help-screen').toggle();
});

engine.on('SetCrosshair', function(type){
	SetCrosshair(type);
});

engine.on('SetCrosshairAimModifier', function (fSpreadPercentage)
{
	//var newVal = 0;
	//if (modifier == 3)
	//{
	//	newVal = 1.35;
	//} else if(modifier == 2){
	//	newVal = 0.45;
	//} else if(modifier == 1){
	//	newVal = 0.25;
	//}
    //SetCrosshairAccuracy(newVal);

    //XAV_VB 7.4 is the full spread value in the UI Land. Please dont ask me why. This is how it was when I started messing with this code. Dont believe me? check the numbers in the commented out code.
    SetCrosshairAccuracy(7.4 * fSpreadPercentage);
});

engine.on('SetUsableVisible', function(isvis){
		SetUsableVisible(isvis);
});

engine.on('SetUsableData', function (name, type, time, recipe, cost, recycleData, remainingTime) {
    SetUsableData(name, type, time, recipe, cost, recycleData, remainingTime);
});

engine.on('SetUsableProgress', function(progress){
	SetUsableProgress(progress);
});

engine.on('SetUsingStarted', function(bForceFires){
	console.log(bForceFires);
	if(bForceFires){
		overDrive = bForceFires;
	}
	else{
		overDrive = false;
	}

	SetUsableProgressVisible(true, false, false);
});

engine.on('SetUsingStopped', function(didFinish, dontCancel){
	SetUsableProgressVisible(false, didFinish, dontCancel);
});

engine.on('SetAirdropRemainingTime', function (remainingTime) {
		//console.log("remainingTime " + remainingTime);
    // Update time here.

    if (remainingTime > 0) {
        var minutes = Math.floor(remainingTime / 60);
        var seconds = remainingTime % 60;
        var time = "" + minutes + ":" + (seconds < 10 ? "0" : "");
        time += seconds;
      //  airdroptime.innerHTML = time;
    }
    else {
        //airdroptime.innerHTML = "";
				matchData.airdropTimeRemaining = false;
    }
		CheckAirdropDisplay();
});


engine.on('SetAvgPing', function(ping){
	if(ping > 0){
		pingData.ping = Math.floor(ping/2 + 3); // Half the ping, plus server tick rate
	} else {
		pingData.ping = ping;
	}
	pingData.rtt = ping;
});

engine.on("NotifyEnemyHit", function (DamageTaken, Backstab, Headshot, Wounded, IsWeakened, IsFeeble, bShouldShowDamageNumbers) {
	/*console.log("damageTaken " + DamageTaken);
	console.log("Backstab " + Backstab);
	console.log("Headshot " + Headshot);
	console.log("Wounded " + Wounded);
	console.log("IsWeakened " + IsWeakened);
	console.log("IsFeeble " + IsFeeble);
	console.log("NotifyEnemyHit");*/
	var damageDoneToPlayer = {
		DamageTaken : DamageTaken,
		Backstab : Backstab,
		Headshot : Headshot,
		Wounded : Wounded,
		IsWeakened : IsWeakened,
		IsFeeble : IsFeeble
	}
	if (bShouldShowDamageNumbers)
	{
	    NotifyDamageDone(damageDoneToPlayer);
	}
	CrosshairHitEnemy();
});

var DamageDoneTemplate = document.getElementById('cloned-elements').getElementsByClassName('attack-damage')[0];

function NotifyDamageDone(damageDoneToPlayer){

	var ToastContainer = document.getElementById("damage-container");
  var newDamage = DamageDoneTemplate.cloneNode(true);
  var damageNumber = newDamage.getElementsByClassName("attack-damage-number")[0];
  var damageType = newDamage.getElementsByClassName("attack-damage-type")[0];
	var damageText;
	/*if(damageDoneToPlayer.DamageTaken.toFixed(1) <= 0){
		damageNumber.innerHTML = "BLOCKED";
	}
	else{

	}*/
	damageNumber.innerHTML = damageDoneToPlayer.DamageTaken.toFixed(1);
	if(damageDoneToPlayer.Backstab){
		damageText = "BACKSTAB";
		damageType.classList.add("crit");
		damageNumber.classList.add("crit");
		damageNumber.classList.add("crit-number");
	}
	else if(damageDoneToPlayer.Headshot){
		damageText = "HEADSHOT";
		damageType.classList.add("crit");
		damageNumber.classList.add("crit");
		damageNumber.classList.add("crit-number");
	}
	else{
		damageText = "";
	}

	if(damageDoneToPlayer.IsWeakened){
		damageText += " (WEAKENED)";
		damageType.classList.add("weak");
		damageNumber.classList.add("weak");
	}
	else if(damageDoneToPlayer.IsFeeble){
		damageText += " (FEEBLE)";
		damageType.classList.add("weak");
		damageNumber.classList.add("weak");
	}


	damageType.innerHTML = damageText;
  if(ToastContainer.firstChild){
		ToastContainer.insertBefore(newDamage, ToastContainer.firstChild);
	} else {
		newDamage = ToastContainer.appendChild(newDamage);
	}

  setTimeout(function(element){
		element.classList.add("damage-exit");
    element.classList.remove("damage-enter");
		setTimeout(function(element){
			element.remove();
		}, 500, element);
	}, 500, newDamage);
}

engine.on('UpdateWeaponTooltip', function(title, text){
	$('.weaponContainer-title').html(title);
	$('.weaponContainer-text').html(text);
	DebugLog("UpdateWeaponTooltip with " + title + " " + text)
});

engine.on('ShowGameMessage', function(message, duration){
	AddGameMessage(message, duration);
});

/*Sigh... TODO: Make this not awful - pull in the enum name and just convert it */

function WoundEnumToIcon(wound)
{
	switch(wound)
	{
		case 0:
			return "Bleed_Wound";
			break;
		case 1:
			return "Cripple_Wound";
			break;
		case 2:
			return "Combat_Interrupt_Wound";
			break;
		case 3:
			return "Stamina_Wound";
			break;
		case 4:
			return "Stamina_Regen_Wound";
			break;
		case 5:
			return "Poison_Gas_Wound";
			break;
		case 6:
			return "Trapped_Wound";
			break;
		case 7:
			return "Stun_Tazer_Wound";
			break;
		case 8:
			return "Throw_Mez_Wound";
			break;
		case 9:
			return "Cripple_Wound";
			break;
		case 10:
			return "Speed_Boost";
			break;
		case 11:
			return "Damage_Boost";
			break;
		case 12:
			return "Armor_Boost";
			break;
		case 13:
			return "Armor_Boost";
			break;
		case 14:
			return "Blind_Wound";
			break;
		case 15:
			return "Sickness_Wound";
			break;
		case 16:
			return "Alarm_Wound";
			break;
		case 17:
			return "Damage_Boost";
			break;
		case 18:
			return "Hearing_Wound";
			break;
		case 19:
			return "Smoke_Wound";
			break;
		case 20:
			return "SnareImmune_Boost";
			break;
		case 21:
			return "Exposed_Wound";
			break;
		case 22:
			return "SecondChance_Boost";
			break;
		case 23:
			return "Showdown_Wound";
			break;
		case 24:
			return "SecondChance_Boost";
			break;
		case 28:
		case 29:
			return "Burn_Wound"
			break;
		case 30:
			return "Stealthy_Wound"
			break;
	    case 31:
	        return "BP_KillHealth"
	        break;
	    case 32:
	        return "BP_KillStamina"
	        break;
	    case 33:
	        return "BP_KillDamage"
	        break;
	    case 34:
	        return "BP_KillSpeed"
	        break;
	    case 35:
	        return "BP_KillDigDeep"
	        break;
	    case 36:
	        return "Block_Weak"
	        break;
	    case 37:
	        return "Block_Feeble"
	        break;
	    case 38:
	        return "HemoDrip_Boost"
	        break;
		default:
			return "none";
			break;
	}
}

engine.on('SetSpectatorTargetData', function(name, health, stamina, wounds, armorTotal){
	//console.log("Name: " + name + " Health: " + health + " Stamina: " + stamina + " Wounds: " + wounds.length);
		if(name == undefined || health == undefined || stamina == undefined){
			document.getElementById('spectator-player-element').classList.add("hidden");
		} else {
			if(matchData/* && matchData.spectating == true*/){
				document.getElementById('spectator-player-element').classList.remove("hidden");

				spectatorData.wounds = [];
				spectatorData.buffs = [];

				for(var i = 0; i < wounds.length; ++i){
						if(wounds[i].bIsBuff == true){
							spectatorData.buffs.push(wounds[i]);
						} else {
							spectatorData.wounds.push(wounds[i]);
						}
				}

				spectatorData.buffs.sort(SortWounds);
				spectatorData.wounds.sort(SortWounds);

				//spectatorData.wounds = wounds;
				spectatorData.name = name;
				spectatorData.health = health;
				spectatorData.stamina = stamina;
				spectatorData.armorTotal = (armorTotal / 30.0) * 100.0;
				/*if(wounds != undefined && wounds.length > 0){
					for(var i = 0; i < wounds.length; ++i){
						var woundIcon = WoundEnumToIcon(wounds[i]);
						if(woundIcon != "none"){
							spectatorData.wounds.push("images/Wounds/" + woundIcon + ".svg");
						}
					}
				}*/
			}
		}
});

engine.on("OnPlayerHealthChanged", function(currHealth, prevHealth, maxHealth){
	console.log("CurrHealth: " + currHealth + " || PrevHealth" + prevHealth + " || maxHealth: " + maxHealth);
	//Never trust DOM values, only rely on currHealth/prevHealth, not healthElemText.textContent
	var healthElem = document.getElementById("health-bar");
	var healthElemText = document.getElementById("health-bar-value");
	var healthContainer = document.getElementById("health-bar-container");
	var modifiedHealth = Math.ceil((currHealth / maxHealth) * 100);
	healthElem.style.width = modifiedHealth + "%";
	healthElemText.innerHTML = Math.ceil(currHealth);
	var color = healthPulseColors['neutral'];

	if(currHealth > prevHealth) {
		color = healthPulseColors['positive'];
	} else if (currHealth < prevHealth) {
		color = healthPulseColors['negative'];
	}

	PulseElement(healthContainer, color);
});

engine.on("OnPlayerStaminaChanged", function(currStamina, maxStamina){
	var stamElem = document.getElementById("stamina-bar");
	var stamElemText = document.getElementById("stamina-bar-value");
	var modifiedStam = Math.ceil((currStamina / maxStamina) * 100);

	stamElem.style.width = modifiedStam + "%";
	//stamElemText.innerHTML = Math.ceil(currStamina);
});

engine.on("OnStartSpectating", function(){
	console.log('OnStartSpectating');
	OnStartSpectating();
});

engine.on("OnStopSpectating", function () {
	console.log('OnStopSpectating' + bSpectateScreen);
    if (bSpectateScreen) {
        PopScreen();
    }
});

engine.on("HideAllHudElements", function () {
	HideAllHudElements();
});

function HideAllHudElements(){
	document.getElementById('hud-bottom-left-container').classList.add("hidden");
	document.getElementById('hud-bottom-right-container').classList.add("hidden");
	document.getElementById('hud-center-container').classList.add("hidden");
	document.getElementById('compass-container').classList.add("hidden");
	document.getElementById('location-container').classList.add("hidden");
	document.getElementById("game-message-container").classList.add("hidden");
}

function OnStartSpectating()
{
	DebugLog("OnStartSpectating");
	matchData.spectating = true;
	matchData.showStatusText = true;
	/*document.getElementById('hud-top-left-box').classList.add("hidden");*/
	//document.getElementById('spectator-player-element').classList.remove("hidden");
	HideAllHudElements();
	SetUsableVisible(false);
	SetCrosshair('none');
}

engine.on("OnStartPlaying", function(){
//	console.log("!!!!!!!!!!!!!!! START PLAYING");
	OnStartPlaying();
});



function RefreshSpectateMode()
{
	// Because SpectateMode might be set before the HUD is loaded.
	engine.call("RefreshSpectateMode").then(function(result){
		if (result)
			OnStartSpectating();
		else
			OnStartPlaying();
	});
}

function OnStartPlaying()
{
	DebugLog("OnStartPlaying");
	matchData.spectating = false;
	matchData.showStatusText = matchData.preMatch || matchData.spectating;

/*	document.getElementById('hud-bottom-left-container').classList.remove("hidden");
	document.getElementById('hud-bottom-right-container').classList.remove("hidden");*/
	document.getElementById('hud-center-container').classList.remove("hidden");
	document.getElementById('compass-container').classList.remove("hidden");
	document.getElementById('spectator-player-element').classList.add("hidden");
	SetUsableVisible(true);
	SetCrosshair(weaponCrosshairStyle);
	/*engine.call("GetActivityRating").then(function(result){
		matchData.currRating = result;*/
//		engine.call("RequestSpawnSync");
	/*});*/
	engine.call("GetPlayerData");
}

engine.on('SelectWeaponSlot', function(slot){
	HighlightWeaponSlot(slot);
});

engine.on('SetItemForSlot', function(item, slot, ammotext){
	SetItemForWeaponSlot(item, slot, ammotext);
});

engine.on('SetWeaponSlotEnabled', function(slot, isenabled){
	SetWeaponSlotEnabled(slot, isenabled)
});

engine.on("RemoveItemFromSlot", function(slot){
	RemoveItemFromWeaponSlot(slot);
});

engine.on("SetAmmoStringForSlot", function(slot, ammotext){
	SetAmmoStringForSlot(slot, ammotext);
});

engine.on("GetUserSettings", function(usersettings, resolutions){
	if(resolutions != undefined && usersettings != undefined){
		UpdateGameSettingsFromEngine(usersettings);
		//The resolution list may have duplicates, so we need to clean it up

		AvailResolutions = unique(resolutions);

		GameSettings.res = usersettings.xRes + "." + usersettings.yRes;

		DebugLog("Resolutions: " + resolutions.length);
		DebugLog("Got GameSettings from C++: " + JSON.stringify(usersettings));
	} else {
		DebugLog("Got empty user settings from C++");
	};

	if(boundOptions == undefined){
		DebugLog("Binding Rivets for Options Menu");
		boundOptions = rivets.bind($('#pause-menu-options'), {
			GameSettings: GameSettings,
			AvailResolutions: AvailResolutions
		});
	}
});

engine.on("ShowPauseMenu", function(bIsEnabled){
	//C++ owns the "toggling" - we just apply the state
	console.log("HUD.JS:: ShowPauseMenu " + bIsEnabled);
	ShowPauseMenu(bIsEnabled);
});

engine.on("SetMatchTime", function(matchtime, status){
		/*console.log(status);
		console.log(matchtime);*/
    matchData.time = matchtime;
    //matchData.preMatch = preMatch;
    if (status.length > 0)
    {
        matchData.showStatusText = true;
				document.getElementById('match-status').classList.remove("hidden");
    }else{
				matchData.showStatusText = false;
				document.getElementById('match-status').classList.add("hidden");
		}
		if(matchData.time > 0){
			//console.log("match-status");
			document.getElementById('match-timer').classList.remove("hidden");

		}
    matchData.matchStatusText = status;
    //matchData.showStatusText = preMatch || matchData.spectating;
});

engine.on("SetMatchLength", function (matchlength) {
    matchData.matchlength = matchlength;
});

engine.on("SetMatchTimeHidden", function (hideTime) {
    matchData.hideTime = hideTime;
});

var funcElem = document.getElementById("func");

engine.on("SetAirdropProgress", function(progress, MaxRating, Rating, AccumulatedRating, isAvailable){
	/*console.log("MaxRating" + MaxRating);
	console.log("Rating" + Rating);
	console.log("AccumulatedRating" + AccumulatedRating);*/
	console.log("isAvailable" + isAvailable);
  var ptsAdd = Math.round(progress * MaxRating) - matchData.currRating;
	SetAirdropProgress(progress * 100);
	matchData.currRating = Rating;
	matchData.accumulatedRating = AccumulatedRating;
	matchData.maxRating = MaxRating;
	matchData.airdropIsAvailable = isAvailable;
	CheckAirdropDisplay();
});

function SetAirdropText(){
    //if (matchData.accumulatedRating)
    {
        if (matchData.currRating >= matchData.maxRating)
        {
			airdropreadytext.classList.remove("hidden");
			airdropremainingtext.classList.add("hidden");
			//airdropreadytext.innerHTML = "FUNC Acquired";
			//if (!matchData.airdropTimeRemaining)
			//{
				airdropreadytext.innerHTML = "Ready";
			//}
        }
        else
        {
            airdropreadytext.classList.add("hidden");
            airdropremainingtext.classList.remove("hidden");
        }

		if(matchData.airdropTimeRemaining){
			//airdroptime.classList.remove('hidden');
		}
		else{
			//airdroptime.classList.add('hidden');
		}
	}
}

function CheckAirdropDisplay()
{
	//console.log(matchData.playerAirdrop.Stage);
	//console.log(matchData.matchStage);
	//if(!matchData.airdropUsed){
		//if(matchData.airdropTimeRemaining){
    if(matchData.airdropIsAvailable)
    {
		matchData.airdropTimeRemaining = false;
	}
    else
    {
		matchData.airdropTimeRemaining = true;
	}
    //}
    //}
	SetAirdropText();
}


engine.on("NotifyAirdropProgress", function(ActivityName, ActivityValue, Rating){
		NotifyAirdropProgress(ActivityName, ActivityValue);
		matchData.currRating = Rating;
		//UpdateFUNCValue();
});


engine.on("AirdropReady", function(){
	AirdropReady();
});

engine.on("AirdropUsed", function(){
	matchData.airdropUsed = true;
	AirdropUsed();
});

engine.on("SetMatchStage", function(stage){
	/*console.log("SetMatchStage " + stage);*/
	matchData.matchStage = stage;
	CheckAirdropDisplay();
});

engine.on("OnDebugCVarChanged", function(value){
	ShowDebugMessages = value;
});

engine.on("SetMatchState", function(state){
	//console.log("!!!!!!!!!!! SetMatchState: " + state);
	matchData.matchState = state;
});

var bIsThrowing = false;
engine.on("PlayerStartedThrowing", function(){
	HideCrosshair(false);
	bIsThrowing = true;
});

engine.on("PlayerStoppedThrowing", function(bShouldShowCrosshair){
	if(!bShouldShowCrosshair)
		HideCrosshair(true);
	bIsThrowing = false;
});

engine.on("SetPlayerTargeting", function(IsTargeting){
	console.log("IsTargeting: " + IsTargeting);
	SetPlayerTargeting(IsTargeting);
});

var bLocalizationDataLoaded = false;

engine.on("SetPlayerData", function(nickname, perks, airdrop){
    if (bLocalizationDataLoaded) {
        SetPlayerData(nickname, perks, airdrop);
    }
    else {
        console.log("SetPlayerData:: No loc");
    }
});

engine.on("OnPlayerDied", function(){
	OnPlayerDied();
});

engine.on("OnMessageReceived", function(bIsTeammate, name, msg){
	OnMessageReceived(bIsTeammate, name, msg);
});

var bIsChatVisible = false;
engine.on("ShowChatUI", function(bShouldShow, bIsTeam){
	ShowChatUI(bShouldShow, bIsTeam);
});

engine.on("UpdateTeamMemberPosition", function(facing, perc, dotprod, dist){
	UpdateTeamMemberPosition(facing, perc, dotprod, dist);
});

engine.on("SetTeamMemberStatus", function(health, maxHealth, stam, maxStam){
	SetTeamMemberStatus(health, maxHealth, stam, maxStam);
});

engine.on("OnTeamMemberAdded", function(playername){
	OnTeamMemberAdded(playername);
});

engine.on("OnTeamMemberDied", function(){
	OnTeamMemberDied();
});

engine.on("ShowLocationUpdate", function(location){
		ShowLocationUpdate(location);
});

engine.on("SetPlayerHeading", function(heading){
		SetHeading(heading);
		//console.log("Player Heading: " + heading);
});

engine.on("OnWoundsModified", function(woundList, armorTotal){
		OnWoundsModified(woundList);
		woundData.Armor = (armorTotal / 30.0) * 100.0;
});

engine.on("SetDeathData", function(deathData){
	SetDeathData(deathData, false);
});

engine.on("SetVictoryData", function(deathData){
	SetDeathData(deathData, true);
});

engine.on("SetMatchStats", function(matchStatsJson){
	SetMatchStats(matchStatsJson);
});

engine.on("SetMatchReward", function(reward, rarity){
	SetMatchReward(reward, rarity);
});

engine.on("SetActiveWeapon", function(weapon){
		SetActiveWeapon(weapon);
});

engine.on("NotifyReceivedStatsUpdate", function (statsJson, _deathData, showXpProgress) {
    NotifyReceivedStatsUpdate(statsJson, _deathData, showXpProgress);
});


var lastNotificationTime = undefined;
var timeBetweenNotifications = 30000;

//////////////////////////////
//	Localization Functions	//
//////////////////////////////
/*
While I'm not worried about setting up localization yet, if we sort of mock up
how we get our text to go through a helper function (ref'd by token) from the
beginning, it'll make this a lot easier when we do
*/

function loc(token){
	if(token != undefined){
		token = token.toLowerCase();
		var splitTokens = token.split('.');
		var result = locDB;
		for(var i = 0; i < splitTokens.length; ++i){
			if(result[splitTokens[i]] != undefined){
				result = result[splitTokens[i]];
			} else {
				return "!" + token;
			}
		}
		return result[currLanguage];
	}
	return "!null_token";
}

function icon(token){
	if(token != undefined){
		token = token.toLowerCase();
		var splitTokens = token.split('.');
		var result = locDB;
		for(var i = 0; i < splitTokens.length; ++i){
			if(result[splitTokens[i]] != undefined){
				result = result[splitTokens[i]];
			} else {
				return "!" + token;
			}
		}
		return result;
	}
	return "!null_token";
}

/*
function icon(item){
	if(item != undefined){
		item = item.toLowerCase();
		var result = locDB;
		console.log(result[item]);
		return result[item].tooltip_icon;
	}
	return "";
}*/
//////////////////////////////
//			HUD Functions				//
//////////////////////////////

var funcText = document.getElementsByClassName("func-text")[0];

function UpdateFUNCValue()
{
	engine.call("GetActivityRating").then(function(result){
		matchData.currRating = result;/*
		funcElem.classList.add("pulse-element");
		setTimeout(function(){
			funcElem.classList.remove("pulse-element");
		}, 400);*/
	});
}

var crosshaircontainer = document.getElementById('crosshair-container');
var crosshairContainerVisible = document.getElementById('crosshair-container-visible-group');
var crosshairbasic = document.getElementById('crosshair-basic');
var crosshaircrafting = document.getElementById('crosshair-crafting');
var crosshairHitContainer = document.getElementById('crosshair-hit');
var usablecontainer = document.getElementById('usable-container');
var usableactiontext = document.getElementById('usable-action-text');
var usabletexttop = document.getElementById('usable-text-top');
var usabletextbottom = document.getElementById('usable-text-bottom');
var usablemetervalue = document.getElementById('usable-meter-value');
var usablemetercontainer = document.getElementById('usable-meter-container');
var usabletextcontainer = document.getElementById('usable-text-container');
var airdropvalue = document.getElementById('airdrop-value');
var airdropcontainer = document.getElementById('airdrop-container');
var airdropvalueimage = document.getElementById('airdrop-value-image');
//var airdroptime = document.getElementById('airdrop-value-time');
var airdropreadytext = document.getElementById("airdrop-ready-text");
var airdropremainingtext = document.getElementById("airdrop-remainingfunc-text");

var airdropspent = false;

function SetPlayerData(nickname, perks, airdrop) {
    console.log("SetPlayerData:: airdrop: " + JSON.stringify(airdrop));
	matchData.playerName = nickname;
	deathData.PlayerName = nickname;
	matchData.playerPerks = perks;
	matchData.playerAirdrop = airdrop;
}

function HideCrosshair(shouldHide){
	console.log("HideCrosshair: " + shouldHide);
	if(shouldHide){
		crosshairContainerVisible.classList.add("hidden");
	} else {
		crosshairContainerVisible.classList.remove("hidden");
	}
}

function SetAirdropProgress(progress)
{
	if(progress >= 100){
		progress = 100;
	} else {
		airdropvalue.classList.remove("airdrop-value-full");
	}

	if(airdropspent == false){
		airdropvalue.style.height = progress + "%";
		PulseElement(airdropcontainer, "rgb(255,150,21)");
		//PulseElement(airdropvalueimage, "rgb(255,150,21)");
	}
}

function AirdropReady()
{
	console.log('airdropready');
	if(airdropspent == false){
		airdropvalue.classList.add("airdrop-value-full");
		airdropvalue.style.height = "100%";
	}
}

function AirdropUsed()
{
	console.log('airdropused');
	//airdropspent = true;
	airdropvalue.classList.remove("airdrop-value-full");
	airdropvalue.style.height = "0%";
	airdropcontainer.classList.add('hidden');
}

//Get our Weapon Slots
var WeaponSlots = [
	document.getElementById('weapon-slot-0'),
	document.getElementById('weapon-slot-1'),
	document.getElementById('weapon-slot-2'),
	document.getElementById('weapon-slot-3'),
	document.getElementById('weapon-slot-4')
];

var LastTooltip = undefined;

function SetToolTips()
{
	console.log("TOOLTIPS TEXT " + WeaponSlots.length);
	for(var i = 0; i < WeaponSlots.length; ++i){
		WeaponSlots[i].TooltipContainer = document.getElementById("weapon-tooltip-container");
		WeaponSlots[i].TooltipHeader = document.getElementById("weapon-tooltip-header");
		WeaponSlots[i].TooltipTitle = document.getElementById("weapon-tooltip-title");
		WeaponSlots[i].TooltipText = document.getElementById("weapon-tooltip-text");

		WeaponSlots[i].HideTooltip = function(){
			this.TooltipContainer.classList.add("weapon-tooltip-hide");
		};

		WeaponSlots[i].ShowTooltip = function(item){
			//console.log(item);
			if(!GameSettings.showWeaponTooltips){
				return;
			}
			if(item == "empty"){
				item = "fist";
			}

			//this.TooltipTitle.textContent = loc("item_" + item + "_tooltip_title");
			this.TooltipTitle.innerHTML = loc("items." + item + ".tooltip_title");
			var tipText = loc("items." + item + ".tooltip_text");
			//console.log(tipText);

			if(tipText.indexOf('Left Mouse:') != 1){
				tipText = tipText.replace("Left Mouse:", "<span id='fire-action-button'>" + ControllerBtnConversion(ActionMapDB.ActionMappings.Fire.Key) + "</span>");
				//console.log(tipText.indexOf('Right Mouse:'));
				if(tipText.indexOf('Right Mouse:') != 1){
					//console.log("RightMouse");
					tipText = tipText.replace("Right Mouse:", "<span id='targeting-action-button'>" + ControllerBtnConversion(ActionMapDB.ActionMappings.Targeting.Key) + "</span>");
				}
				this.TooltipText.innerHTML = tipText;
			}
			else{
				this.TooltipText.innerHTML = tipText;
			}
			//this.TooltipText.textContent = loc("item_" + item + "_tooltip_text");

			if(LastTooltip != undefined){
				LastTooltip.HideTooltip();
			}

			LastTooltip = this;
			this.TooltipContainer.classList.remove("weapon-tooltip-hide");
			//console.log("TOOLTIPS REMOVE HIDE");
			if(document.getElementById("fire-action-button")){
				SetCullDingsFont(document.getElementById("fire-action-button"));
				if(document.getElementById("targeting-action-button")){
					SetCullDingsFont(document.getElementById("targeting-action-button"));
				}
			}
		};
	}
}

var inUsableMode = false;
var usableCrosshairStyle = "none";
var weaponCrosshairStyle = 'basic';
var CurrentWeaponSettings = {
	bShouldUseCrosshair : false,
	bShowCrosshairOnIronSights : false
};

function SetPlayerTargeting(IsTargeting)
{
	var bShouldHide = (IsTargeting && !CurrentWeaponSettings.bShowCrosshairOnIronSights) || (!IsTargeting && !CurrentWeaponSettings.bShouldUseCrosshair) || bIsThrowing;
	console.log("Should Hide: " + bShouldHide);
	HideCrosshair(bShouldHide);
}

var UseTypeDict = {
	'0': {'type': 'none'},
	'1': {'type': 'interact'},
	'2': {'type': 'crafting'},
	'3': {'type': 'pickup'},
	'4': {'type':'pickupammo'},
	'5': {'type':'nospace'},
	'6': {'type': 'crafting'},
	'7': {'type': 'recycle'},
	'8': {'type': 'airdroppad'},
	'9': {'type': 'holospawner'}
};

function SetActiveWeapon(weapon)
{
	console.log("SetActiveWeapon: " + JSON.stringify(weapon));
	CurrentWeaponSettings = weapon;
	//XAV_VB 01/11/2016 - We need the crosshair for throwing weapons even if we dont use for attacking. So set the basic type.
	if(CurrentWeaponSettings.bShouldUseCrosshair)
	{
		weaponCrosshairStyle = 'basic';
	}
	//else
	//{
	//	weaponCrosshairStyle = 'none';
	//}
	HideCrosshair(!CurrentWeaponSettings.bShouldUseCrosshair);
	UpdateCrosshair();
};

function SetAmmoStringForSlot(slot, ammostring)
{
		WeaponSlots[slot].setAttribute('data-slot-ammotext', ammostring);
		//We may not want to trigger the full redraw, but this really won't happen THAT much, so eff it
		RedrawWeaponSlots();
}

function RedrawWeaponSlots()
{
	for( var i = 0; i < WeaponSlots.length; ++i){
		var Slot = WeaponSlots[i];
		var KeyDiv = Slot.getElementsByClassName('weapon-entry-key')[0];
		var AmmoDiv = Slot.getElementsByClassName('weapon-ammo-count')[0];
		var IconDiv = Slot.getElementsByClassName('weapon-icon-container')[0];
		//var HighlightDiv = Slot.getElementsByClassName('weapon-entry-highlight')[0];

		//Aggregate our states first
		var IsHighlighted = Slot.getAttribute("data-slot-highlighted");
		var SlotItem = Slot.getAttribute("data-slot-item");
		var IsSlotLocked = Slot.getAttribute("data-slot-locked");
		var AmmoText = Slot.getAttribute('data-slot-ammotext');
		//Reset our classes
		Slot.classList.remove('weapon-entry-selected');
		IconDiv.classList.remove('weapon-icon-selected');
		AmmoDiv.classList.remove('weapon-ammo-count-selected');
		//KeyDiv.classList.add('hidden');
		AmmoDiv.classList.add('hidden');
		//HighlightDiv.classList.add('hidden');

		var Icon = ""; //the Icon we're going to draw for this slot
		if(SlotItem == "empty"){
			SlotItem = "fist";
		}
		//console.log(SlotItem);

		//Now process the redraw for this slot
		//If we're locked, this trumps all
		if(IsSlotLocked == "true"){
			if(i == 3){
				Icon = "Satchel_Locked";
			} else if(i == 4){
				Icon = "Backpack_Locked";
			} else {
				Icon = "fist";
			}
		} else {
		//Otherwise, there's more to figure out - we'll assume the Key and Ammo should be shown
		if(!FooterData.bHasGamepad){
			KeyDiv.classList.remove('hidden');
		}
			AmmoDiv.classList.remove('hidden');
			AmmoDiv.innerHTML = AmmoText;
			//Now, if we're highlighted, we'll add the selected class, unhide the Highlight, and set our icon to be _h
			if(IsHighlighted && IsHighlighted == "true"){
				Slot.classList.add('weapon-entry-selected');
				IconDiv.classList.add('weapon-icon-selected');
				AmmoDiv.classList.add('weapon-ammo-count-selected');
				//HighlightDiv.classList.remove('hidden');
				Icon = SlotItem + "_h"
			} else {
				//And if we're not, it means we should just show our normal icon, UNLESS we're the fist, which is in disabled state (_g)
				Icon = SlotItem;

				//if(SlotItem == "fist"){
				//	Icon += "_g";
				//}
			}
		}
		IconDiv.style.backgroundImage = "url('images/InventoryIcons/" + Icon + ".png')";
		console.log("Icon: " + Icon);
	}
}

function SetWeaponSlotEnabled(slot, isenabled){
	var _Slot = WeaponSlots[slot];
	if(_Slot != undefined){
		if(isenabled){
			if(IsWeaponSlotLocked(slot) != "true"){
				_Slot.setAttribute('data-slot-locked', "false");
			}
		} else {
			_Slot.setAttribute('data-slot-locked', "true");
		}
	}

	RedrawWeaponSlots();
}

function RemoveItemFromWeaponSlot(slot){
	if(WeaponSlots[slot] && WeaponSlots[slot].getAttribute('data-slot-item'))
	{
			DebugLog("Remove item " + WeaponSlots[slot].getAttribute('data-slot-item') + " from slot " + slot)
	}

	SetItemForWeaponSlot("empty", slot, "");
	if(WeaponSlots[slot]){
		if(WeaponSlots[slot].getAttribute('data-slot-highlighted') == "true"){
			WeaponSlots[slot].ShowTooltip("empty");
		}
	}
	//Don't call RedrawWeaponSlots, because SetItemForWeaponSlot will do that for us
}

function IsWeaponSlotLocked(slot)
{
	var _Slot = WeaponSlots[slot];
	return (_Slot.getAttribute('data-slot-locked') == "true");
}

function SetItemForWeaponSlot(item, slot, ammotext)
{
	DebugLog("SetItemForWeaponSlot(" + item +","+slot+","+"ammotext"+")");
	if(WeaponSlots[slot]){
		WeaponSlots[slot].setAttribute('data-slot-item', item);
		WeaponSlots[slot].setAttribute('data-slot-ammotext', ammotext);
		if(WeaponSlots[slot].getAttribute('data-slot-highlighted') == "true"){
			WeaponSlots[slot].ShowTooltip(item);
		}
	}
	RedrawWeaponSlots();
}

function HighlightWeaponSlot(slot)
{
	//There can only be one highlighted slot, so we need to clear the attribute for everyone else
	for( var i = 0; i < WeaponSlots.length; ++i){
		var _Slot = WeaponSlots[i];
		if(slot != i){
			_Slot.setAttribute("data-slot-highlighted", "false");
		} else {
			_Slot.setAttribute("data-slot-highlighted", "true");
		}
	}
	var item = WeaponSlots[slot].getAttribute("data-slot-item");
	if(item == "empty" || item == undefined){
		item = "fist";
	}

	WeaponSlots[slot].ShowTooltip(item);
	RedrawWeaponSlots();
}
var actionMapCheck = false;
function SetUsableData(name, type, time, recipe, cost, recycleValue, remainingTime)
{
    console.log("SetUsableData: " + name + " " + type + " " + time + recipe + " recycle value: " + recycleValue);
    //console.log("remainingTime" + remainingTime);
    //usabletexttop.textContent = top;
    usabletextbottom.innerHTML = name;
    usabletexttop.innerHTML = loc("use." + UseTypeDict[type]['type']);
    usableCrosshairStyle = UseTypeDict[type]['type'];
    if (ActionMapDB.ActionMappings.Use != undefined)
    {
        if (name == "Blue Crate")
        {
            usabletexttop.innerHTML = loc("use." + UseTypeDict[1]['type']);
            usableactiontext.innerHTML = ControllerBtnConversion(ActionMapDB.ActionMappings.Use.Key);
            usabletextbottom.innerHTML = "Requires 50" + "<div class='currency-icon'></div>" + "to open";
			UsableTextColorChange(true);
        }
        else if (type == 2 || type == 6)
        {
            //if we're crafting, show the recipe
            if (cost > 0)
            {
                usableactiontext.innerHTML = ControllerBtnConversion(ActionMapDB.ActionMappings.Use.Key);
                usabletexttop.innerHTML = usabletexttop.innerHTML + " " + loc("recipes." + recipe) + " -" + cost + "<div class='currency-icon'></div>"
                UsableTextColorChange(false);
                if (type != 6)
                {
                    usableactiontext.innerHTML = ControllerBtnConversion(ActionMapDB.ActionMappings.Use.Key);
                    usabletexttop.innerHTML = usabletexttop.innerHTML;
                    UsableTextColorChange(true);
                }
            }
            else
            {
                usableactiontext.innerHTML = ControllerBtnConversion(ActionMapDB.ActionMappings.Use.Key);
                usabletexttop.innerHTML = usabletexttop.innerHTML + " " + loc("recipes." + recipe);
                UsableTextColorChange(true);
            }
        }
        else if (type == 3)
        {
            usableactiontext.innerHTML = ControllerBtnConversion(ActionMapDB.ActionMappings.Use.Key);
            usabletexttop.innerHTML = usabletexttop.innerHTML + " " + name;
            UsableTextColorChange(true);
        }
        else if (type == 7)
        {
            //Recycler
            if (recycleValue > 0)
            {
                usableactiontext.innerHTML = ControllerBtnConversion(ActionMapDB.ActionMappings.Use.Key);
                usabletexttop.innerHTML = "Recycle " + recycleValue + " " + "<div class='currency-icon'></div>";
                UsableTextColorChange(true);
            }
            else
            {
                usableactiontext.innerHTML = " ";
                usabletexttop.innerHTML = "Equip a Recyclable Item";
                UsableTextColorChange(false);
            }
        }
        else if (type == 8)
        {
            //Airdrop Pad
            //console.log("playerAirdrop: " + matchData.playerAirdrop);
            //console.log("assetname: " + matchData.playerAirdrop.AssetName);
            var airdropFuncText = "Call " + rivets.formatters.getAirdropName(matchData.playerAirdrop.AssetName);

            if (matchData.airdropIsAvailable) {
                UsableTextColorChange(true);
            }
            else {
                UsableTextColorChange(false);
            }
            if (matchData.airdropUsed) {
                usabletexttop.innerHTML = " ";
                usabletextbottom.innerHTML = " ";
                usableactiontext.innerHTML = " ";
            } else {
                usableactiontext.innerHTML = ControllerBtnConversion(ActionMapDB.ActionMappings.Use.Key);
                usabletexttop.innerHTML = airdropFuncText;
            }

            //usabletexttop.innerHTML = divStart + airdropFuncText + divEnd;

            /* TML 4/3/17 - Removing and using player HUD instead.
	        if (remainingTime > 0) {
		        var minutes = Math.floor(remainingTime / 60);
		        var seconds = remainingTime % 60;
		        //console.log("remainingTime: " + remainingTime);
		        //console.log("minutes: " + minutes);
		        //console.log("seconds: " + seconds);
		        var time = "" + minutes + ":" + (seconds < 10 ? "0" : "");
		        time += seconds;
		        usabletextbottom.innerHTML = "<div style='display: inline; color:#CD310F;'> Remaining time " + time + "</div>";
	        } */


        }
        else if (type == 9)
        {
            //holospawner
            var spawnerData = name.split(",");
            if (Number(matchData.currRating) < Number(spawnerData[1]))
            {
                usableactiontext.innerHTML = ControllerBtnConversion(ActionMapDB.ActionMappings.Use.Key);
                usabletexttop.innerHTML = loc("items." + spawnerData[0] + ".tooltip_title") + " -" + spawnerData[1] + " " + "<div class='currency-icon'></div>";
                UsableTextColorChange(true);
            }
            else
            {
                usableactiontext.innerHTML = ControllerBtnConversion(ActionMapDB.ActionMappings.Use.Key);
                usabletexttop.innerHTML = loc("items." + spawnerData[0] + ".tooltip_title") + " -" + spawnerData[1] + " " + "<div class='currency-icon'></div>";
                UsableTextColorChange(false);
            }
            usableactiontext.innerHTML = "";
            usabletextbottom.innerHTML = "";
        }
        else
        {
            var spawnerData = name.split(" ");
            if (Number(spawnerData[0]))
            {
                if (Number(matchData.currRating) < Number(spawnerData[0]))
                {
                    UsableTextColorChange(false);
                }
                else
                {
                    UsableTextColorChange(true);
                }
            }
            else
            {
                UsableTextColorChange(true);
            }
            usableactiontext.innerHTML = ControllerBtnConversion(ActionMapDB.ActionMappings.Use.Key);
            usabletexttop.innerHTML = usabletexttop.innerHTML;
        }
        SetCullDingsFont(usableactiontext);
    }
    else
    {
        if (!actionMapCheck)
        {
            console.log("Use action mapping has been removed. USE: " + JSON.stringify(ActionMapDB.ActionMappings.Use));
            actionMapCheck = true;
        }
    }

    if (type == 6)
    {
        usabletexttop.innerHTML = usabletexttop.innerHTML;
        SetCullDingsFont(usableactiontext);
        UsableTextColorChange(false);
    }

    UpdateCrosshair();
};

function UsableTextColorChange(value){
	if(value){
		usabletexttop.classList.add("white-text");
		usabletextbottom.classList.add("white-text");
		usableactiontext.classList.add("white-text");
		usabletexttop.classList.remove("red-text");
		usabletextbottom.classList.remove("red-text");
		usableactiontext.classList.remove("red-text");
	}
	else{
		usabletexttop.classList.remove("white-text");
		usabletextbottom.classList.remove("white-text");
		usableactiontext.classList.remove("white-text");
		usabletexttop.classList.add("red-text");
		usabletextbottom.classList.add("red-text");
		usableactiontext.classList.add("red-text");
	}
}

function ControllerBtnConversion(button){
	/*console.log(button);
	console.log(JSON.stringify(ActionMapDB.ActionMappings));*/
	var controllerBtn;
	if(button.indexOf('Gamepad') == 0)
	{
		switch(button){
			case "Gamepad_DPad_Up": //DPad Up
				controllerBtn = "1";
				break;
			case "Gamepad_DPad_Down": //DPad Down
				controllerBtn = "2";
				break;
			case "Gamepad_DPad_Left": //DPad Left
				controllerBtn = "3";
				break;
			case "Gamepad_DPad_Right": //DPad Right
				controllerBtn = "4";
				break;
			case "Gamepad_FaceButton_Top": //Y
				controllerBtn = "5";
				break;
			case "Gamepad_FaceButton_Bottom": //A
				controllerBtn = "7";
				break;
			case "Gamepad_FaceButton_Left": //X
				controllerBtn = "6";
				break;
			case "Gamepad_FaceButton_Right": //B
				controllerBtn = "8";
				break;
			case "Gamepad_Special_Right": //Start
				controllerBtn = "<";
				break;
			case "Gamepad_Special_Left": //Back
				controllerBtn = ";";
				break;
			case "Gamepad_LeftTrigger": //Left Trigger
				controllerBtn = ">";
				break;
			case "Gamepad_LeftShoulder": //Left Bumper
				controllerBtn = "=";
				break;
			case "Gamepad_RightTriggerAxis": //Right Trigger
				controllerBtn = "?";
				break;
			case "Gamepad_RightShoulder": //Right Bumper
				controllerBtn = "@";
				break;
			case "Gamepad_RightThumbstick": //Right Thumb Stick
				controllerBtn = ":";
				break;
			case "Gamepad_LeftThumbstick": //Left Thumb Stick
				controllerBtn = "9";
				break;
			default:
				controllerBtn = "\0037";
				break;
		}
	}
	else{
		SetHasGamepad(false);
		return "[" + PCButtonConversion(button) + "]";
	}
	SetHasGamepad(true);
	return controllerBtn;
}

function SetCullDingsFont(elem){
	/*console.log(elem.innerHTML);
	console.log(FooterData.bHasGamepad);*/
	if(FooterData.bHasGamepad){
		elem.classList.add("cullDings");
	}else{
		elem.classList.remove("cullDings");
	}
}

function SetUsableProgress(progress){
		usablemetervalue.style.width = (progress * 100) + "%";
		usablemetervalue.classList.remove("charge-attack-pulse");
		if(progress >= 1.0){
			usablemetervalue.style.width = "100%";
			usablemetervalue.classList.remove('charge-attack-fade');
			if(overDrive){
				usablemetervalue.classList.add("charge-attack-pulse");
			}
		}
};

function SetUsableProgressVisible(isvis, didfinish, dontCancel){
	DebugLog("SetUsableProgressVisible: " + isvis);
	if(isvis){
		usablemetervalue.style.width = 0 + "%";
		if(overDrive){
			usablemetervalue.classList.add('charge-attack-fade');
		}
		else{
			usablemetervalue.style.backgroundColor = 'white';
		}
		usablemetercontainer.classList.remove('play-fadeout');
		crosshairContainerVisible.classList.remove("paused");
	} else {
		usablemetercontainer.classList.add('play-fadeout');

		if(didfinish){
				usablemetervalue.style.width = "100%";
				if(overDrive){
					usablemetervalue.style.backgroundColor = 'white';
				}
				else{
					usablemetervalue.style.backgroundColor = 'green';
				}

		} else if(dontCancel)	{
			usablemetervalue.style.backgroundColor = 'red';
		} else {
			usablemetervalue.style.backgroundColor = 'red';
		}
		DebugLog("Finished Use with " + usablemetervalue.style.width);
		usablemetervalue.classList.remove("charge-attack-pulse");
		usablemetervalue.classList.remove('charge-attack-fade');
		crosshairContainerVisible.classList.add("paused");
	}
};

var isUsableMode = false;

function SetUsableVisible(isvis){
	//DebugLog("SetUsableVisible: " + isvis);
    if (isvis && !isUsableMode) {
		//usablecontainer.style.display = 'inherit';
		//usabletextcontainer.style.opacity = 1;
		usabletextcontainer.classList.remove('play-fadeout');
		isUsableMode = true;
    } else if (!isvis && isUsableMode) {
		//usablecontainer.style.display = 'none';
		//usabletextcontainer.style.opacity = 0;
		usabletextcontainer.classList.add("play-fadeout");
		isUsableMode = false;
		UpdateCrosshair();
	}
};

function UpdateCrosshair(){
	if(isUsableMode){
		switch(usableCrosshairStyle){
			/*
			case "crafting":
				SetCrosshair('crafting');
				break;
				*/
			default:
				SetCrosshair(weaponCrosshairStyle);
				break;
		}
	} else {
		SetCrosshair(weaponCrosshairStyle);
	}
}

function SetCrosshair(type){
	//First, hide all the crosshairs
	crosshairbasic.style.display = 'none';
	crosshaircrafting.style.display = 'none';

	if(type == "basic"){
		crosshairbasic.style.display = 'inherit';
	} else if (type == "crafting"){
		crosshaircrafting.style.display = 'inherit';
	} else {
		//do nothing for now
	}
};

function PulseElement(elem, color){
		elem.preventDefault;
		elem.classList.remove("pulse-element");
		//elem.offsetWidth = elem.offsetWidth;
		elem.style.color = color;
		elem.classList.add("pulse-element");
}

var GameMessageTemplate = document.getElementById("cloned-elements").getElementsByClassName("game-message")[0];

function AddGameMessage(message, duration){
	DebugLog("AddGameMessage: " + message);
	var GameMessageContainer = document.getElementById("game-message-container");
	var newGameMessage = GameMessageTemplate.cloneNode(true);
	var text = newGameMessage.getElementsByClassName("game-message-text")[0];
	text.innerHTML = message;
	//
	if(GameMessageTemplate.firstChild){
		//newGameMessage = GameMessageContainer.appendChild(newGameMessage);
		GameMessageContainer.insertBefore(newGameMessage, GameMessageContainer.firstChild);
	} else {
		newGameMessage = GameMessageContainer.appendChild(newGameMessage);
	}

	setTimeout(function(element){
		element.classList.add("game-message-fadeout");
		setTimeout(function(element){
			element.remove();
		}, 500, element);
	}, duration, newGameMessage);
}

var PauseMenuPanes = [
	document.getElementById('pause-menu-challenges'),
	document.getElementById('pause-menu-crafting'),
	document.getElementById('pause-menu-controls'),
	document.getElementById('pause-menu-options')
];

var PauseMenuBox = document.getElementById('pause-menu-box');

var PauseMenuModalTemplate = document.getElementById("cloned-elements").getElementsByClassName("pause-menu-modal")[0];
var isInOptionsMenu = false;
var optionsDirty = false;
var isPauseVisible = false;
function ShowPauseMenu(bIsEnabled)
{
  console.log("ShowPauseMenu:: " + bIsEnabled);
	console.log(bEOMSummaryComplete);
	console.log(isPauseVisible);
	console.log(deathData.bDeathScreenShown);
  /*if (deathData.bDeathScreenShown)
  {
      return;
  }*/
  //ShowMatchOutcomeAgain();

  if (isPauseVisible == bIsEnabled)
  {
      return;
  }

	if(bIsEnabled)
	{
		console.log("********SHOWPAUSESCREEN");
		//PauseMenuBox.classList.remove("hidden");
		isPauseVisible = true;
		engine.call("SetPauseVisible", true);
		document.getElementById('hud-center-container').style.opacity = 0;
		document.getElementById('hud-bottom-right-container').classList.add('blur-element');
		document.getElementById('hud-bottom-left-container').classList.add('blur-element');
		document.getElementById('compass-container').classList.add('blur-element');
		document.getElementById('party-member-container').classList.add('hidden');
		document.getElementById('controls-footer').classList.remove('hidden');
		PauseMenuBox.classList.remove("hidden");
		PushScreen('PauseMain');

	}
	else {
		console.log("********HIDEPAUSESCREEN");
		isPauseVisible = false;
		PauseMenuBox.classList.add("hidden");
		$('#reportPlayerModal').modal('hide');
		engine.call("SetPauseVisible", false);
		if(bHasPartyMember){
			document.getElementById('party-member-container').classList.remove('hidden');
		}
		document.getElementById('hud-center-container').style.opacity = 1;
		document.getElementById('hud-bottom-right-container').classList.remove('blur-element');
		document.getElementById('compass-container').classList.remove('blur-element');
		document.getElementById('hud-bottom-left-container').classList.remove('blur-element');
		document.getElementById('controls-footer').classList.add('hidden');
		engine.call("EnableCoherentInput", false);
		PopScreen();
	}

}

function CreatePauseMenuModal(modalTitle, modalBody, options)
{
	var PauseMenuBox = document.getElementById("pause-menu-box");
	var newModal = PauseMenuModalTemplate.cloneNode(true);
	var newModalContainer = newModal.getElementsByClassName("pause-menu-modal-container")[0];
	var title = newModalContainer.getElementsByClassName("pause-menu-modal-title")[0];
	var body = newModalContainer.getElementsByClassName("pause-menu-modal-body")[0];
	var optionsList = newModalContainer.getElementsByClassName("pause-menu-modal-options")[0];

	title.innerHTML = modalTitle;
	body.innerHTML = modalBody;
	newModal.addEventListener("click", function(event){
		event.stopPropagation();
	});
	for(var i = 0; i < options.length; ++i)	{
		var option = options[i];
		var elem = document.createElement("div");
		elem.classList.add("pause-menu-modal-option");
		elem.innerHTML = option.text;
		if(option.callback != undefined){
			elem.addEventListener("click", option.callback);
		}

		if(option.doesDismiss != undefined && option.doesDismiss == true){
			elem.addEventListener("click", function(modal){
				DebugLog(newModal);
				newModal.remove();
			});
		}
		optionsList.appendChild(elem);
	};

	PauseMenuBox.appendChild(newModal);
}

function TestPausePopup()
{
	var option1 = {};
	option1.text = "Option1";
	option1.callback = function(){
		DebugLog("Clicked Option1");
	};
	option1.doesDismiss = true;
	var options = [option1];
	CreatePauseMenuModal("Test Modal", "Test Modal Body", options);
}

function KeyPressed(key)
{
	DebugLog("Key Pressed " + key);
}

function PauseMenuClicked(option)
{
	DebugLog("Option: " + option);
	if(isInOptionsMenu == true && optionsDirty == true)
	{
		CreatePauseMenuModal("Unsaved Settings",
												"You have unsaved settings. Apply them, or ignore?",
												[
													{ text: "Apply", doesDismiss: true, callback: function(){ OptionsSave(); SwitchPausePane(option); } },
													{ text: "Ignore", doesDismiss: true, callback: function(){ SwitchPausePane(option); } }
												]);
	} else {
		SwitchPausePane(option);
	}
}

function SwitchPausePane(option)
{
	for(var i = 0; i < PauseMenuPanes.length; ++i){
		PauseMenuPanes[i].classList.add("hidden");
	};
	if(option == 3){
		isInOptionsMenu = true;
		engine.call("GetUserSettings");
	} else {
		isInOptionsMenu = false;
		optionsDirty = false;
		if(option == 4){
			CreatePauseMenuModal("Quit",
													"Return to Main Menu?",
													[
														{ text: "Quit", doesDismiss: true, callback: function(){ engine.call("QuitToMainMenu"); } },
														{ text: "Cancel", doesDismiss: true }
													]);
			return;
		}
	}

	PauseMenuPanes[option].classList.remove("hidden");
}

function PauseMenuQuit(option)
{
	if(option == 0){
		PauseMenuPanes[4].classList.add("hidden");
	} else {
		engine.call("JSE_QuitToMainMenu");
	}
}

function DebugLog(msg)
{
	if(ShowDebugMessages == true){
		console.log(msg);
	}
}

BindOptionsScreenFormatters();

$(document).ready(function(){
	setTimeout(function(){
		$(".hud-center-container").css('opacity', '1');
	},1000);

	//ScreenHolder.js

	//ControllerPollingLoop();
	//InitKeyboardEventListener();
	engine.call("UI_Loaded");
	engine.call("IsBindingFinished").then(function(result){
    if(result == true){
      console.log("Shortcutting UI_Loaded, as we've already Bound");
      OnUIBound();
    }
  })
});

engine.on("UIBound", function(){
	console.log("UIBOND HUD.JS");
	OnUIBound();
});

function RefreshPingSetting()
{
  engine.call("GetGameplaySettings").then(function(result){
    if (result.showPing != undefined) {
      pingData.showPing = result.showPing;
			document.getElementById('match-ping').classList.remove("hidden");
    }
		document.getElementById()
  });
}

var UIBound = false;

function OnUIBound()
{
	engine.call("IsConsole").then(function (bIsConsole) {
		console.log("bIsConsole: " + bIsConsole);
		matchData.bIsConsole = bIsConsole;

		SetHasGamepad(bIsConsole);
		OnUIBoundDeferred();
	});
}

function OnUIBoundDeferred()
{
	if(UIBound == true){
		console.warn("UI already bound.");
		return;
	}

	UIBound = true;
	console.log("UIBound");
	InitControlMappings();
	SetToolTips();

	engine.call("IsLocalGame").then(function(isLocal){
		console.log("IsLocalGame: " + isLocal);
		//bIsLocalGame = isLocal;
		offlineGame.bIsLocalGame =  isLocal;
	});

  RefreshPingSetting();
	SetSettingsObject(GameSettings);
	RefreshSpectateMode();
  engine.call("HUDLoaded").then(function(){
		engine.call("GetUserSettings").then(function(){
			$.getJSON('../Localization/hud.json', function(data) {
			  console.log("Loading Localization File: hud.json");
				locDB = data;
				console.log(JSON.stringify(locDB));
				$.getJSON('../ItemJSON/SteamItems.json', function(data){
						console.log("Parsing Steam Item JSON");
						var itemCount = 0;
						for(var i = 0; i < data["items"].length; ++i)
						{
							var itemEntry = data["items"][i];
							if(itemEntry != undefined)
							{
								//console.log("Adding Steam Item: " + itemEntry["itemdefid"]);
								steamItems[itemEntry["itemdefid"]] = itemEntry;
								itemCount++;
							}
						}

						console.log("Number of Steam Items Parsed: " + itemCount);
						$.getJSON('../Localization/FrontEnd.json', function(data) {
						  console.log("Loading Localization File: FrontEnd.json");
							//locDB_frontEnd = data;
							locDB["frontend"] = data;
							rivets.bind($('#controls-footer'), {
						    FooterData: FooterData
						  });
							console.log("footerdata" + JSON.stringify(FooterData));
						    bLocalizationDataLoaded = true;
							engine.call("GetPlayerData").then(function(){
								RedrawWeaponSlots();
								rivets.bind($('#hud-top-left-box'), {
									matchData: matchData,
									pingData: pingData,
									deathData: deathData
								});

								rivets.bind($('#hud-bottom-left-container'), {
										matchData: matchData,
										woundData: woundData
								});

								rivets.bind($('#player-info'), {
									matchData: matchData
								});

								rivets.bind($('#spectator-player-element'),{
										spectatorData: spectatorData,
										wounds: spectatorData.wounds,
										buffs: spectatorData.buffs
								});

								//		rivets.bind($('#party-member-container'),{
								//			partymember: partymember
								//		});

								rivets.bind($('#player-wound-container'),{
									woundData: woundData
								});

								rivets.bind($('#EOMContainer'),{
									deathData : deathData,
									matchData : matchData,
									FooterData : FooterData,
									offlineGame : offlineGame
								});

								rivets.bind($('#challenge-container'),{
									ChallengeData : ChallengeData
								});

								rivets.bind($('#hud-bottom-right-container'),{
									ActionMapDB : ActionMapDB,
									FooterData : FooterData,
									matchData : matchData
								});

								rivets.bind($('#usable-text-container'),{
									ActionMapDB : ActionMapDB
								});

								rivets.bind($('#objective-container'), {
									ObjectiveData : ObjectiveData
								});

								rivets.bind($('#reportPlayer-container'), {
									ReportData : ReportData
								});

								rivets.bind($('#usable-action-text'), {
									ActionMapDB : ActionMapDB
								});
								//console.log("Bottom-Left-Removed");
								document.getElementById("hud-top-left-box").classList.remove("hidden");
								document.getElementById("hud-bottom-left-container").classList.remove("hidden");
								document.getElementById("hud-bottom-right-container").classList.remove("hidden");
								document.body.classList.remove("hidden");
								//console.log(WeaponSlots[0].getAttribute("data-slot-item"));
								WeaponSlots[0].ShowTooltip(WeaponSlots[0].getAttribute("data-slot-item"));
							});
						});
						engine.call("OnRivetsBound");
						/*engine.call("GetCraftingRecipes").then(function(recipes){
							OnGetRecipes(recipes);
						});*/
					});
				});
			});
		});
}

$(document).on('click', '.dropdown-menu-resolution li a', function () {
    GameSettings.res = $(this).text();
		optionsDirty = true;
		OptionsSave();
});

$(document).on('click', '.dropdown-menu-screenmode li a', function () {
    var modeText = $(this).text();
    var modeInt = 0;
    switch(modeText){
      case "Fullscreen":
        modeInt = 0;
        break;
      case "Windowed":
        modeInt = 2;
        break;
      case "Borderless Windowed":
        modeInt = 1;
        break;
    }

    GameSettings.screenMode = modeInt;
		optionsDirty = true;
		OptionsSave();
    event.preventDefault();
});

function OpenSurvey()
{
	setTimeout(function(){
		engine.call("ShowURL", "https://docs.google.com/a/xaviant.net/forms/d/1ONZZpAPIn1n4jQFB-WuiT5HFCKuZjDGNlGqUrVeHDXs/viewform");
	}, 500);
	SetUIModeDisabled();
}

function OnPlayerDied(){
	//console.log("Got On PlayerDied");
	OnTeamMemberDied();
	/*
	SetUIModeEnabled();
	$("#showSurveyModal").modal({backdrop: true} );
	*/
}

$('#showSurveyModal').on('hidden.bs.modal', function () {
    SetUIModeDisabled();
})

function SetUIModeEnabled(){
	engine.call("SetUIModeEnabled", true);
}

function SetUIModeDisabled(){
	engine.call("SetUIModeEnabled", false);
}



var chatDisplay = document.getElementById("chat-display");
var chatInput = document.getElementById("chat-input-container");
var chatInputElem = document.getElementById("chat-input");
var chatLabel = document.getElementById("chat-label");
var chatDisplayTimeout = undefined;

var tagBody = '(?:[^"\'>]|"[^"]*"|\'[^\']*\')*';

var tagOrComment = new RegExp(
    '<(?:'
    // Comment body.
    + '!--(?:(?:-*[^->])*--+|-?)'
    // Special "raw text" elements whose content should be elided.
    + '|script\\b' + tagBody + '>[\\s\\S]*?</script\\s*'
    + '|style\\b' + tagBody + '>[\\s\\S]*?</style\\s*'
    // Regular name
    + '|/?[a-z]'
    + tagBody
    + ')>',
    'gi');

function removeTags(html) {
  var oldHtml;
  do {
    oldHtml = html;
    html = html.replace(tagOrComment, '');
  } while (html !== oldHtml);
  return html.replace(/</g, '&lt;');
}

$('#chat-input').on("keypress", function(event){
	if(event.which == 13 && !event.shiftKey){
		event.preventDefault();
		if($('#chat-input').val() !== ""){
			engine.call("SendChatMessage", $('#chat-input').val());
		}
		engine.call("CloseChatUIFromJS");
		bIsChatVisible = false;
		ShowChatUI(false);
		$('#chat-input').val("");
	};
});

function ClearChatInput(){
	$('#chat-input').val("");
}

function OnMessageReceived(bIsTeammate, name, msg){
	var chatMsg = '<p class=';
	name = removeTags(name);
	msg = removeTags(msg);
	if(bIsTeammate){
		chatMsg = chatMsg + '"chat-msg-team"';
		name = "(TEAM) " + name + ": ";
	} else {
		chatMsg = chatMsg + '"chat-msg-public"';
		name = "(SPECTATOR) " + name + ": ";
	}

	chatMsg = chatMsg + '><b>' + name + '</b>' + msg + '</p>';
	chatDisplay.innerHTML = chatDisplay.innerHTML + chatMsg;

	if(!bIsChatVisible){
		//console.log("Showing Chat Display and starting hide timer");
		ShowChatDisplay();
		SetChatDisplayTimer();
	}

	$('#chat-display').scrollTop($('#chat-display').prop('scrollHeight'));
}

function SetChatDisplayTimer()
{
	clearTimeout(chatDisplayTimeout);
	chatDisplayTimeout = setTimeout(function(){
		//console.log("Hiding Chat Display off timer");
		HideChatDisplay();
		chatDisplayTimeout = undefined;
	}, 5000);
}

function ShowChatDisplay(){
	chatDisplay.classList.remove("chat-display-fadeout");
	chatDisplay.classList.remove("hidden");
	chatDisplay.classList.add("chat-display-fadein");
	$('#chat-display').scrollTop($('#chat-display').prop('scrollHeight'));
}

function HideChatDisplay(){
	chatDisplay.classList.remove("chat-display-fadein");
	chatDisplay.classList.add("chat-display-fadeout");
	chatDisplay.classList.add("hidden");
}

function ShowChatUI(bShouldShow, bIsTeam){
	if(bShouldShow && bIsChatVisible){
		return;
	}
	bIsChatVisible = bShouldShow;

	if(bShouldShow){
		if(chatDisplayTimeout != undefined){
			clearTimeout(chatDisplayTimeout);
		}
		if(bIsTeam != undefined && bIsTeam){
			chatLabel.textContent = "Teammate";
		} else {
			chatLabel.textContent = "Spectators";
		}
		ShowChatDisplay();
		ShowAndFocusChatInput();
		engine.call("EnableCoherentInput", true);
	} else {
		SetChatDisplayTimer();
		HideChatInput();
		engine.call("EnableCoherentInput", false);
	}
}

function HideChatInput(){
	chatInput.classList.remove("chat-input-fadein");
	chatInput.classList.add("chat-input-fadeout");
	chatInput.classList.add('hidden');
}

function ShowAndFocusChatInput(){
	chatInput.classList.add("chat-input-fadein");
	chatInput.classList.remove("chat-input-fadeout");
	chatInput.classList.remove('hidden');
	chatInputElem.focus();
	ClearChatInput();
}

function OnChatInputLostFocus(){
	if(bIsChatVisible){
		//console.log("Trying to call back to the engine to close the Chat HUD");
		engine.call("CloseChatUIFromJS");
		//Don't waste resources waiting for the cleanup and just do it now
		if(chatDisplayTimeout != undefined){
			clearTimeout(chatDisplayTimeout);
		}
		//ShowChatUI(false);
		$("body").focus();
		console.log("OnChatInputLostFocus");
	}
}

var ratingQueue = document.getElementById("airdrop-rating-queue");

var QueuedRatingElements = [];

function RunAirdropNotifyQueue()
{
		if(QueuedRatingElements.length > 0){
			var rating = QueuedRatingElements[0];
			var newElem = document.createElement('div');
			newElem.classList.add("airdrop-rating-notice");
			newElem.innerHTML = '<span class="airdrop-rating-scroll">' + rating.ActivityValue + '</span><p class="airdrop-rating-fade"> ' + rating.ActivityName + '</p>' ;
			if(rating.ActivityValue < 0){
				funcText.classList.add("func-text-negative");
			} else {
				funcText.classList.add("func-text-positive");
			}

			newElem = ratingQueue.appendChild(newElem);

			setTimeout(function(element){
				element.remove();
				funcText.classList.remove("func-text-negative");
				funcText.classList.remove("func-text-positive");
				QueuedRatingElements.splice(0, 1);
				RunAirdropNotifyQueue();
			}, 750, newElem);

			//newElem.classList.add("airdrop-rating-scroll");

		}
}

function NotifyAirdropProgress(ActivityName, ActivityValue){
	var newRating = {};
	newRating.ActivityName = ActivityName;
	newRating.ActivityValue = ActivityValue;

	if(QueuedRatingElements.length > 0){
		QueuedRatingElements.push(newRating);
	} else {
		QueuedRatingElements.push(newRating);
		RunAirdropNotifyQueue();
	}
}

//////////////////////////////
//		 TeamMember HUD				//
//////////////////////////////

//var SSPP = document.getElementById("ss-player-position");
//var SSPP2 = document.getElementById("ss-player-position2");
var PartyBar = document.getElementById("party-member-container");
var PartyMemberName = document.getElementById("party-member-name");
var PartyMemberStamBar = document.getElementById("party-stamina-bar");
var PartyMemberHealthBar = document.getElementById("party-health-bar");

/*SSPP2.addEventListener("webkitAnimationEnd", function(){
		SSPP2.classList.remove("ss-player-position-lowhealth2");
}, false);

function UpdateSSPlayerPosition(x, y, resx, resy, distsq){
	distsq = clamp(1, 6000000, distsq);
	var distWeight = (6000000 - distsq) / 6000000;
	var scaleFactor = clamp(1, 1, 3 * distWeight);
	SSPP.style.webkitTransform = "translate(" + x + "px, " + y + "px) scale(" + scaleFactor + "," + scaleFactor + ")";
	SSPP2.style.webkitTransform = "translate(" + x + "px, " + y + "px) scale(" + scaleFactor + "," + scaleFactor + ")";
}*/

var lastHealth = 0;
var lastStam = 0;
var onHitTimeout = undefined;

function SetTeamMemberStatus(health, maxHealth, stam, maxStam)
{
		//Has our health changed? If not, no point in modifying the DOM
		if(health != lastHealth){
			/*
			if(health < lastHealth){
				//We took Damage
				//SSPP2.classList.add("ss-player-position-lowhealth2");
			}
			lastHealth = health;
			health = Math.ceil(health);
			//Clear styles
			//SSPP.classList.remove("ss-player-position-normal");
			//SSPP.classList.remove("ss-player-position-lowhealth1");
			//SSPP.classList.remove("ss-player-position-dead");
			if(health > 35){
				//SSPP.classList.add("ss-player-position-normal");
			} else if(health > 0){
				//SSPP.classList.add("ss-player-position-lowhealth1");
			} else {
				//SSPP.classList.add("ss-player-position-dead");
			}*/
			PartyMemberHealthBar.style.width = (100 * (health / maxHealth)) + "%";
		}

		if(stam != lastStam){
			lastStam = stam;
			stam = Math.ceil(stam);
			PartyMemberStamBar.style.width = (100 * (stam / maxStam)) + "%";
		}
}

function OnTeamMemberAdded(playername){
	bHasPartyMember = true;
	//SSPP.classList.remove('hidden');
	//SSPP2.classList.remove('hidden');
	PartyBar.classList.remove('hidden');
	document.getElementById("compass-teammember").classList.remove("hidden");
	PartyMemberName.textContent = playername;
	AddGameMessage(playername + " is your Teammate!");
}

function OnTeamMemberDied(){
	bHasPartyMember = false;
	PartyBar.classList.add('hidden');
	document.getElementById("compass-teammember").classList.add("hidden");
	//SSPP.classList.add('hidden');
	//SSPP2.classList.add('hidden');
}

var currLocationEntry = undefined;
var LocationContainer = document.getElementById("location-container");

function ShowLocationUpdate(location)
{
		if(currLocationEntry != undefined){
			currLocationEntry.remove();
			currLocationEntry = undefined;
		}

		var elem = document.createElement("div");
		elem.classList.add("location-entry");
		elem.innerHTML = location;

		elem.addEventListener("webkitAnimationEnd", function(){
			this.remove();
		}, false);
		currLocationEntry = LocationContainer.appendChild(elem);

}

var Crosshairs = [
	document.getElementsByClassName("crosshair-right")[0],
	document.getElementsByClassName("crosshair-left")[0],
	document.getElementsByClassName("crosshair-top")[0],
	document.getElementsByClassName("crosshair-bottom")[0],
	document.getElementsByClassName("crosshair-center")[0],
];

var CrosshairTimer = undefined;

function SetCrosshairAccuracy(val)
{
	var accuracy = val * 520;
	$("#crosshair-right").css({"-webkit-transform" : "translateX(" + accuracy + "%)"});
	$("#crosshair-left").css({"-webkit-transform" : "translateX(-" + accuracy + "%)"});
	$("#crosshair-top").css({"-webkit-transform" : "translateY(-" + accuracy + "%)"});
	$("#crosshair-bottom").css({"-webkit-transform" : "translateY(" + accuracy + "%)"});
}

function CrosshairHitEnemy()
{
	if(CrosshairTimer != undefined){
		return;
	}

	for(var i = 0; i < Crosshairs.length; ++i){
		Crosshairs[i].style.backgroundColor = "red";
	}
	$("#crosshair-hit").css({"opacity" : "1"});
	CrosshairTimer = setTimeout(function(){
		for(var i = 0; i < Crosshairs.length; ++i){
			Crosshairs[i].style.backgroundColor = "white";
		}
		$("#crosshair-hit").css({"opacity" : "0"});
		clearTimeout(CrosshairTimer);
		CrosshairTimer = undefined;
	}, 250);
}
/*
var currAcc = 0;
var isUp = true;
setInterval(function(){
	if(currAcc >= 0.4){
		isUp = false;
	} else if(currAcc <= 0.0){
		isUp = true;
	}
	var inc = 0.025;
	if(!isUp){
		inc = -0.025;
	}

	currAcc = currAcc + inc;
	if(currAcc < 0){
		currAcc = 0;
	}

	SetCrosshairAccuracy(currAcc);
}, 75);
*/

var compassContainer = document.getElementById("compass-container");
var compassImage = document.getElementById("compass-image");
var compassTeamMember = document.getElementById("compass-teammember");
var compassDebug = document.getElementById("compass-debug");
var compassDist = document.getElementById("compass-teammember-dist");

function SetHeading(heading)
{
  var ContainerWidth = compassContainer.offsetWidth;
  var CompassWidth = compassImage.offsetWidth;
  var compassOffset = CompassWidth * -.156;
  //console.log("ContainerWidth: " + ContainerWidth + " CompassWidth: " + CompassWidth);
  var dotHeading = ((-(heading / 360) * (CompassWidth * .6667)) + compassOffset);
  //console.log("Dot Heading: " + dotHeading);
  compassImage.style.left = dotHeading + "px";
}

function UpdateTeamMemberPosition(perc, dir, dotprod, dist)
{
	var adjustedPos = compassContainer.offsetWidth * perc;
	var bTextOff = false;
	if(dotprod <= 0 || adjustedPos > compassContainer.offsetWidth - (compassTeamMember.offsetWidth / 2) || adjustedPos <= 0 - (compassTeamMember.offsetWidth / 3.75)){
		bTextOff = true;
		if(dir > 0){
			adjustedPos = compassContainer.offsetWidth - (compassTeamMember.offsetWidth / 2.75);
		} else {
			adjustedPos = 0 - compassTeamMember.offsetWidth / 2.75;
		}
	}
	if(bTextOff == false) {
		compassDist.textContent = Math.round(dist / 100);
	} else {
		compassDist.textContent = "";
	}
	compassTeamMember.style.left = adjustedPos + "px";
}

//SetHeading(0);
/*
var heading = 0;

setInterval(function(){
  if(heading < 360){
    heading = heading + 1;
  } else {
    heading = 0;
  }

  SetHeading(heading);
}, 10);
*/

//Wounds
function OnWoundsModified(woundList){
	//console.log("Got Wound List: " + JSON.stringify(woundList));
	woundData.Wounds = [];
	woundData.Buffs = [];

	for(var i = 0; i < woundList.length; ++i){
			if(woundList[i].bIsBuff == true){
				woundData.Buffs.push(woundList[i]);
			} else {
				woundData.Wounds.push(woundList[i]);
			}
	}

	woundData.Buffs.sort(SortWounds);
	woundData.Wounds.sort(SortWounds);
}

function SortWounds(a,b)
{
	return b.DurationPerc - a.DurationPerc;
}

function SetDeathData(_deathData, bIsVictory)
{
	console.log("PLAYER NAME: " + matchData.playerName);
	//We can't do a direct copy, because rivets won't pick up the changes
	if (!deathData.bDeathScreenShown) {
	    console.log("_deathData: " + JSON.stringify(_deathData));
		deathData.TimeAlive = Math.floor(_deathData.TimeAlive + 0.5);
		deathData.NumKills = _deathData.NumKills;
		deathData.DamageDone = Math.floor(_deathData.DamageDone + 0.5);
		deathData.KillerName = _deathData.KillerName;
        deathData.KillerLevel = _deathData.KillerLevel;
		deathData.DamageType = _deathData.DamageType;
		deathData.KillerWeapon = _deathData.KillerWeapon;
		deathData.KillerDamage = Math.floor(_deathData.KillerDamage + 0.5);
		deathData.KillerPerks = _deathData.KillerPerks;
		deathData.bWasSuicide = _deathData.bWasSuicide;
		deathData.bWasBackstab = _deathData.bWasBackstab;
		deathData.bWasHeadshot = _deathData.bWasHeadshot;
		deathData.KillerAvatarURL = _deathData.KillerAvatarURL;
		deathData.KillerAirdrop = _deathData.KillerAirdrop;
		deathData.KillerId = _deathData.KillerId;
		deathData.bIsVictory = bIsVictory;
		deathData.FUNC = _deathData.FUNC;
        deathData.DistanceTraveled = _deathData.DistanceTraveled;
        deathData.MatchStartXP = _deathData.MatchStartXP;
	    // This will be updated by NotifyReceivedStatsUpdate deathData.MatchEndXP = 0;
    if (!deathData.bDeathScreenShown) {
      ShowMatchOutcome(bIsVictory);
      deathData.bDeathScreenShown = true;
    }
  }
}

//TODO - Implement this however needed to fill in data for match ending screen
function SetMatchStats(matchStatsJson)
{
	//The C++ has sent us the match stats as a string which should be parsed into JSON
	//aaand do somethign with it HERE!
	console.log("SetMatchStats: " + matchStatsJson);
	var stats = JSON.parse(matchStatsJson);
	console.log("SetMatchStats Parse: " + stats);
	matchStats.playerID = stats.currentMatch.playerID;
	matchStats.nickname = stats.currentMatch.nickname;
	matchStats.placed = stats.currentMatch.placed;
	matchStats.placementPoints = stats.currentMatch.placementPoints;
	matchStats.kills = stats.currentMatch.kills;
	matchStats.killPoints = stats.currentMatch.killPoints;
	matchStats.matchScore = stats.currentMatch.matchScore;

}

function SetTestDeathData(bIsVictory)
{
	console.log("PLAYER NAME: " + matchData.playerName);
	//We can't do a direct copy, because rivets won't pick up the changes
	if(!deathData.bDeathScreenShown){
		deathData.TimeAlive = 120;
		deathData.NumKills = 5;
		deathData.DamageDone = 300;
		deathData.KillerName = "DickToez";
		deathData.DamageType = "Bluntz";
		deathData.KillerWeapon = "357_magnum";
		deathData.KillerDamage = 200;
		deathData.KillerPerks = ["perk1", "perk2", "perk3"];
		deathData.bWasSuicide = false;
		deathData.bWasBackstab = false;
		deathData.bWasHeadshot = false;
		deathData.KillerAvatarURL = "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/4d/4d81cc4bbc397aeab3b0371ebb9d16e593d90652_full.jpg";
		deathData.KillerAirdrop = "ranger";
		deathData.PlayerName = "DickFingerz";
		deathData.bIsVictory = bIsVictory;
		deathData.MatchStartXP = _deathData.MatchStartXP;
		deathData.MatchEndXP = _deathData.MatchEndXP;


		if (!deathData.bDeathScreenShown) {
		    ShowMatchOutcome(bIsVictory);
		    deathData.bDeathScreenShown = true;
		}
	}
}

/*
var EOMContainer = document.getElementById("EOMContainer");
var EOMOutcomeContainer = EOMContainer.getElementsByClassName("endofmatch-outcome-container")[0];
var DeathScreenBlood = EOMContainer.getElementsByClassName("endofmatch-outcome-loser-blood")[0];
var EOMStats = EOMContainer.getElementsByClassName("endofmatch-stats-container")[0];
var EOMMouseOverContainer = EOMContainer.getElementsByClassName("endofmatch-mouseover-container")[0];
var EOMPlayerName = document.getElementById("endofmatch-player-name");
var EOMTable = document.getElementById("endofmatch-table");
var EOMKillerHeader = document.getElementById("endofmatch-killer-header");
var EOMKillerContainer = document.getElementById("endofmatch-killer-container");
var EOMRewardContainer = document.getElementById("endofmatch-reward-container");
var EOMRewardCapsule = document.getElementById("endofmatch-reward-capsule");
var EOMRewardIcon = document.getElementById("endofmatch-reward-icon");
var EOMRewardText = document.getElementById("endofmatch-reward-text");
var EOMRewardAnchor = document.getElementById("endofmatch-reward-anchor");
var EOMRewardItems = document.getElementById("endofmatch-reward-items");
*/

engine.on("SetRewardRank", function(rank){
	deathData.Rank = rank;
});

engine.on("AddMatchRewardByID", function(RewardID){
	AddMatchRewardByID(RewardID);
});

function AddMatchRewardByID(RewardID)
{
	var rewardSteamItem = steamItems[RewardID];
	if(rewardSteamItem == undefined)
	{
		console.log("Undefined reward passed - most likely not in Steam JSON.");
		return;
	}

	var rewardItem = {
		image_url: rewardSteamItem["icon_url_large"],
		name: rewardSteamItem["name"],
		rarity: rewardSteamItem["item_quality"]
	};

	deathData.Rewards.push(rewardItem);
	deathData.bRankTooLow = false;
	console.log("Player awarded item: " + JSON.stringify(rewardItem));
}

function ShowMatchOutcome(bIsVictory)
{
	console.log("Outcome");
	console.log("deathData " + JSON.stringify(deathData));
	console.log(deathData.MatchStartXP);
	HideAllHudElements();
	PushScreen('OutcomeScreen');
	engine.call("EnableCoherentInput", true);
	console.log("scoreData " + scoreData.teams[0]);

    //engine.call("RequestSpectateMode").then(function (bEnterSpectateMode) {
    //    console.log("ShowMatchOutcome " + bEnterSpectateMode);
    //  });

	deathData.bIsVictory = bIsVictory;
    //engine.call("UpdateScoreboard");
	SetUsableVisible(false);
	SetCrosshair('none');

}

function EOMNavigation(button){
	console.log(button);
	var eomScreens = {summaryBtn: EOMSummaryContainer, scoreboardBtn: EOMScoreboardContainer};
	for(var s in eomScreens){
		if(s == button.id){
			eomScreens[s].classList.remove("hidden");
			button.classList.add("tab-focus");
		}else{
			eomScreens[s].classList.add("hidden");
			console.log(s);
			document.getElementById(s).classList.remove("tab-focus");
		}
	}
}

var ItemRollerInterval = undefined;

function RollForReward()
{
	console.log("Roll for Reward");
	if(!EOMContainer.classList.contains("hidden")){
			engine.call("SetUIModeEnabled", true);
		}
	setTimeout(function(){
		EOMRewardContainer.classList.remove("hidden");
		deathData.bShowSpinner = true;
		deathData.bWaitingForReward = false;
		setTimeout(function(){
				//EOMRewardCapsule.classList.remove("hidden");
				//EOMRewardCapsuleRandom.classList.remove("hidden");
				//ItemRollerInterval = setInterval(RollItem, 150);
		}, 1500);
		setTimeout(function(){
			RollItemFinished();
		},6000);
	},1000);

}

var itemRollIdx = 0;

function RollItem()
{
	if(ItemRollerInterval){
		var itemName = deathData.rewardIconSpinnerList[itemRollIdx];
		EOMRewardIcon.style.backgroundImage = "url('../images/customizations/" + itemName + ".png')";
		EOMRewardText.textContent = loc("frontend.customizations." + itemName);
		EOMRewardIcon.style.opacity = 1;
		itemRollIdx = Math.floor((Math.random() * (deathData.rewardIconSpinnerList.length - 1)));

	}
}

function RollItemFinished()
{
	/*
	clearInterval(ItemRollerInterval);
	deathData.bShowSpinner = false;
	if(deathData.Reward == undefined || deathData.Reward == ""){
		EOMRewardText.textContent = "Your Score was too low!";
		EOMRewardIcon.style.opacity = 0;
	} else {
		EOMRewardIcon.style.backgroundImage = "url('../images/customizations/" + deathData.Reward + ".png')";
		EOMRewardText.textContent = loc("frontend.customizations." + deathData.Reward);
	}

	EOMRewardCapsule.classList.add("impact");
	*/
}

engine.on("OnEscapePressed", function(){
	//if(!EOMContainer.classList.contains("hidden")){
	//	OnSpectateClicked();
	//	$('#reportPlayerModal').modal('hide');
	//}
});

//engine.on("ForceDeathScreenClosed", function(){
//	document.getElementById('hud-bottom-center-container').classList.remove("hidden");
//	EOMContainer.classList.add("hidden");
//});

function OnSpectateClicked()
{
	console.log("OnSpectateClicked");
	document.getElementById('hud-bottom-center-container').classList.remove("hidden");
	//document.getElementById('eom-screen-video').classList.add("hidden");
	EOMContainer.classList.add("hidden");
	engine.call('OnHUDCloseDeathScreen');
}

function ShowMatchOutcomeAgain()
{
	if(deathData.bDeathScreenShown){
		document.getElementById('hud-bottom-center-container').classList.add("hidden");
		//document.getElementById('eom-screen-video').classList.remove("hidden");
		EOMContainer.classList.remove("hidden");
		SetUIModeEnabled();
	}
}

function OnReturnToMenuClicked()
{
	console.log("Quit to Main Menu");
	engine.call('QuitToMainMenu');
}

function OnEOMItemMouseOver(item)
{
	EOMMouseOverContainer.textContent = item;
}

function SetMatchReward(reward, rarity)
{
	console.log("Set Match Reward: " + reward + " || Rarity: " + rarity);
	deathData.Reward = reward;
	deathData.RewardRarity = Number(rarity);
	if(deathData.bWaitingForReward == true){
		RollItem();
	}
}

var objectiveContainer = document.getElementById("objective-container");
engine.on("SetObjectiveData", function(ObjTitle, ObjBody){
	console.log("SetObjectiveData" + ObjTitle + " " + ObjBody);
	ObjectiveData.Title = ObjTitle;
	ObjectiveData.Body = ObjBody;
});

engine.on("ShowObjective", function(bShowObj){
	console.log("ShowObjective" + bShowObj);
	if(bShowObj){
		objectiveContainer.classList.remove("obj-hidden");
	} else {
		objectiveContainer.classList.add("obj-hidden");
	}
});

engine.on("AddToast", function(header, text, duration){
	console.log("TOAST");
  if(duration == undefined){
    duration = 10000;
  }

  if(text == undefined){
    text = "";
  }

  if(header == undefined){
    header = "";
  }
    AddToast(header, text, duration);
});

var ToastTemplate = document.getElementById('cloned-elements').getElementsByClassName('toast-object-container')[0];

function AddToast(header, text, duration, icon)
{
	console.log("ADDTOAST");
  var ToastContainer = document.getElementById("toast-container");
  var newToast = ToastTemplate.cloneNode(true);
  var toastHeader = newToast.getElementsByClassName("toast-object-header")[0];
  var toastText = newToast.getElementsByClassName("toast-object-text")[0];
  //var toastIcon = newToast.getElementsByClassName("toast-object-left-image")[0];

  toastHeader.innerHTML = header;
  toastText.innerHTML = text;
  /*if(icon && icon != undefined){
      toastIcon.style.backgroundImage = 'url("' + icon + '")';
  }
	toastIcon.classList.add("hidden");*/
  if(ToastContainer.firstChild){
		ToastContainer.insertBefore(newToast, ToastContainer.firstChild);
	} else {
		newToast = ToastContainer.appendChild(newToast);
	}

  setTimeout(function(element){
		element.classList.add("toast-exit");
    element.classList.remove("toast-enter");
		setTimeout(function(element){
			element.remove();
		}, 500, element);
	}, duration, newToast);
}

function ReportPlayerClicked()
{
	if(offlineGame.bIsLocalGame){
		return;
	}
	ReportData.error = "";
	ReportData.selectedReason = "Other";
	document.getElementById("report-error").classList.add("hidden");
	$('#report-input-box').val("");
	engine.call("GetPlayerList").then(function(playerArray){
		ReportData.playerList = playerArray;
	});
	$("#reportPlayerModal").modal({backdrop: "static", keyboard: false});
}

function ShowReportError(error)
{
	ReportData.error = error;
	document.getElementById("report-error").classList.remove("hidden");
}

$(document).on('click', '.dropdown-menu-report-player li a', function () {
		var selectedOption = {"nickname": this.dataset.nickname, "onlineid": this.dataset.onlineid};
		ReportData.selectedPlayer = selectedOption;
});

$(document).on('click', '.dropdown-menu-report-reason li a', function () {
		ReportData.selectedReason = $(this).text();
});

function SubmitReport()
{
	if($('#report-input-box').val().length == 0){
		ShowReportError("Report can't be empty.");
		return;
	} else if (ReportData.selectedPlayer['onlineid'] == -1){
		ShowReportError("You need to select a player.");
		return;
	}
	engine.call("SendPlayerReport", ReportData.selectedPlayer["onlineid"], $('#report-input-box').val(), ReportData.selectedReason);
	$('#reportPlayerModal').modal('hide');
	setTimeout(function(){
		AddToast("Report Sent!", "", 3000);
	}, 1000);
}

engine.on("AllowPlayerReports", function(){
	if(offlineGame.bIsLocalGame){
		return;
	}
	ReportData.bReportsAllowed = true;
	//document.getElementById("report-player-pause-option").classList.remove("hidden");
	//document.getElementById("report-avail-helper").classList.add("hidden");
});

var ChallengeToastTemplate = document.getElementById('cloned-elements').getElementsByClassName('challenge-toast')[0];
var ChallengeToastContainer = document.getElementById('challenge-toast-container');


function TestChallengeUpdate()
{
	setInterval(function(){
		AddChallengeUpdate({"__Type":"JSChallengeData","bEnabled":true,"Name":"Survive 10","Icon":"survive","Tier":1,"ChallengeType":"Survive","NumberRequired":600,"bPersistent":false,"XPReward":10,"LootReward":"","bIsComplete":false,"Description":"Survive for 10 minutes","Progress":0});
	}, 2000);
}

function AddChallengeUpdate(challenge)
{
  var newToast = ChallengeToastTemplate.cloneNode(true);
  var toastDescription = newToast.getElementsByClassName("challenge-description")[0];
  //var toastIcon = newToast.getElementsByClassName("challenge-icon")[0];
	var toastProgress = newToast.getElementsByClassName("challenge-progress")[0];

	toastDescription.innerHTML = challenge.Description;

  if(challenge.bIsComplete == true)
  {
    newToast.classList.add("complete");
		engine.call("PostSoundEvent", "Play_HUD_ChallengeComplete");
  }
  else
  {
    newToast.classList.add("update");
  }
	console.log(toastProgress);
  //toastIcon.src = GetIconForChallengeType(challenge.ChallengeType);
	toastProgress.innerHTML = rivets.formatters.formatChallengeProgress(challenge);

  if(ChallengeToastContainer.firstChild){
    newToast = ChallengeToastContainer.insertBefore(newToast, ChallengeToastContainer.firstChild);
  } else {
    newToast = ChallengeToastContainer.appendChild(newToast);
  }

  newToast.addEventListener("webkitAnimationEnd", function(){
    this.remove();
    console.log("ChallengeUpdate Destroyed");
  }, false);

}

function GetIconForChallengeType(challengeType)
{
	return "/images/Challenges/Challenge_" + challengeType + ".svg";
}

function toFixed(value, precision) {
    var power = Math.pow(10, precision || 0);
    return (Math.round(value * power) / power);
}

//FORCE A REDRAW WHENEVER THE VIEW SIZE CHANGES! EVERY HUD SHOULD HAVE THIS IN ITS JS!
//BASICHUD SENDS THE EVENT
engine.on("OnViewResized", function(){
  console.log(document.body.style.display);
  document.body.style.display = "none";
  setTimeout(function(){
    document.body.style.display = "";
  },10);
});

engine.on("ShowEOMSummary", function (bShow) {
    console.log("ShowEOMSummary " + bShow);
		while (ScreenStack.length > 0) {
				PopScreen();
		}
    if (bShow) {
        PushScreen("EndOfMatchScreen");
    }
    else {
        PushScreen("SpectateMatch");
    }
});

function NotifyReceivedStatsUpdate(statsJson, _deathData, showXpProgress)
{

	console.log("NotifyReceivedStatsUpdate");
	console.log("Data: " + statsJson);
	console.log("FuncEarned: " + deathData.FUNC);

	deathData.TimeAlive = Math.floor(_deathData.TimeAlive + 0.5);
	deathData.NumKills = _deathData.NumKills;
	deathData.DamageDone = Math.floor(_deathData.DamageDone + 0.5);
	deathData.DamageType = _deathData.DamageType;
	deathData.FUNC = _deathData.FUNC;
	deathData.DistanceTraveled = _deathData.DistanceTraveled;
	deathData.MatchStartXP = _deathData.MatchStartXP;
	deathData.showXpProgress = showXpProgress;

	var stats = JSON.parse(statsJson);

	// Merge these stats locally with our default values
	if (stats.hasOwnProperty("data")) {
		console.log("Merging stats");

		var statsData = stats.data;
		for (var attrName in statsData) {
		    careerStats[attrName] = statsData[attrName];
		}
	}

	// Were any loot crates received?
	if (stats.hasOwnProperty("addedItemData")) {

		var awarded = stats.addedItemData;

		for (var award in awarded) {
			if (award.ItemTypeId == lootCrateID) {
				console.log("Received loot crate");
				lootCratesAwarded += award.QuantityAwarded;
			}
		}
	}

	console.log(JSON.stringify(careerStats));
	console.log(lootCratesAwarded);

    // Do anything visually we need to do (such as, animating that we received a loot crate, or animating progress bars, etc.)
	if (careerStats.hasOwnProperty("xp")) {
	    deathData.MatchEndXP = careerStats.xp;
	    console.log("deathData.MatchEndXP:" + careerStats.xp);
	}

	console.log("deathData.MatchEndXP: " + deathData.MatchEndXP);

	console.log("NotifyReceivedStatsUpdate:: statsJson: " + JSON.stringify(statsJson));
	console.log("NotifyReceivedStatsUpdate:: deathData: " + JSON.stringify(deathData));

	console.log("NotifyReceivedStatsUpdate:: deathData.showXpProgress: " + deathData.showXpProgress);
	//PushScreen("EndOfMatchScreen");
}

function NotifyReceivedStatsFailed()
{
    console.log("NotifyReceivedStatsFailed");
    deathData.MatchEndXP = deathData.MatchStartXP;
    console.log("deathData.MatchEndXP: " + deathData.MatchEndXP);
	deathData.showXpProgress = false;
	//PushScreen("EndOfMatchScreen");
}

// TODO put this back in for objective's on compass. -- SDH
var compassObjective = document.getElementById("compass-objective");
var compassObjectiveDist = document.getElementById("compass-objective-dist");

function UpdateObjectivePosition(perc, dir, dotprod, dist)
{
  /* TODO put this back in for objective's on compass. -- SDH */

	var adjustedPos = compassContainer.offsetWidth * perc;
	var bTextOff = false;
	if(dotprod <= 0 || adjustedPos > compassContainer.offsetWidth - (compassObjective.offsetWidth / 2) || adjustedPos <= 0 - (compassObjective.offsetWidth / 3.75)){
		bTextOff = true;
		if(dir > 0){
			adjustedPos = compassContainer.offsetWidth - (compassObjective.offsetWidth / 2.75);
		} else {
			adjustedPos = 0 - compassObjective.offsetWidth / 2.75;
		}
	}
	if(bTextOff == false) {
		compassObjectiveDist.textContent = Math.round(dist / 100);
	} else {
		compassObjectiveDist.textContent = "";
	}
	compassObjective.style.left = adjustedPos + "px";
}

var compassEnabled = false;

engine.on("UpdateObjectivePosition", function(bEnabled, facing, perc, dotprod, dist) {

/* TODO put this back in for objective's on compass. -- SDH */
  if (bEnabled) {
    if (!compassEnabled) {
      document.getElementById("compass-objective").classList.remove("hidden");
      compassEnabled = true;
    }

    UpdateObjectivePosition(facing, perc, dotprod, dist);
  }
  else {
    if (compassEnabled) {
      document.getElementById("compass-objective").classList.add("hidden");
      compassEnabled = false;
    }
  }
});

engine.on("ShowHideCrouchIcon", function(display){
	var elem = document.getElementById('movement-icon');
	if(display){
		elem.classList.add("crouch-icon");
		elem.classList.remove("walk-icon");
	}
	else{
		elem.classList.remove("crouch-icon");
		elem.classList.add("walk-icon");
	}
});

engine.on("ShowHideSprintIcon", function(display){
	var elem = document.getElementById('movement-icon');
	if(display){
		elem.classList.add("sprint-icon");
		elem.classList.remove("walk-icon");
	}
	else{
		elem.classList.remove("sprint-icon");
		elem.classList.add("walk-icon");
	}
});
