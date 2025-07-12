const ProfileSelector = document.getElementById("profile-menu");
const ProfileNavSelector = document.getElementById("profile-menu-options");

//Add your CSS files here
$('head').append('<link rel="stylesheet" type="text/css" href="css/Screens/Profile.css">');

var ProfileScreenData = {
  ActivePanel : 0,
}

var StatsObject = {
  damage_Axe:{},
  damage_Blade:{},
  damage_Bleed:{},
  damage_Bludgeon:{},
  damage_Bow:{},
  damage_Explosion:{},
  damage_Fists:{},
  damage_Gun:{},
  damage_Other:{},
  damage_Self:{},
  damage_Spear:{},
  damage_Throw:{},
  damage_Trap:{}
}

var StatsArray = {
  array:[]
}

var bIsAbleToClose = false;
var timeOut = undefined;

function ProfileScreen()
{
  BaseMenuScreen.call(this);
  this.Selector = ProfileSelector
  this.ActiveMenu = document.getElementById("profile-menu-options");
  this.ScreenActions = [{value:"Select"}, {value:"Back"}];
  this.ScreenName = "Profile";
}
var profileBinder = rivets.bind($('#profile-menu'), {
  screenData : ProfileScreenData,
  ClientwebData : ClientwebData,
  Matchmaking : Matchmaking,
  StatsArray : StatsArray.array,
  leaderBoard : ClientwebData.LeaderboardData,
  FooterData: FooterData
});
/*
var coopBinder = rivets.bind($('#season-stats-coop-container'), {
  leaderBoard : ClientwebData.LeaderboardData
});
var soloBinder = rivets.bind($('#season-stats-solo-container'), {
  leaderBoard : ClientwebData.LeaderboardData
});
*/

ProfileScreen.prototype = Object.create(BaseMenuScreen.prototype);
ProfileScreen.prototype.constructor = ProfileScreen;

ProfileScreen.prototype.OnShow = function()
{
  timeOut = setTimeout(function(){
    console.log("Leaderboard timeOut");
    ProfileScreen.SetAbleClose();
  }, 20000);
  engine.call("SetStatsCamera");
  BaseMenuScreen.prototype.OnShow.call(this);
  SendGetLeaderboardRequest();
}

ProfileScreen.SetAbleClose = function()
{
  clearTimeout(timeOut);
  console.log("ProfileScreen SetAbleClose");
  bIsAbleToClose = true;
  ProfileScreen.ShowProfileData();
}

ProfileScreen.ShowProfileData = function(){
  GetActiveScreen().TabNavigation = document.getElementById("profile-menu-options").getElementsByClassName('controls-nav-tab');
  profileBinder.update({leaderBoard : ClientwebData.LeaderboardData});
  console.log(JSON.stringify(ClientwebData.LeaderboardData.solo.topTenMatches));
  CreateStatsArray();
  console.log(StatsObject);
  AnimateDamagePercent();
  GetXPRangeByLevel();
  if(GetActiveScreen().TabNavigation){
    GetActiveScreen().SetTabFocus(GetActiveScreen().TabNavigation[0].id);
  }
}

function GetXPRangeByLevel(){
  engine.call("GetLevelXPLow", ClientwebData.Stats.level).then(function(exp){
    ClientwebData.Stats.lowXP = exp;
    engine.call("GetLevelXPHigh", ClientwebData.Stats.level).then(function(exp){
      ClientwebData.Stats.highXP = exp;
      AnimateXPPercent();
    });
  });

}

function AnimateXPPercent() {
  var elem = document.getElementById('ProfileXPPrgressBar');
  var width = 0;
  var percentXP = (ClientwebData.Stats.xp == 0) ? 0 : ((ClientwebData.Stats.xp - ClientwebData.Stats.lowXP) / (ClientwebData.Stats.highXP - ClientwebData.Stats.lowXP)) * 100;
  if(percentXP > 100){
    percentXP = 100;
  }
  var id = setInterval(frame, 10);

  function frame() {
    if (width >= percentXP) {
      clearInterval(id);
    } else {
      width++;
      elem.style.width = width + '%';
    }
  }
}

