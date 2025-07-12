
var ReportData = {
	selectedPlayer : {onlineid: "-1", nickname: "Click here"},
	playerList : [],
	error : "",
	selectedReason : "Teaming",
	reasonList : ["Teaming", "Cheating", "Toxic Behavior", "Other"]
};

var GameSettings = {};

var spectatorData = {
	name: "",
	health: "",
	stamina: "",
	wounds: [],
	buffs: []
};

var woundData = {
	Wounds : [],
	Buffs : [],
	Armor: 0,
};

// This is the career stats (summed) received after the server updates the stats with the stats provider
// Add default values here so that you don't get undefined errors (the server may not return values for all of these)
var careerStats = {
	damage_Axe: 0,
	damage_Blade: 0,
	damage_Bleed: 0,
	damage_Bludgeon: 0,
	damage_Bow: 0,
	damage_Explosion: 0,
    damage_Fists: 0,
	damage_Gun: 0,
	damage_Other: 0,
	damage_Self: 0,
	damage_Spear: 0,
	damage_Throw: 0,
    damage_Trap: 0,
	funcEarned: 0,
	gamesPlayed: 0,
	kills: 0,
	level: 0,
	minutesAlive: 0,
    mmr: 0,
    mmrUncertainty: 0,
	rank: 0,
	rp: 0,
    rpForNextRank: 0,
	rpTowardsNextRank: 0,
	totalDamage: 0,
	wins: 0,
	xp: 0
};

// This is whether any loot crates were awarded (received at the same time as the careerStats)
var lootCratesAwarded = 0;

var deathData = {
	TimeAlive : 0,
	NumKills : 0,
	DamageDone : 0,
  KillerLevel : "",
	KillerName : "",
	DamageType : "",
	KillerWeapon : "",
	KillerDamage : 0,
	KillerPerks : [],
	bWasSuicide : false,
	bWasBackstab : false,
	bWasHeadshot : false,
	KillerAvatarURL : "",
	PlayerName : "",
	bIsVictory : false,
	bRewardSet : false,
	Reward: "",
	RewardRarity: 0,
	rewardIconSpinnerList : [
		"bodyhoodiecamo_01",
		"bodyhoodiecamo_06",
		"bodyhoodiecamo_07",
		"bodymotorcyclejacketcamo_01",
		"bodymotorcyclejacketcamo_02",
		"bodymotorcyclejacketcamo_07",
		"bodytshirtcamo_01",
		"bodytshirtcamo_02",
		"bodytshirtcamo_07",
		"bodytshirtgraphic_01",
		"bodytshirtgraphic_02",
		"bodytshirtgraphic_07",
		"headbalaclavacamo_01",
		"headbalaclavacamo_02",
		"headbalaclavacamo_03",
		"headbalaclavagraphic_01",
		"headbalaclavagraphic_02",
		"headbalaclavagraphic_03",
		"headbalaclavasolid_01",
		"headbalaclavasolid_03",
		"headbalaclavasolid_04",
		"headbaseballcapcamo_01",
		"headbaseballcapcamo_02",
		"headbaseballcapcamo_04",
		"headbooniehatcamo_01",
		"headbooniehatcamo_03",
		"headbooniehatcamo_05",
		"headbooniehatsolid_01",
		"headbooniehatsolid_05",
	],
	bWaitingForReward : true,
	HeaderText: "",
	KillerAirdrop: "",
	bShowSpinner : false,
	Rank: "",
	KillerId: "",
	Rewards: [],
	bRankTooLow: true,
    bDeathScreenShown: false,
    FUNC: 0,
    showXpProgress: false,
    lowXP: 0,
    highXP: 0,
    playerLevel: 0
}

var matchData = {
    time: 15,
    matchlength: 1500,
	hideTime: false,
	spectating: true,
	matchState: "waiting",
	matchStage: 0,
	matchStatusText: "",
	preMatch: true,
	showStatusText: true,
	statusText: function(){
	    if (this.spectating) {
	        return matchStatusText + "SPECTATING";
	    }
		//} else if (this.preMatch) {
		//	return "TILL MATCH BEGINS";
	    //}
	    return matchStatusText;
	},
	showQuitTip: function(){
		return (this.matchState != "waiting" && this.spectating === true);
	},
	playerName: "unknown",
	playerPerks: [],
	playerAirdrop: "",
	currRating: 12,
	bIsConsole: false,
	accumulatedRating: 0,
	maxRating: 0,
	airdropTimeRemaining: true,
	airdropUsed: false,
	airdropIsAvailable: false,
	gameModeType: ""
	};


var matchStats = {
	playerID:0,
	nickname:"User",
	placed:16,
	placementPoints:0,
	kills:0,
	killPoints:0,
	matchScore:0
};

var offlineGame = {
	bIsLocalGame : true
}

var pingData = {
	showPing: false,
	ping: 0,
	rtt: 0
};

var ObjectiveData = {
	Title: "",
	Body: ""
}

var ChallengeData = {
	Challenges: []
}