function CreateStatsArray(){
    StatsObject.damage_Axe.damage = ClientwebData.Stats.damage_Axe == 0 ? 0 : Math.floor((ClientwebData.Stats.damage_Axe / ClientwebData.Stats.totalDamage) * 100);
    StatsObject.damage_Axe.name = "Axe";
    StatsObject.damage_Blade.damage = ClientwebData.Stats.damage_Blade == 0 ? 0 : Math.floor((ClientwebData.Stats.damage_Blade / ClientwebData.Stats.totalDamage) * 100);
    StatsObject.damage_Blade.name = "Blade";
    StatsObject.damage_Bleed.damage = ClientwebData.Stats.damage_Bleed  == 0 ? 0 : Math.floor((ClientwebData.Stats.damage_Bleed / ClientwebData.Stats.totalDamage) * 100);
    StatsObject.damage_Bleed.name = "Bleed";
    StatsObject.damage_Bludgeon.damage = ClientwebData.Stats.damage_Bludgeon == 0 ? 0 : Math.floor((ClientwebData.Stats.damage_Bludgeon / ClientwebData.Stats.totalDamage) * 100);
    StatsObject.damage_Bludgeon.name = "Bludgeon";
    StatsObject.damage_Bow.damage = ClientwebData.Stats.damage_Bow == 0 ? 0 : Math.floor((ClientwebData.Stats.damage_Bow / ClientwebData.Stats.totalDamage) * 100);
    StatsObject.damage_Bow.name = "Bow";
    StatsObject.damage_Explosion.damage = ClientwebData.Stats.damage_Explosion == 0 ? 0 : Math.floor((ClientwebData.Stats.damage_Explosion / ClientwebData.Stats.totalDamage) * 100);
    StatsObject.damage_Explosion.name = "Explosion";
    StatsObject.damage_Fists.damage = ClientwebData.Stats.damage_Fists == 0 ? 0 : Math.floor((ClientwebData.Stats.damage_Fists / ClientwebData.Stats.totalDamage) * 100);
    StatsObject.damage_Fists.name = "Fists";
    StatsObject.damage_Gun.damage = ClientwebData.Stats.damage_Gun  == 0 ? 0 : Math.floor((ClientwebData.Stats.damage_Gun / ClientwebData.Stats.totalDamage) * 100);
    StatsObject.damage_Gun.name = "Gun";
    StatsObject.damage_Other.damage = ClientwebData.Stats.damage_Other == 0 ? 0 : Math.floor((ClientwebData.Stats.damage_Other / ClientwebData.Stats.totalDamage) * 100);
    StatsObject.damage_Other.name = "Other";
    StatsObject.damage_Self.damage = ClientwebData.Stats.damage_Self == 0 ? 0 : Math.floor((ClientwebData.Stats.damage_Self / ClientwebData.Stats.totalDamage) * 100);
    StatsObject.damage_Self.name = "Self";
    StatsObject.damage_Spear.damage = ClientwebData.Stats.damage_Spear == 0 ? 0 : Math.floor((ClientwebData.Stats.damage_Spear / ClientwebData.Stats.totalDamage) * 100);
    StatsObject.damage_Spear.name = "Spear";
    StatsObject.damage_Throw.damage = ClientwebData.Stats.damage_Throw == 0 ? 0 : Math.floor((ClientwebData.Stats.damage_Throw / ClientwebData.Stats.totalDamage) * 100);
    StatsObject.damage_Throw.name = "Throw";
    StatsObject.damage_Trap.damage = ClientwebData.Stats.damage_Trap == 0 ? 0 : Math.floor((ClientwebData.Stats.damage_Trap / ClientwebData.Stats.totalDamage) * 100);
    StatsObject.damage_Trap.name = "Trap";

    for (var weapon in StatsObject) {
      if (StatsObject.hasOwnProperty(weapon)) {
          StatsArray.array.push(StatsObject[weapon]);
      }
    };

    StatsArray.array.sort(function(a,b){
  	  return b.damage - a.damage;
  	});

    var topWeapon = StatsArray.array[0].damage;
    console.log(topWeapon);
    console.log(JSON.stringify(StatsArray));
    StatsArray.array.forEach(function (weapon) {
      weapon.damage = (weapon.damage / topWeapon) * 100;
    });


    console.log(JSON.stringify(StatsArray));
}

function AnimateDamagePercent(){
  StatsArray.array.forEach(function (weapon) {
    var elem = document.getElementById(weapon.name);
    var width = 0;
    if(elem.dataset.damage == null || elem.dataset.damage == undefined || elem.dataset.damage == '')
    {
      elem.dataset.damage = 0;
    }
    var id = setInterval(frame, 10);
    function frame() {
      if (width >= elem.dataset.damage) {
        clearInterval(id);
      } else {
        width++;
        elem.style.width = width + '%';
      }
    }
  });
  console.log(document.getElementById("weapons-progress-container"));
}

ProfileScreen.prototype.OnHide = function()
{
  if (bIsAbleToClose)
  {
    ProfileScreenData.ActivePanel = 0;
    StatsArray.array = [];
    this.ResetTabFocus();
    document.getElementById("loading-leaderboard-container").classList.remove("hidden");
    document.getElementById("leaderboard-menu-options").classList.add("hidden");
    bIsAbleToClose = false;
    BaseMenuScreen.prototype.OnHide.call(this);
  }
}

ProfileScreen.prototype.OnClosed = function()
{
  clearTimeout(timeOut);
  if (bIsAbleToClose)
  {
    ProfileScreenData.ActivePanel = 0;
    StatsArray.array = [];
    this.ResetTabFocus();
    document.getElementById("loading-leaderboard-container").classList.remove("hidden");
    document.getElementById("leaderboard-menu-options").classList.add("hidden");
    bIsAbleToClose = false;
    BaseMenuScreen.prototype.OnHide.call(this);
  }
}

ProfileScreen.prototype.OnCreation = function()
{
  this.OnShow();
  ProfileScreenData.ActivePanel = 0;
}

ProfileScreen.prototype.MouseTabClick = function(elem)
{
  BaseMenuScreen.prototype.MouseTabClick.call(this, elem);
}

ProfileScreen.prototype.OnOptionElemSelected = function(elem)
{
  console.log("ProfScreen optionElemSelected");
  if(elem.dataset && elem.dataset.profileType)
  {
    var profileType = elem.dataset.profileType;
    if(profileType == "global")
    {
      ProfileScreenData.ActivePanel = 0;
    }
    else if(profileType == "ranked")
    {
      ProfileScreenData.ActivePanel = 1;
    }
    else if(profileType == "debug")
    {
      ProfileScreenData.ActivePanel = 2;
    }
    console.log(profileType);
    console.log(document.getElementById(profileType));
  }
}

ProfileScreen.prototype.OnButtonPressed = function(button){
  if(button == btn_Up)
  {
    this.IncrementSelection(-1);
  }
  else if(button == btn_Down)
  {
    this.IncrementSelection(1);
  }

  else if(button == btn_Select)
  {
    console.log("SELECT");

  }
  else if(button == btn_Back && this.CanPopScreen())
  {
    if(bIsAbleToClose)
    {
      PopScreen();
    }
  }
  else if(button == btn_LT)
  {
    console.log("LT");
    this.IncrementTabNav(-1);
  }
  else if(button == btn_RT)
  {
    console.log("RT");
    this.IncrementTabNav(1);
  }
  else if(button == btn_Pause)
  {
    console.log("btn_Pause");
    OpenCurrencyPurchaseWidget();
  }
  //BaseMenuScreen.prototype.OnButtonPressed.call(this, button);
}

//$.extend(ProfileScreen.prototype, HorizontalMenuMixin);

Screens['Profile'] = ProfileScreen;
