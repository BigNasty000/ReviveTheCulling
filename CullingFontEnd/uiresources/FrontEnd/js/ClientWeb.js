const CW_STATUS_UNKNOWN = 0;
const CW_STATUS_CONNECTING = 1;
const CW_STATUS_CONNECTED = 2;
const CW_STATUS_FAILED = 3;
const CW_STATUS_RETRYING = 4;
const CW_STATUS_FAILEDW_RETRY = 5;
const CW_STATUS_AUTHENTICATED = 6;

const PUBLIC_TEST_APPID = "468220";
const NULL_IMAGE = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
const RECONNECT_AUTOMATICALLY = false;

//var httpStatus = require("http-status");

var socketConnection = null;
var bSentInvite = false;
var bCheckDLCAtLogin = false;

var httpStatus = {
    SUCCESS: 200,
    NOT_FOUND: 404,
    SERVICE_UNAVAILABLE: 503
};

var Matchmaking = {
  IsMatchmaking: false,
  IsStartingMatchmaking: false,
  ShowQueueTimeScheduled : false,
  ShowQueueTime : false,
  UseLegacyMatchmaking : false,
  MatchmakingState : "UNKNOWN",
  StartEarly : false,
  LastQueue: undefined,
  AppId: undefined,
  ProductVersion: "0.0.0",
  TimeInQueue: "0",
  AverageQueueTime: 60000,
  PlayersInQueue: 0,
  Rank: -1,
  IsDevBuild: false,
  GoodFilters: [],
  BadFilters: [],

  SetMatchmaking : function(bMatchmaking) {
    Matchmaking.IsMatchmaking = bMatchmaking;
    Matchmaking.ShowQueueTime = bMatchmaking;
    Matchmaking.IsStartingMatchmaking = false;
    if (!bMatchmaking) {
        Matchmaking.PlayersInQueue = 0;
    }

    console.log("SetMatchmaking " + Matchmaking.IsMatchmaking);
  },

    CanStartMatching : function() {
        return Matchmaking.IsStartingMatchmaking == false && Matchmaking.IsMatchmaking == false;
    }
};

var PlayModes = {
  Solo : {
    Elem : document.getElementById("modal-play-choice-ffa"),
    StaticImage : "images/solo_static.png",
    DynamicImage : "images/solo.gif",
    InGroup : false,
    bIsDisabled: true,
    IsDisabled : function() { return PlayModes.Solo.bIsDisabled ||
                                     Friends.InGroup; }
  },
  Lightning: {
    InGroup: false,
    bIsDisabled: true,
    IsDisabled: function () {
      return PlayModes.Lightning.bIsDisabled
        || Friends.InGroup;
    }
  },
  Coop : {
    Elem : document.getElementById("modal-play-choice-coop"),
    StaticImage : "images/coop_static.png",
    DynamicImage : "images/coop.gif",
    bIsDisabled: true
  },
  Practice : {
    Elem : document.getElementById("modal-play-choice-practice"),
    StaticImage : "images/practice_static.png",
    DynamicImage : "images/practice.gif"
  }
};

var ClientwebData = {
  LatestNews : {},
  bIsConnected : false,
  connectionStatus : CW_STATUS_UNKNOWN,
  IsOffline : function() {
    console.log("IsOffline: " + (this.connectionStatus != CW_STATUS_AUTHENTICATED) + " " + this.connectionStatus);
    return (this.connectionStatus != CW_STATUS_AUTHENTICATED);
  },
  IsInQueue : function(matchmaking, lobby) {
    if(matchmaking && !lobby){
      return true;
    }
    return false;
  },
  DC_Pings: {
    'US West': 0,
    'US East' : 0,
    'Europe' : 0,
    'Oceania' : 0
  },
  SelectedDataCenter : "Automatic",
  ActualDataCenter : "",
  OverrideDataCenter : "",
  ShouldOverrideDataCenter : function() {
    if (this.OverrideDataCenter != "")
      return true;

    return false;
  },
  bHasSubsystemPartnerID: false,
  SubsystemPartnerID: "",
  SubsystemIsHost: false,
  IsPublicTestClient: false,
  Challenges : {},
  Stats : {
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
	level: 1,
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
  },
  bIsConsole: false,
  CullCredits: 0,
  PremiumCurrency: 0,
  PendingRealMoneyPurchaseProductID: 0,
  PlayersOnlineCount: 0,
  LeaderboardData: {
    solo:{
	  topWins:[],
	  topKills:[],
      topTenMatches:[],
      tier4TopTen:[],
      tier3TopTen:[],
      tier2TopTen:[],
      tier1TopTen:[],
      tier0TopTen:[],
      currentSeasonTier:{},
      currentSeasonScore:0,
	  currentSeasonWins:0,
	  currentSeasonKills:0
    },
    coop:{
	  topWins:[],
	  topKills:[],
      topTenMatches:[],
      tier4TopTen:[],
      tier3TopTen:[],
      tier2TopTen:[],
      tier1TopTen:[],
      tier0TopTen:[],
      currentSeasonTier:{},
      currentSeasonScore:0,
	  currentSeasonWins:0,
	  currentSeasonKills:0
    },
    updatedTime: undefined
  },
  SeasonSummaryCache: {},//by userID, each entry in this looks just like the leaderboard data for our player above
  Migrated: true, // Assume we are migrated until the clu
  QueuedJoinLobbyCode: ""
};

var PlayerProfileData = {
  UserID: "",
  Nickname : "Unknown",
  Avatar: NULL_IMAGE,
  Teammate: NULL_IMAGE
};

var socketConnection;
var ClientwebRootData = {};
var AuthTicket = "";

var Friends = {
  IAmTheLeader: false,
  InGroup: false,
  MyAvatar: NULL_IMAGE,
  ErrorMessage: "",
  FriendList: [],
  HasFriendOnline : false,
  UpdateHasFriendOnline : function() {
    for (var i = 0; i < this.FriendList.length; i++) {
      if (this.FriendList[i].ResolvedCard) {
        this.HasFriendOnline = true;
        return;
      }
    }
    this.HasFriendOnline = false;
  },
  CurrentPartner: {
    Name: "invite",
    ID: undefined,
    groupID: 0,
    Avatar: NULL_IMAGE,
    CardImagePath: "",
    Level: "",
    Rank: ""
  },
  InviteFrom: {
    Name: undefined,
    ID: undefined,
    groupID: 0,
    Avatar: NULL_IMAGE,
    CardImagePath: "",
    Level: "",
    Rank: ""
  },
  SavedNames: {},
  CardCache: {},
  IsInGroup: function(inGroup, subsystemPartner) {
    console.log("IsInGroup() called. inGroup = " + inGroup + ", subsystemPartner = " + subsystemPartner);
    return (inGroup || subsystemPartner != "");
  },
  IsNotInGroup: function(inGroup, subsystemPartner) {
    console.log("IsNotInGroup() called. inGroup = " + inGroup + ", subsystemPartner = " + subsystemPartner);
    return !this.IsInGroup(inGroup, subsystemPartner);
  }

};

var CanMakeTokenPurchase = true;
var CanMakeCreditPurchase = true;

function TryToResolveCardImageFromCache(friendID)
{
  if (friendID in Friends.CardCache) {
    return Friends.CardCache[friendID];
  }

  return "";
}

var LobbyData = {
    OutstandingRequest: false,
    EnteringCode: false,

    SetIsInLobby : function(bIsInLobby) {
      this.IsInLobby = bIsInLobby;
      console.log("SetIsInLobby " + this.IsInLobby);
      engine.call("UpdateIsInCustomGame", bIsInLobby);
    },

    IsInLobby: false,
    AllowedTeams: [0, 1, 2, 3, 4],
    OpenPlayModalIfNoLobby: false,
    MatchIsStarting: false,

    UpdateDerivedProperties: function () {

        this.CanCreateLobby = (!this.EnteringCode
                            && !this.IsInLobby
                            && !this.OutstandingRequest
                            && !this.MatchIsStarting);

        this.CanJoinLobby = this.CanCreateLobby;

        this.ShowStartMatchButton = false;
        this.CanStartMatch = false;

        if (!this.IsInLobby) {
            this.ShowStartMatchButton = false;
        } else {
            // make sure we know what team we are personally on
            for (var i = 0; i < this.Members.length; ++i) {
                var member = this.Members[i];
                if (LobbyMemberIsMe(member)) {
                    this.MyTeam = member.team;
                    // now that we've found ourself, also check if we are the owner of this lobby
                    //TODO: use steamID instead of nickname to verify identity
                    var IAmTheOwner = IsLobbyOwner(member.user);
                    this.ShowStartMatchButton = IAmTheOwner && !this.MatchIsStarting;
                    this.CanStartMatch = IAmTheOwner && this.Members.length > 1;
                    console.log("ShowStartMatchButton: " + this.ShowStartMatchButton);
                    console.log("IAmTheOwner: " + IAmTheOwner);
                    console.log("CanStartMatch: " + this.CanStartMatch);
                    console.log("CanStartMatch: this.Members.length: " + this.Members.length);
                    console.log("MatchIsStarting: " + this.MatchIsStarting);
                    break;
                }
            }
        }

        this.CanLeave = this.IsInLobby && !this.MatchIsStarting;
    },

    CanCreateLobby: true,
    CanJoinLobby: true,
    ShowStartMatchButton: false,
    CanStartMatch: false,
    CanLeave: false,
    RequestingNewLobby: false,
    JoinCode: null,
    mapIndex: 0,
    Owner: "",
    Code: "",
    Members : []
};

function IsLobbyOwner(UserID) {
    if (UserID == LobbyData.Owner)
    {
        return true;
    }
    if (UserID == "steam:"+LobbyData.Owner) {
        return true;
    }
    if ("steam:"+UserID == LobbyData.Owner) {
        return true;
    }
    if (UserID == "xblive:"+LobbyData.Owner) {
        return true;
    }
    if ("xblive:"+UserID == LobbyData.Owner) {
        return true;
    }

    return false;
}

var ServerInfo = {
  HasInfo: false,
  Online: "loading...",
  InQueue: "loading..."
};

var buildOutOfDate = false;

function GetClientwebRootURL() {
  return $.when(
    engine.call("GetAppID"),
    engine.call("GetClientwebUrl", ClientwebData.ActualDataCenter),
    engine.call("GetClientwebOverride"),
    engine.call("GetClientBuild"),
    engine.call("GetProductVersion")
  ).then(function (appid, url, override, build, productVersion) {
    if (override !== "") {
      $("#debug-info").show();
      $("#clientweb-override").show();
      $("#clientweb-override-url").text(override);
      console.log("Forcing clientweb override: " + override);
      url = override;
    }
    Matchmaking.AppId = appid;
    Matchmaking.ProductVersion = productVersion;
    ClientwebData.IsPublicTestClient = appid == PUBLIC_TEST_APPID;
    Matchmaking.Build = build;
    return url;
  });
}

function ConnectToClientweb(url)
{
  console.log("Loading Root Data, then connecting to ClientWeb");
  return LoadRootData(url).then(function () {
    // news requires root data but not login--do it async here
    //GetLatestNews();
    // login path needs to be on the promise chain
    console.log("Logging in to ClientWeb");
    return DoClientwebLogin();
  });
}

function LoadRootData(url) {
  console.log("LoadRootData from: " + url);
  var headers = {};
  if (ClientwebData && ClientwebData.AuthToken) {
      headers.Authorization = "Bearer " + ClientwebData.AuthToken;
      console.log("LoadRootData::  " + headers.Authorization);
  }

  console.log("LoadRootData::  " + url);
  console.log("LoadRootData::  " + headers);
  console.log("LoadRootData::  " + JSON.stringify(headers));


  return $.ajax({
    type: "GET",
    url: url,
    headers: headers,
    success: LoadRootDataSuccess,
    error: LoadRootDataFail
  });
}

function shallowMerge(objectA, objectB)
{
	var result = { };
	for (var attrName in objectA) { result[attrName] = objectA[attrName]; }
	for (var attrName in objectB) { result[attrName] = objectB[attrName]; }

	return result;
}

function LoadRootDataSuccess(body) {
  console.log("RootData response: " + JSON.stringify(body));
  if (body.avatarUrl) {
    PlayerProfileData.Avatar = body.avatarUrl;
  }

  if(body.challenges != undefined && body.challenges.challengeMap != undefined) {
    ClientwebData.Challenges = body.challenges.challengeMap;
  } else {
    ClientwebData.Challenges = {};
  }

  if (body.hasOwnProperty("stats"))
  {
    console.log("Processing stats: " + JSON.stringify(body.stats));

    var newStats = shallowMerge(ClientwebData.Stats, body.stats);
    ClientwebData.Stats = newStats;
  }

  ClientwebData.bIsCodeRedemptionAvailable = body.redeemSystemOnline;

  return ClientwebRootData = body;
}

function LoadRootDataFail(err) {
  console.log("LoadRootData failed! " + JSON.stringify(err));
  //TODO: we should probably throw up an error box or something...
  //ShowError("Failed to connect to Matchmaking Server.");

  /*
  if (RECONNECT_AUTOMATICALLY) {
    ClientwebData.connectionStatus = CW_STATUS_FAILEDW_RETRY;
    setTimeout(ConnectWebsocketIfNeeded, 30000);
  } else {
    ClientwebData.connectionStatus = CW_STATUS_FAILED;
  }

  ClientwebData.bIsConnected = false;
  */


  OnSocketConnectionClosed();
}

function DoClientwebLogin() {
  if (ClientwebRootData.authenticated) {
    // cool, server says we're already authenticated!
    console.log("Session cookie still valid... continuing without new login");
    ClientwebData.bIsConnected = true;
    ClientwebData.connectionStatus = CW_STATUS_CONNECTED;
    return $.Deferred().resolve().promise();
  }
  if (ClientwebRootData.login === undefined) {
    var msg = "DoClientwebLogin can't find a login URL";
    console.log(msg);
    ShowError("Failed to connect to Matchmaking Server.");
    ClientwebData.bIsConnected = false;
    ClientwebData.connectionStatus = CW_STATUS_FAILED;
    engine.call("SetConnectionStatus", false);
    return $.Deferred().reject(msg).promise();
  }

  console.log("DoClientwebLogin");

  return $.when(
	engine.call("RequestLoginTicket"),
	engine.call("GetCurrentUserId"))
	.then(LoginWithTicket);
}

function DisconnectWebsocket() {
  console.log("DisconnectWebsocket");
  var oldSocket = socketConnection;
  socketConnection = null;
  try {
    if (oldSocket) {
      oldSocket.close();
    }
  } catch (err) {
    ShowError("Disconnected from Matchmaking Server.");
  }
  ClientwebData.connectionStatus = CW_STATUS_FAILED;
  engine.call("SetConnectionStatus", false);
}

var bShowedDummyAuthError = false;
var LoginWithTicketPromise = null;

function LoginWithTicket(ticket, userid) {

  console.log("LoginWithTicket");

  // DummyAuthTicket should only happen when there is no online subsystem active,
  //  for example if running locally on dev machine without steam
  if (ticket === "DummyAuthTicket" && bShowedDummyAuthError == false) {
    console.log("Dummy ticket");
    $("#debug-info").show();
    $("#steam-unavailable").show();
    ShowError("A valid Steam Connection is required to play The Culling.");
    bShowedDummyAuthError = true;
    ClientwebData.bIsConnected = false;
    ClientwebData.connectionStatus = CW_STATUS_FAILED;
    engine.call("SetConnectionStatus", false);
    return $.Deferred().reject().promise();
  }
  if (userid === "xblive:INVALID")
  {
    console.log("Empty ticket or invalid user");
    ClientwebData.bIsConnected = false;
    ClientwebData.connectionStatus = CW_STATUS_FAILED;
    engine.call("SetConnectionStatus", false);
    return $.Deferred().reject().promise();
  }

  console.log("Engine provided ticket " + ticket);
  var authType = GetAuthType();
  console.log("Providing authType: " + authType);
  var postData = {
    ticket: ticket,
    authType: authType,
    appid: Matchmaking.AppId,
    build: Matchmaking.Build,
	userid: userid,
    // tell coherent how to translate this
    __Type: "JSLoginPostData"
  };

  PlayerProfileData.UserID = userid;

  if (authType == "xblive") {
    console.log("LoginWithTicket xblive");

    // xblive only works with C++ calls
    console.log("using c++ login");

    LoginWithTicketPromise = $.Deferred();
    return engine.call("LoginWithTicket", ClientwebRootData.login, postData).then(function() { return LoginWithTicketPromise; });
  } else {
    // however steam only works with js calls because EAC breaks libcurl on PC
    //  after we get an update from EAC, we should be able to use the above C++
    //  call for all platforms
      console.log("using javascript login");
      console.log("ClientwebRootData.login,: " + ClientwebRootData.login);
      console.log("postData: " + JSON.stringify(postData));

    var nextPromise = null;

    return $.ajax({
      method: "POST",
      url: ClientwebRootData.login,
      data: postData,
      success: function (data, status, jqXHR) {
        nextPromise = LoginResponseFromEngine(jqXHR.responseText, ProcessLoginResponse);
      },
      error: function (jqXHR) {
        nextPromise = LoginResponseFromEngine(jqXHR.responseText, ProcessLoginFailure);
      }
    }).then(function() {
      if (nextPromise != undefined && nextPromise != null) {
        return nextPromise;
      }
    });
  }
}

engine.on("LoginSuccess", function (bodyText) {
  console.log("LoginSuccess");
  LoginWithTicketPromise.resolve(LoginResponseFromEngine(bodyText, ProcessLoginResponse));
});

engine.on("LoginFailure", function (bodyText) {
  console.log("LoginFailure");
  LoginWithTicketPromise.resolve(LoginResponseFromEngine(bodyText, ProcessLoginFailure));
});

function LoginResponseFromEngine(bodyText, processFunction) {
  try {
    console.log("LoginResponseFromEngine");

    var body = JSON.parse(bodyText);

    return processFunction(body);
  } catch (ex) {
    console.error("Failed to parse server login response " + ex);
    console.error("Response text was: '" + bodyText + "'");
    ProcessLoginFailure({errorCode: "invalid_server_json"});
    return null;
  }

  return null;
}

function ProcessLoginResponse(body) {

  console.log("ProcessLoginResponse");

  var url = body.redirect;
  ClientwebData.AuthToken = body.token;
  if("userID" in body && "build" in body)
  {
    ClientwebData.userID = body.userID;
    ClientwebData.build = body.build;
  }
  else
  {
    console.log("ProcessLoginResponse got old-style login response");
  }

  console.log("Authenticated: now reloading root data to get the private version");

  return LoadRootData(url).then(function () {
    // after successfully authenticating with clientweb, always attempt to
    //  make a websocket connection
    // TODO: connect lazily
    return ConnectWebsocket();
  });
}

function GetAuthType() {
  return ClientwebData.bIsConsole ? "xblive" : "steam";
}

const UNDEFINED_ERROR = 7;
const EAC_INTERNAL_ERROR = 13;
const STEAM_INTERNAL_ERROR = 22;
const STEAM_REJECTED = 24;
const WRONG_APPID = 37;
const MISSING_TICKET = 41;
const INVALID_SERVER_JSON = 42;
const MAX_LOGINS_REACHED = 43;

function ProcessLoginFailure(body) {
  console.log("login failure..." + JSON.stringify(body));
  ClientwebData.AuthToken = null;

  // ccc HACK: show error on screen for easier debugging
  //ShowGenericError(body.errorCode);
  SetFailedConnectionStatus();
  //return;

  if (body != undefined && body.errorCode != undefined)
  {
    switch (body.errorCode) {
      case "missing_ticket":
        ShowGenericError(MISSING_TICKET);
        SetFailedConnectionStatusNoRetry();
        break;
      case "wrong_appid":
        ShowGenericError(WRONG_APPID);
        SetFailedConnectionStatusNoRetry();
        break;
      case "bad_build":
        buildOutOfDate = true;
        ShowError("Your game client is out of date.  You must exit the game and update before playing online.", true);
        SetFailedConnectionStatusNoRetry();
        break;
      case "eac_error":
        ShowGenericError(EAC_INTERNAL_ERROR);
        SetFailedConnectionStatusNoRetry();
        break;
      case "eac_banned":
      case "pub_banned":
      case "vac_banned":
        ShowError("You have been banned from online play. Please enjoy playing offline.", true);
        SetFailedConnectionStatusNoRetry();
        break;
      case "steam_failed":
        ShowGenericError(STEAM_REJECTED);
        SetFailedConnectionStatusNoRetry();
        break;
      case "steam_unavailable":
        ShowError("Unable to contact Steam servers for authentication.  Please try again later.");
        SetFailedConnectionStatus();
        break;
      case "steam_error":
        ShowGenericError(STEAM_INTERNAL_ERROR);
        SetFailedConnectionStatus();
        break;
      case "invalid_server_json":
        ShowGenericError(INVALID_SERVER_JSON);
        SetFailedConnectionStatusNoRetry();
        break;
      case "max_logins_reached":
        ShowGenericError(MAX_LOGINS_REACHED);
        SetFailedConnectionStatus();
        break;
      default:
        console.error("Unhandled login rejection: " + body.errorCode);
        ShowGenericError(UNDEFINED_ERROR);
        SetFailedConnectionStatus();
    }
  }

  return $.Deferred().reject().promise();
}

function ShowOfflineError(errorCode){
    PopModalByID("Offline");
    var modalArgs = {
      options: ["Retry", "Play Offline"],
      title:"We are currently unable to login to online servers. (Error code: " + errorCode + ")",
      bSupportsBackButton: true,
      modalID: "Offline",
      callback: function(option){
        if (option == "Retry") {
          PopModal();
          ConnectWebsocketIfNeeded();
        }
        else {
          if(GetActiveScreen().ScreenName != "MainMenu"){
            PushScreen("MainMenu");
          }
        }
      }
    };

    PushModal('Modal', modalArgs);
    //CloseConnectingModal(false);

}

function ShowGenericError(errorCode) {
  /*if (errorCode === undefined) {
    errorCode = UNDEFINED_ERROR;
  }
  if(GetActiveScreen().ScreenName == "TitleScreen"){
    ShowOfflineError(errorCode);
  }
  else{
    ShowError("We are currently unable to login to online servers.  Please try again later. (Error code: " + errorCode + ")");
  }*/
  ShowOfflineError(errorCode);
  CloseConnectingModal(false);
}

/**
 * Set failed connection status based on the default reconnection settings.
 */
function SetFailedConnectionStatus() {
  ClientwebData.bIsConnected = false;
  if (RECONNECT_AUTOMATICALLY) {
      ClientwebData.connectionStatus = CW_STATUS_FAILEDW_RETRY;
      engine.call("SetConnectionStatus", false);
      setTimeout(ConnectWebsocketIfNeeded, 30000);
  } else {
      ClientwebData.connectionStatus = CW_STATUS_FAILED;
      engine.call("SetConnectionStatus", false);
  }
}

/**
 * Set failed connection status with no chance of retry (regardless of default
 * settings) for unrecoverable error states where retrying will not help.
 */
function SetFailedConnectionStatusNoRetry() {
  ClientwebData.bIsConnected = false;
  ClientwebData.connectionStatus = CW_STATUS_FAILED;
  engine.call("SetConnectionStatus", false);
}

var bConnectAttemptProcessing = false;

function ConnectWebsocketIfNeeded(doCallback)
{
  doCallback = (typeof doCallback !== 'undefined') ? doCallback : false;

  // For debugging purposes.
  console.trace();

  if (bConnectAttemptProcessing) {
    console.log("Skipping connect attempt. Already processing one.");

    if (socketConnection) {
      console.log("socketConnection was not null. bIsConnected=" + ClientwebData.bIsConnected + ", connectionStatus=" + ClientwebData.connectionStatus);
    }

    if (doCallback) {
      if (ClientwebData.connectionStatus == CW_STATUS_AUTHENTICATED) {
        engine.call("SetConnectionStatus", true);
      }
    }

    return $.Deferred().reject().promise();
  }

  if (socketConnection) {
    console.log("ConnectWebsocketIfNeeded early out (already connected)");
    return $.Deferred().resolve(socketConnection).promise();
  }
  // if we have dropped the socket connection, we always do login from scratch.
  // dropped socket may indicate server restart or other conditions where we
  // can't trust any current state
  console.log("ConnectWebsocketIfNeeded needs to login");
  if(buildOutOfDate == true){
    console.log("Build out of date.");
    ShowError("Your game client is out of date.  You must exit the game and update before playing online.", true);

    if (doCallback) {
      engine.call("SetConnectionStatus", false);
    }

    return $.Deferred().reject().promise();
  }

  console.log("Clientweb connect attempt START");

  bConnectAttemptProcessing = true;

  var connectTimeout = setTimeout(function() {
    console.log("Cancelling connect attempt due to timeout.");
    bConnectAttemptProcessing = false;

    if (socketConnection) { // I am connected (perhaps not logged in.. but still)
    }
    else {
      engine.call("SetConnectionStatus", false);
    }

  }, 15000);

  return GetClientwebRootURL()
      .then(ConnectToClientweb)
      .always(function() {

        clearTimeout(connectTimeout);

        if (!bConnectAttemptProcessing) {
          console.log("Connection attempt was already cancelled.");
        }

        bConnectAttemptProcessing = false;
        console.log("Clientweb connect attempt END connection? " + (socketConnection != null ? "yes" : "no") + " logged in? " + ((ClientwebData.connectionStatus == CW_STATUS_AUTHENTICATED) ? "yes" : "no"));

        if (!ClientwebData.bIsConnected && doCallback) {
          if (doCallback) {
            engine.call("SetConnectionStatus", false);
          }
        }

		engine.call("RedeemTokens");
      });
}

function ConnectWebsocket()
{
  var deferred = $.Deferred();

  if (ClientwebRootData.socket === undefined) {
    console.log("ConnectWebsocket can't find a URL");
    //ShowError("Failed to connect to Matchmaking Server.");
    ClientwebData.connectionStatus = CW_STATUS_UNKNOWN;
    engine.call("SetConnectionStatus", false);
    return deferred.reject().promise();
  }

  console.log("Connecting to websocket at: "+ ClientwebRootData.socket);
  socketConnection = io.connect(ClientwebRootData.socket, {forceNew: true});
  socketConnection.on("connect", function () {
    ClientwebData.bIsConnected = true;
    ClientwebData.connectionStatus = CW_STATUS_CONNECTED;
	  console.log("Socket connected, now waiting for login to be ready.");
  });


  socketConnection.on("login_ready", function () {
      console.log("Socket connected, received login ready, now authenticating and binding events. bIsConnected: " + ClientwebData.bIsConnected);
      if (ClientwebData.bIsConnected)
      {
          setTimeout(function () {// Ugly hack to avoid xhr poll error when connecting web sockets on xbone.
              if (socketConnection != null) {
                BindClientwebEvents(deferred);
              }
          }, 3000);
      }
  });

  socketConnection.on("connect_error", function (err) {
      console.error("connect_error: err.type: " + err.type + " err.description: " + err.description);
      console.error("err: " + err);
      ClientwebData.bIsConnected = false;
      // this means the server's there, but it's probably not listening for websockets
      if (err.description == httpStatus.NOT_FOUND) {
          console.error("Websocket address appears to be wrong; please check the server!");
          ShowError("Failed to connect to Matchmaking Server.");
          OnSocketConnectionClosed();
          ClientwebData.connectionStatus = CW_STATUS_FAILED;
          engine.call("SetConnectionStatus", false);
          deferred.reject();
          return;
      }
      // this usually means the server was shutdown while we were connected
      if (err.description == httpStatus.SERVICE_UNAVAILABLE) {
          console.error("Server appears to have shut down!");
          ShowError("Matchmaking Server was taken offline.");
          ClientwebData.connectionStatus = CW_STATUS_FAILED;
          engine.call("SetConnectionStatus", false);
          OnSocketConnectionClosed();
          deferred.reject();
          return;
      }

      ShowError("Unexpected websocket connect error: " + err.type + " " + err.description);

      ClientwebData.connectionStatus = CW_STATUS_FAILED;
      engine.call("SetConnectionStatus", false);
      OnSocketConnectionClosed();
      deferred.reject();
  });

  socketConnection.on("error", function (err) {
    console.error("generic error: " + err);
    ShowError("Unexpected websocket connect error: " + err);
    ClientwebData.connectionStatus = CW_STATUS_FAILED;
    engine.call("SetConnectionStatus", false);
    OnSocketConnectionClosed();
    deferred.reject();
  });

  socketConnection.on("disconnect", function () {
    console.log("socket disconnected");
    ClientwebData.connectionStatus = CW_STATUS_UNKNOWN;
    engine.call("SetConnectionStatus", false);
    OnSocketConnectionClosed();
    deferred.reject();
  });

  socketConnection.on("server-disconnect", function (data) {
    console.error("server is forcibly disconnecting: ", data.reason);
    ShowError("Server is forcibly disconnecting: " + data.reason);
    ClientwebData.connectionStatus = CW_STATUS_UNKNOWN;
    engine.call("SetConnectionStatus", false);
    OnSocketConnectionClosed();
    deferred.reject();
  });

  var loginTimeout = setTimeout(function() {
    console.log("Cancelling login attempt due to timeout.");
    if (ClientwebData.connectionStatus != CW_STATUS_AUTHENTICATED) {
      deferred.reject();
    }
  }, 30000);

  return deferred.promise().always(function() {

        clearTimeout(loginTimeout);

        if (ClientwebData.connectionStatus != CW_STATUS_AUTHENTICATED) {
          console.log("Reporting login as failed.");
          ClientwebData.bIsConnected = false;
          ClientwebData.connectionStatus = CW_STATUS_FAILED;
          engine.call("SetConnectionStatus", false);
          OnSocketConnectionClosed();
        }
      });
}

function LeaveMatchmaking() {
    if (!LobbyData.IsInLobby)
    {
        console.log("Clientweb leave matchmaking: " + Matchmaking.LastQueue);
        var params = {
            queueName: Matchmaking.LastQueue
        };

        if (IsOnline()) {
            socketConnection.emit("leave-mm", params);
        }
        else {
            console.warn("Attempted to leave matchmaking without socketConnection");
            Matchmaking.IsMatchmaking = false;
        }
        // Commented with out 4/17/2017 XAV SDH: Matchmaking.LastQueue = "";
        var resetNav = GetActiveScreen().GetMenuItems();
        resetNav[1].focus();
    }
}

function CloseConnectingModal(succeeded)
{
  var closedModal = PopModalByID("Connecting");
  console.log(closedModal);
  if (closedModal != null && socketConnection != null && ClientwebData.connectionStatus == CW_STATUS_AUTHENTICATED)
  {
    if (closedModal.screenDesired) {
      console.log(closedModal.screenDesired);

      if(GetActiveScreen().ScreenName != "InvitePlayerScreen") {
        PushScreen(closedModal.screenDesired);
      }
    }
  }
}

function ClosePurchasingModal(succeeded)
{
  PopModalByID("Purchasing");

  var modalArgs = {
    options: ["OK"],
    title: (succeeded ? "Purchase successful." : "Purchase failed."),
    modalID: "Purchase Result",
    needInput: false,
    hideOptions:true
  };
  PushModal('Modal', modalArgs);

  setTimeout(function () {
    PopModalByID("Purchase Result");
  }, 800);

  if (succeeded) {
    engine.call("TriggerPurchaseCompleted");
  }
  else {
    engine.call("TriggerPurchaseFailed");
  }
}

function Test_GoOnline()
{
  ConnectWebsocketIfNeeded();
}

function Test_GoOffline()
{
    ClientwebData.connectionStatus = CW_STATUS_UNKNOWN;
    engine.call("SetConnectionStatus", false);
  OnSocketConnectionClosed();
}

function IsOnline() {
  if (socketConnection != null) {
    if (ClientwebData.connectionStatus == CW_STATUS_AUTHENTICATED) {
      return true;
    }
  }

  return false;
}

function SendCullingCardIfConnected(cardID)
{
  if (IsOnline()) {
    console.log("Sending local card to clientweb: " + cardID);
    socketConnection.emit("set-card", {"cardID": cardID});
  }
}

function fillPlayersTopTenMatches(arr){
  console.log(JSON.stringify(arr));
  if(arr){
    arr.forEach(function (player) {
      //console.log(JSON.stringify(player.topTenMatches.length));
      if(Array.isArray(player.topTenMatches) && player.topTenMatches.length < 10){
        do {
           var match = {};
           match.placed = 0;
           match.matchScore = 0;
           match.kills = 0;
           player.topTenMatches.push(match);
        } while (player.topTenMatches.length < 10);
      }
    });
  }

}

function BindClientwebEvents(deferred) {
    console.log("BindClientwebEvents start " + bCheckDLCAtLogin);
  console.log("Doing Socket Login with auth token: " + ClientwebData.AuthToken);
  if("userID" in ClientwebData && "build" in ClientwebData)
  {
	if(GetAuthType() == "xblive")
	{
		engine.call("GetXboxDLC").then(function(result){
			var loginMsg = {
			  authType:GetAuthType(),
			  token:ClientwebData.AuthToken,
			  userID:ClientwebData.userID,
			  build: ClientwebData.build,
			  bCheckDLC:bCheckDLCAtLogin,
			  dlcEntitlements:result
			};
			console.log("BindClientwebEvents:: " + JSON.stringify(loginMsg));

			socketConnection.emit("login", loginMsg);
		});
	}
	else
	{
		var loginMsg = {
		  authType:GetAuthType(),
		  token:ClientwebData.AuthToken,
		  userID:ClientwebData.userID,
		  build: ClientwebData.build,
		  bCheckDLC:bCheckDLCAtLogin
		};
		console.log("BindClientwebEvents:: " + JSON.stringify(loginMsg));

		socketConnection.emit("login", loginMsg);
	}
  }
  else
  {
    console.log("BindClientwebEvents doing old-style login");
    socketConnection.emit("login", ClientwebData.AuthToken);
  }

  socketConnection.on("entitlements-response", function (msg) {
	  console.log("Received entitlements update: " + JSON.stringify(msg));
	  engine.call("OnReceivedEntitlements", JSON.stringify(msg.data)).then(function() {
	    //GetActiveScreen().RefreshItems();

      engine.call("HasNewCustomizations").then(function(result){
        MainMenuScreenData.bHasNewCust = result;
      });
    });
  });
  socketConnection.on("get-entitlements-fail", function (msg) {
	  console.log("Failed receiving entitlements update: " + msg.reason);
  });
  socketConnection.on("player-response", function (msg) {
	  console.log("Received player data update: " + JSON.stringify(msg.data));

	  var playerData = msg.data;
	  if (playerData.player.premiumCurrency == undefined || playerData.player.premiumCurrency == "") {
	      playerData.player.premiumCurrency = "0";
	  }
	  console.log("Received cull credits: " + playerData.player.cullCredits);
	  console.log("Received premium currency: " + playerData.player.premiumCurrency);


	  // Use the cull credits here.
	  ClientwebData.PremiumCurrency = parseInt(playerData.player.premiumCurrency, 10);
	  ClientwebData.CullCredits = playerData.player.cullCredits != undefined ? playerData.player.cullCredits : 0;
	  if (GetAuthType() == "steam") {
	      ClientwebData.Migrated = playerData.player.migrated;
	      console.log("Setting Migrated: " + ClientwebData.Migrated);
	  }
	  else {
	      ClientwebData.Migrated = true;
	  }
  });
  //PlayersOnlineCount
  socketConnection.on("player-online-response", function (msg) {

    var playerOnlineCountData = msg.data;

    // Use the player online count here.
    ClientwebData.PlayersOnlineCount = playerOnlineCountData;
  });
  socketConnection.on("get-player-fail", function (msg) {
	  console.log("Failed receiving player data update: " + msg.reason);
  });

  //player-leaderboard-response
  socketConnection.on("player-leaderboard-response", function (msg) {
    console.log("Received leaderboard data update: " + JSON.stringify(msg.data));
    console.log("Received leaderboard msg: " + JSON.stringify(msg));

    var leaderboardData = msg.data;
    ClientwebData.LeaderboardData = leaderboardData;

    if (ClientwebData.LeaderboardData == null || ClientwebData.LeaderboardData == undefined)
    {
        ClientwebData.LeaderboardData = {};
        ClientwebData.LeaderboardData.updatedTime = (new Date()).getTime();
        return;
    }
    if (ClientwebData.LeaderboardData.solo == null || ClientwebData.LeaderboardData.coop == null) {
        ClientwebData.LeaderboardData.updatedTime = (new Date()).getTime();
      return;
    }

    ClientwebData.LeaderboardData.updatedTime = (new Date()).getTime();

    /*console.log(ClientwebData.LeaderboardData.solo.topTenMatches.length);*/
    if(Array.isArray(ClientwebData.LeaderboardData.solo.topTenMatches) && ClientwebData.LeaderboardData.solo.topTenMatches.length < 10){
      do {
         var match = {};
         match.placed = 0;
         match.matchScore = 0;
         match.kills = 0;
         ClientwebData.LeaderboardData.solo.topTenMatches.push(match);
      } while (ClientwebData.LeaderboardData.solo.topTenMatches.length < 10);
    }
    if(Array.isArray(ClientwebData.LeaderboardData.coop.topTenMatches) && ClientwebData.LeaderboardData.coop.topTenMatches.length < 10){
      do {
         var match = {};
         match.placed = 0;
         match.matchScore = 0;
         match.kills = 0;
         ClientwebData.LeaderboardData.coop.topTenMatches.push(match);
      } while (ClientwebData.LeaderboardData.coop.topTenMatches.length < 10);
    }
    if(Array.isArray(ClientwebData.LeaderboardData.solo.tier0TopTen) && ClientwebData.LeaderboardData.solo.tier0TopTen.length < 10){
      do {
         var match = {};
         match.playerName = "-";
         match.matchScore = "-";

         ClientwebData.LeaderboardData.solo.tier0TopTen.push(match);
      } while (ClientwebData.LeaderboardData.solo.tier0TopTen.length < 10);
    }
    if(Array.isArray(ClientwebData.LeaderboardData.coop.tier0TopTen) && ClientwebData.LeaderboardData.coop.tier0TopTen.length < 10){
      do {
         var match = {};
         match.playerName = "-";
         match.matchScore = "-";

         ClientwebData.LeaderboardData.coop.tier0TopTen.push(match);
      } while (ClientwebData.LeaderboardData.coop.tier0TopTen.length < 10);
    }
    if(GetActiveScreen().ScreenName == "Leaderboard")
    {
      Leaderboard.SetAbleClose();
      document.getElementById("loading-leaderboard-container").classList.add("hidden");
      document.getElementById("leaderboard-menu-options").classList.remove("hidden");
    }
    else if(GetActiveScreen().ScreenName == "Profile")
    {
      ProfileScreen.SetAbleClose();
      document.getElementById("loading-profile-container").classList.add("hidden");
      document.getElementById("player-profile-main-container").classList.remove("hidden");
    }
    fillPlayersTopTenMatches(ClientwebData.LeaderboardData.solo.tier0TopTen);
    fillPlayersTopTenMatches(ClientwebData.LeaderboardData.coop.tier0TopTen);
    fillPlayersTopTenMatches(ClientwebData.LeaderboardData.solo.tier1TopTen);
    fillPlayersTopTenMatches(ClientwebData.LeaderboardData.coop.tier1TopTen);
    fillPlayersTopTenMatches(ClientwebData.LeaderboardData.solo.tier2TopTen);
    fillPlayersTopTenMatches(ClientwebData.LeaderboardData.coop.tier2TopTen);
    fillPlayersTopTenMatches(ClientwebData.LeaderboardData.solo.tier3TopTen);
    fillPlayersTopTenMatches(ClientwebData.LeaderboardData.coop.tier3TopTen);
    fillPlayersTopTenMatches(ClientwebData.LeaderboardData.solo.tier4TopTen);
    fillPlayersTopTenMatches(ClientwebData.LeaderboardData.coop.tier4TopTen);
    GetActiveScreen().GetMenuItems()[0].focus();
      // leaderboard_ TODO:: Push the leaderboard screen here if we are still on the "refreshing leaderboards" screen.
  });

  socketConnection.on("purchase-success", function (msg) {
	  console.log("Received purchase success notification");

    ClosePurchasingModal(true);

	  var purchaseData = JSON.parse(msg.data);
	  GetActiveScreen().UnlockEntitlement(purchaseData.itemAddData.typeId);
    engine.call("NotifyEntitlementUnlocked", purchaseData.itemAddData.typeId);
  });
  socketConnection.on("purchase-fail", function (msg) {
	  console.log("Failed purchase failed notification");

    ClosePurchasingModal(false);
  });
  socketConnection.on("auth-response", function () {

	  console.log("Socket is authenticated successfully. TransportMode = " + socketConnection.io.engine.transport.name);

	  ClientwebData.connectionStatus = CW_STATUS_AUTHENTICATED;
	  engine.call("SetConnectionStatus", true);

    engine.call("GetLocalPlayerCullingCardID").then(function (cardID) {
      SendCullingCardIfConnected(cardID);

      if (ClientwebData.bIsConsole) {
        if (IsOnline()) {
          console.log("Authed. Retrieved card. Notifying ClientWeb of current subsystem partner \"" + ClientwebData.SubsystemPartnerID +  "\" local user is host: " + ClientwebData.SubsystemIsHost);
          socketConnection.emit("set-ss-partner", {"lobbyPartnerID": ClientwebData.SubsystemPartnerID, "lobbyIsHost": ClientwebData.SubsystemIsHost});
        }
      }
    });

    CloseConnectingModal(true);

    CheckMainMenuStartupModals();

    if (!ClientwebData.bIsConsole)
    {
      engine.call("LoadFriends");
    }
    else
    {
    }

    if (ClientwebData.QueuedJoinLobbyCode != "")
    {
      JoinCustomLobby(ClientwebData.QueuedJoinLobbyCode);
      ClientwebData.QueuedJoinLobbyCode = "";
    }

	deferred.resolve(socketConnection);
  });

  socketConnection.on("open-crate-response", function (msg) {
	 //XAV_TJW, send this response to native so that it can fill out the item descriptions based on the assetids that are returned
	 engine.call("ParseOpenCrateResponse", msg);

    // Send new request for entitlements since we should have received new items from the crates
    GetEntitlements();
  });

  socketConnection.on("open-crate-fail", function (msg) {
	  OnReceivedOpenCrateResponse(msg);

    // Send new request for entitlements (perhaps our crate number was invalid)
    GetEntitlements();
  });

  socketConnection.on("update-average-queue-time", function (averageQueueTime) {
      console.log("Server updated the average queue time to " + averageQueueTime);

      Matchmaking.AverageQueueTime = averageQueueTime;
  });
  socketConnection.on("update-queue-status", function (queueStatus, requestTime) {
      console.log("update-queue-status " + JSON.stringify(queueStatus));
      for(var queueName in queueStatus) {
        var queueActive = false;
        if(queueStatus[queueName].hasOwnProperty("isActive")) {
            queueActive = queueStatus[queueName].isActive;
        }

        switch(queueName){
          case "ffa":
            PlayModes.Solo.bIsDisabled = !queueActive;
            console.log("update-queue-status ffa " + PlayModes.Solo.bIsDisabled);
            break;
          case "coop2":
            PlayModes.Coop.bIsDisabled = !queueActive;
            console.log("update-queue-status coop2 " + PlayModes.Coop.bIsDisabled);
            break;
          case "lightning":
            PlayModes.Lightning.bIsDisabled = true;
            console.log("update-queue-status lightning " + PlayModes.Lightning.bIsDisabled);
            break;
        }
      }
  });
  socketConnection.on("join-mm-ack", function () {
      console.log("Server confirms we are in the matchmaking queue.");
      Matchmaking.SetMatchmaking(true);
      Matchmaking.MatchmakingState = "IN QUEUE";
      StartedMatchmaking();
  });
  socketConnection.on("join-mm-group", function () {
      console.log("Group leader just queued us!");
      Matchmaking.SetMatchmaking(true);
      Matchmaking.MatchmakingState = "IN QUEUE";
      StartedMatchmaking();
  });
  socketConnection.on("leave-mm-ack", function () {
      console.log("Server confirms we left the matchmaking queue.");
      Matchmaking.SetMatchmaking(false);
      StoppedMatchmaking();
  });
  socketConnection.on("leave-mm-group", function () {
      console.log("Group leader has removed us from matchmaking!");
      Matchmaking.SetMatchmaking(false);
      StoppedMatchmaking();
  });
  socketConnection.on("leave-mm-fail", function (msg) {
      console.log("Failed to leave matchmaking.  Error: " + msg.reason);
      ShowError("Failed to leave matchmaking: " + msg.reason);
  });
  socketConnection.on("join-mm-fail", function (msg) {
      console.error("Server says join matchmaking failed: " + msg.reason);
      ShowError("Matchmaking failed: " + msg.reason);
      Matchmaking.SetMatchmaking(false);
      StoppedMatchmaking();
  });
  socketConnection.on("forced-dequeue", function (msg) {
      console.log("Server forced us to leave the matchmaking queue: " + msg.reason);
      Matchmaking.SetMatchmaking(false);
      StoppedMatchmaking();
      switch (msg.reason) {
          default:
            var humanReadableError = "You were removed from the matchmaking queue.  Please try again later.";
      }
      ShowError(humanReadableError);
  });
  socketConnection.on("match-ready", function (msg) {

      if (msg.hasOwnProperty("gameServer") &&
          msg.hasOwnProperty("nonce") &&
          msg.hasOwnProperty("serverNonce")) {

          Matchmaking.MatchmakingState = "JOINING";
          engine.call("PostSoundEvent", "Stop_MenuMusic");
          engine.call("ConnectToServer", msg.gameServer, msg.nonce, msg.serverNonce);
      }
      else {
          console.log("match-ready:: Missing parameter");
          console.log("match-ready:: msg " + JSON.stringify(msg));
          ShowError("Failed to join match.  Missing property.");
      }
  });

  socketConnection.on("group-invite-ack", function () {
      bSentInvite = false
      // server acknowledges we sent an invite, other player has not responded yet
      console.log("group-invite-ack from server");
  });
  socketConnection.on("group-invite-fail", function (msg) {
      console.log("group-invite-fail: " + msg.reason);
      bSentInvite = false
      if (msg.reason == "target-wrong-build") {
        ShowError("Your request could not be sent because that contestant is running a different version of the game.");
      }
      else if (msg.reason == "target-offline") {
        ShowError("Your request could not be sent because that contestant is no longer online.");
      }
      else if (msg.reason == "target-in-queue") {
        ShowError("Your request could not be sent because that contestant is already queued for matchmaking.");
      }
      else if (msg.reason == "in-queue") {
        ShowError("Your request could not be sent because you are already queued for matchmaking.");
      }
      else {
        ShowError("Your request could not be sent because that contestant is not connected or is playing in a different region.");
      }
  });
  socketConnection.on("get-cards-result", function (msg) {
    console.log("Received cards: " + JSON.stringify(msg));
    if (msg.cards != undefined) {
      for (var i = 0; i < msg.cards.length; i++) {
        // Cache the data for future use, maybe
        Friends.CardCache[msg.cards[i].userID] = msg.cards[i].cardID;
        UpdateFriendCardID(msg.cards[i].userID, msg.cards[i].cardID, msg.cards[i].cardLevel, msg.cards[i].cardRank);
      }
    }
  });
  socketConnection.on("incoming-group-invite", function (msg) {
      console.log("incoming-group-invite: " + JSON.stringify(msg));
      if (Friends.InviteFrom.ID !== undefined) {
        console.log("ignoring this invite, because we already had one pending");
        return;
      }

      Friends.InviteFrom.ID = msg.from.userID;
      Friends.InviteFrom.Name = msg.from.userName;
      Friends.InviteFrom.Avatar = msg.from.avatarUrl;
      Friends.InviteFrom.Level = msg.from.cardLevel;
      Friends.InviteFrom.Rank = msg.from.cardRank;
      Friends.InviteFrom.CardID = msg.from.cardID;
      Friends.InviteFrom.groupID = msg.from.groupID;
      Friends.InviteFrom.CardImagePath = TryToResolveCardImageFromCache(Friends.InviteFrom.ID);

      (function (friendID, cardID) {
        engine.call('GetCullingCardImagePathFromID', cardID).then(
          function (imagePath) {
            UpdateFriendCardImage(friendID, imagePath);
          }
        );
      })(Friends.InviteFrom.ID, Friends.InviteFrom.CardID);

      var params = {
        "users": [Friends.InviteFrom.ID]
      };
      socketConnection.emit('get-cards', params);
      console.log("Getting card for player that invited: " + JSON.stringify(params));

      var messageText = Friends.InviteFrom.Name + " has invited you to a group.";

      var modalArgs = {
        options: ["Yes", "No"],
        title: messageText,
        bSupportsBackButton: true,
        modelID: "IncomingGroupInvite",
        callback: function (option) {
          if (option == "Yes") {
            OnAcceptInviteClicked();
          }
          else {
            OnDeclineInviteClicked();
          }
        }
      };

      PushModal('Modal', modalArgs);
  });
  socketConnection.on("group-invite-decline-ack", function () {
      console.log("group-invite-decline-ack");
      Friends.InviteFrom = {};
  });
  socketConnection.on("group-invite-accept-ack", function (msg) {
    console.log("group-invite-accept-ack");
    Friends.IAmTheLeader = false;
    Friends.InGroup = true;

    if (Friends.InviteFrom.groupID == msg.groupID)
    {
      console.log("group-invite-accept-ack:: InviteFrom " + msg.groupID);
      Friends.CurrentPartner = Friends.InviteFrom;
      Friends.InviteFrom = {};
    }
    else
    {
      //console.log("group-invite-accept-ack:: msg " + msg);
      //console.log("group-invite-accept-ack:: msg " + JSON.stringify(msg));
      //console.log("group-invite-accept-ack:: msg.userID " + msg.userID);
      console.log("group-invite-accept-ack:: msg.groupID " + msg.groupID);
      Friends.CurrentPartner.ID = msg.userID;
      Friends.CurrentPartner.Name = Friends.SavedNames[msg.userID];
      Friends.CurrentPartner.groupID = msg.groupID;
      Friends.CurrentPartner.CardID = msg.cardID;
      Friends.CurrentPartner.Level = msg.cardLevel;
      Friends.CurrentPartner.Rank = msg.cardRank;
      Friends.CurrentPartner.CardImagePath = TryToResolveCardImageFromCache(Friends.CurrentPartner.ID);

      if (ClientwebData.bIsConsole && msg.hasOwnProperty("userID")) {
        var noProviderUserID = msg.userID;
        noProviderUserID = noProviderUserID.substring(noProviderUserID.indexOf(":") + 1);
        console.log("Checking for previously resolved name for " + noProviderUserID);

        engine.call("GetCachedSubsystemName", noProviderUserID).then(function(nickname) {
          console.log("Previously resolved name was: " + nickname);
          if (nickname != "") {
            if (Friends.CurrentPartner.ID == msg.userID) {
              console.log("Using previously resolved name");
              Friends.CurrentPartner.Name = nickname;
            }
          }
        });
      }

      var params = {
        "users": [Friends.CurrentPartner.ID]
      };
      socketConnection.emit('get-cards', params);
      console.log("Getting card for partner: " + JSON.stringify(params));
    }
  });
  socketConnection.on("group-invite-accepted", function (msg) {
    console.log("group-invite-accepted: " + JSON.stringify(msg));
    bSentInvite = false
    Friends.CurrentPartner.ID = msg.userID;
    Friends.CurrentPartner.Name = Friends.SavedNames[msg.userID];
    Friends.CurrentPartner.CardID = msg.cardID;
    Friends.CurrentPartner.Level = msg.cardLevel;
    Friends.CurrentPartner.Rank = msg.cardRank;
    Friends.CurrentPartner.groupID = msg.groupID;
    Friends.CurrentPartner.CardImagePath = TryToResolveCardImageFromCache(Friends.CurrentPartner.ID);

    Friends.IAmTheLeader = true;
    Friends.InGroup = true;

    console.log("group-invite-accepted:: msg.userID: " + msg.userID);
    var params = {
      "users": [Friends.CurrentPartner.ID]
    };
    socketConnection.emit('get-cards', params);
    console.log("Getting card for partner: " + JSON.stringify(params));
  });
  socketConnection.on("left-group", function (groupID) {
    // we ignore the param about who left since we only have two person groups
      console.log("left-group groupID: " + groupID);
      console.log("Friends.CurrentPartner.groupID: " + Friends.CurrentPartner.groupID);

    if (Friends.InGroup && Friends.CurrentPartner.groupID == groupID)
    {
        //Friends.CurrentPartner = {Name: "INVITE", Avatar: NULL_IMAGE};
        Friends.InGroup = false;
        Friends.IAmTheLeader = false;
        Friends.CurrentPartner.groupID = 0;
        // if the group changed, the server will have removed us from matchmaking as well
        Matchmaking.SetMatchmaking(false);

    }
  });
  socketConnection.on("player-counts", function(msg) {
    //console.log("player-counts: " + JSON.stringify(msg));
    // don't spam: this message is sent frequently for internal playtest builds
    ServerInfo.HasInfo = true;
    ServerInfo.Online = msg.online;
    ServerInfo.InQueue = msg.inQueue;
  });
  socketConnection.on("get-friends-fail", function(msg) {
    console.log("get-friends-fail");
  });
  socketConnection.on("get-friends-ack", function(clientwebFriendList) {
    console.log("get-friends-ack " + JSON.stringify(clientwebFriendList));
    console.log("locally loaded friends: " + JSON.stringify(Friends.LocalSteamFriends));
    //TODO: do nothing, because this code should not be called currently
    //populateFriends(clientwebFriendList);
  });
  socketConnection.on("lobby-update", function (lobby) {
      CancelCustomGameInviteAcceptModal();

      console.log("lobby-update " + JSON.stringify(lobby));
      console.log("LobbyData.Code = " + LobbyData.Code);

      if ( (lobby.code != null ) && // We were given a good lobby code
          (
                (LobbyData.Code == null || LobbyData.Code == undefined || LobbyData.Code == "") || // We don't already have a lobby code set.
                (LobbyData.Code.toLowerCase() == lobby.code.toLowerCase()) // Our local lobby code matches the lobby code sent.
          )
          )
      {
          Matchmaking.IsMatchmaking = true;
          Matchmaking.MatchmakingState = "IN LOBBY";

          LobbyData.OutstandingRequest = false;
          LobbyData.EnteringCode = false;
          LobbyData.SetIsInLobby(true);
          LobbyData.Code = lobby.code.toUpperCase();
          LobbyData.Owner = lobby.owner;
          LobbyData.mapName = lobby.mapName;
          LobbyData.Members = lobby.members;
          LobbyData.UpdateDerivedProperties();
          //openPlayModalIfWaiting();

          refreshLobbyMemberUsernames();
          updateLobbyData();

          if (IsLobbyOwner(PlayerProfileData.UserID))
          {
            LobbyData.ShowStartMatchButton = !LobbyData.MatchIsStarting;
            LobbyData.CanStartMatch = LobbyData.Members.length > 1;
          }
          else
          {
            LobbyData.ShowStartMatchButton = false;
            LobbyData.CanStartMatch = false;
          }
          if(LobbyData.Members.length > 1){
            document.getElementById("start_btn").classList.remove("start-disabled");
            document.getElementById("start_btn").classList.add("start");
          }
          else{
            document.getElementById("start_btn").classList.add("start-disabled");
            document.getElementById("start_btn").classList.remove("start");
          }
      }
      else{
          console.log("Received unexpected lobby-update");
          // TODO:: Leave the lobby or whatever cleanup is needed.
      }
  });
  socketConnection.on("lobby-update-fail", function (lobby) {
    console.log("lobby-update-fail " + JSON.stringify(lobby));
    // typically this happens because we checked if you're in a lobby, and
    //  you are not
    openPlayModalIfWaiting();
  });
  socketConnection.on("lobby-create-fail", function (err) {
    console.log("lobby-create-fail " + err.reason);
    LobbyData.OutstandingRequest = false;
    LobbyData.RequestingNewLobby = false;
    LobbyData.UpdateDerivedProperties();
    CustomScreen.OnLobbyJoinFail(err);
  });
  socketConnection.on("lobby-leave-ack", function (err) {
      console.log("lobby-leave-ack");
      if (LobbyData.IsInLobby)
      {
          LobbyData.SetIsInLobby(false);
          Matchmaking.IsMatchmaking = false;
      }

    LobbyData.Code = "";
    LobbyData.Owner = null;
    LobbyData.Members = [];
    LobbyData.UpdateDerivedProperties();
  });
  socketConnection.on("lobby-leave-fail", function (err) {
      LobbyData.OutstandingRequest = false;
    console.log("lobby-leave-fail " + err.reason);
  });
  socketConnection.on("lobby-join-fail", function (err) {
      console.log("lobby-join-fail " + err.reason);
      LobbyData.OutstandingRequest = false;
      CustomScreen.OnLobbyJoinFail(err);

      CancelCustomGameInviteAcceptModal();
  });
  socketConnection.on("lobby-change-team-fail", function (err) {
    LobbyData.OutstandingRequest = false;
    console.log("lobby-change-team-fail " + err.reason);
  });
  socketConnection.on("lobby-start-match-fail", function (err) {
    console.log("lobby-start-match-fail " + err.reason);
    ShowError("Private Game failed to start.  Please try again later.");
    LobbyData.MatchIsStarting = false;
    LobbyData.OutstandingRequest = false;
    LobbyData.UpdateDerivedProperties();
  });
  socketConnection.on("redeem-code-ack", function () {
    OnCodeRedemptionSuccess();
  });
  socketConnection.on("redeem-code-fail", function (err) {
    OnCodeRedemptionError(err.message);
  });
  socketConnection.on("players-in-queue", function (msg) {
    OnPlayersInQueueUpdate(msg);
  });
  socketConnection.on("notify-left-queue", function () {
    Matchmaking.SetMatchmaking(false);
  });
  //season-summary-response
  socketConnection.on("season-summary-response", function (msg) {
      ClientwebData.SeasonSummaryCache[msg.userID] = JSON.parse(msg.data);
      console.log(JSON.stringify(ClientwebData.SeasonSummaryCache));
      console.log(GetActiveScreen().ScreenName);
      GetActiveScreen().DisplayPlayersTopTen(msg.userID);
    });
  //season-summary-fail
  socketConnection.on("season-summary-fail", function (err) {
      console.log("season-summary-fail " + err.reason);
    });

    socketConnection.on("purchase-item-fail", function (msg) {
      var modalArgs = {
        options: ["OK"],
        title: msg.message,
        bSupportsBackButton: true,
        modalID: "PurchaseFail",
        needInput: false,
        hideOptions:true
        // callback: function(option){
        //   if (option == "OK") {
        //     console.log("ActiveScreen " + GetActiveScreen().ScreenName);
        //     PopModal();
        //   }
        // }
      };
      ClientwebData.PendingRealMoneyPurchaseProductID = 0;
      PushModal('Modal', modalArgs);
      console.log("purchase-item-fail");
      setTimeout(function () {
        PopModalByID("PurchaseFail");
      }, 800);
    });

    socketConnection.on("purchase-item-success", function (msg) {
       //var modalArgs = {
       //  options: ["OK"],
       //  title: msg.message,
       //  bSupportsBackButton: true,ll
       //  modalID: "PurchaseSuccess",
       //  callback: function(option){
       //    if (option == "OK") {
       //      PopModal();
       //    }
       //  }
       //};

       //PushModal('Modal', modalArgs);
      console.log("purchase-item-success");
    });

    socketConnection.on("purchase-item-authenticated-fail", function (msg) {
      var modalArgs = {
        options: ["OK"],
        title: msg.message,
        bSupportsBackButton: true,
        modalID: "PurchaseAuthFail",
        needInput: false,
        hideOptions:true
        // callback: function(option){
        //   if (option == "OK") {
        //     PopModal();
        //   }
        // }
      };

      PushModal('Modal', modalArgs);
      setTimeout(function () {
        PopModalByID("PurchaseAuthFail");
      }, 800);
      if(GetActiveScreen().ScreenName == "PurchaseWidget")
      {
        PurchaseWidget.ShowPendingModal(false);
      }
      ClientwebData.PendingRealMoneyPurchaseProductID = 0;
      console.log("purchase-item-authenticated-fail");
    });

    socketConnection.on("purchase-item-authenticated-success", function (msg) {

      var modalArgs = {
        options: ["OK"],
        title: msg.message,
        bSupportsBackButton: true,
        modalID: "PurchaseAuthSuccess",
        needInput: false,
        hideOptions:true
        // callback: function(option){
        //   if (option == "OK") {
        //     PopModal();
        //   }
        // }
      };

	  GetEntitlements();
      PushModal('Modal', modalArgs);
      setTimeout(function () {
        PopModalByID("PurchaseAuthSuccess");
      }, 800);
      if(GetActiveScreen().ScreenName == "PurchaseWidget")
      {
        PurchaseWidget.ShowPendingModal(false);
      }
      ClientwebData.PendingRealMoneyPurchaseProductID = 0;
      console.log("purchase-item-authenticated-success");
    });

    socketConnection.on("premium-purchase-fail", function (msg) {
      CanMakeTokenPurchase = true;
      var modalArgs = {
        options: ["OK"],
        title: msg.message,
        bSupportsBackButton: true,
        modalID: "PremiumPurchaseFail",
        needInput: false,
        hideOptions:true
        // callback: function(option){
        //   if (option == "OK") {
        //     PopModal();
        //   }
        // }
      };

      PushModal('Modal', modalArgs);
      setTimeout(function () {
        PopModalByID("PremiumPurchaseFail");
      }, 800);
      console.log("premium-purchase-fail");
    });

    socketConnection.on("premium-purchase-success", function (msg) {
      CanMakeTokenPurchase = true;
      var modalArgs = {
        options: ["OK"],
        title: msg.message,
        bSupportsBackButton: true,
        modalID: "PremiumPurchaseSuccess",
        needInput: false,
        hideOptions:true
        // callback: function(option){
        //   if (option == "OK") {
        //     PopModal();
        //     if(GetActiveScreen().ScreenName == "StorePreview")
        //     {
        //       PopScreen();
        //     }
        //   }
        // }
      };

	  var itemData = JSON.parse(msg.data);
	  for (var i = 0; i < itemData.items.length; i++)
	  {
		GetActiveScreen().UnlockEntitlement(itemData.items[i]);
		engine.call("NotifyEntitlementUnlocked", itemData.items[i]);
	  }

	  GetEntitlements();
      PushModal('Modal', modalArgs);
      setTimeout(function () {
        PopModalByID("PremiumPurchaseSuccess");
        if(GetActiveScreen().ScreenName == "StorePreview")
        {
          PopScreen();
        }
      }, 800);
      console.log("premium-purchase-success");
    });

    socketConnection.on("update-premium-currency", function (value) {
        console.log("update-premium-currency: " + value);
        value = parseInt(value, 10);
      if(value >= 0)
      {
          ClientwebData.PremiumCurrency = value;
          console.log("PremiumCurrency: " + ClientwebData.PremiumCurrency);
      }

    });

    socketConnection.on("inventory-types-response", function (msg) {
        console.log("got inventory-types-response");
        engine.call("OnInventoryResponse", JSON.stringify(msg));
    });

    // seems to be when an up to date version is passed
    socketConnection.on("get-inventory-types-fail", function (msg) {
        console.log("get-inventory-types-fail");
        engine.call("OnInventoryResponseFail", JSON.stringify(msg));
    });

    socketConnection.on("premium-types-response", function (msg) {
        console.log("got premium-types-response");
        engine.call("OnPremiumResponse", JSON.stringify(msg));
    });

    socketConnection.on("get-premium-types-fail", function (msg) {
        console.log("get-premium-types-fail");
        engine.call("OnPremiumResponseFail", JSON.stringify(msg));
    });

	socketConnection.on("check-dlc-items-success", function() {
		console.log("check-dlc-items-success");
		GetEntitlements();
	});

  console.log("BindClientwebEvents ends");
}

engine.on("TriggerGetEntitlements", function () {
  GetEntitlements();
});

function OnPlayersInQueueUpdate(msg) {
    // console.log("OnPlayersInQueueUpdate: " + msg.count);
    Matchmaking.PlayersInQueue = msg.count;
}

function CreateCustomLobby(defaultMapName) {
  if (!LobbyData.OutstandingRequest)
  {
    engine.call("GetLocalPlayerCullingCardID").then(function (cullCardID) {
      ConnectWebsocketIfNeeded().then(function () {
        if(IsOnline()) {
          console.log("Requesting to create private lobby...");
          LobbyData.OutstandingRequest = true;
          LobbyData.UpdateDerivedProperties();

          socketConnection.emit("lobby-create", { cullingcard: cullCardID, mapName: defaultMapName });
        }
        else {
          console.warn("Cannot create private lobby without socketConnection");
        }
      });
    });
  }
}


function SetLobbyMap(mapName) {
    LobbyData.mapName = mapName;
    if (!LobbyData.OutstandingRequest) {
        ConnectWebsocketIfNeeded().then(function () {
            if (IsOnline() && IsLobbyOwner(PlayerProfileData.UserID)) {
                console.log("Requesting to set lobby map: " + mapName);
                LobbyData.OutstandingRequest = true;
                socketConnection.emit("lobby-set-map", { mapName: mapName });
            }
            else {
                console.warn("Not online or not lobby owner.");
                console.warn("   LobbyData.Owner: " + LobbyData.Owner);
                console.warn("   PlayerProfileData.UserID: " + PlayerProfileData.UserID);

            }
        });
    }
}

function JoinCustomLobby(lobbyCode)
{
  if (!LobbyData.OutstandingRequest) {
    engine.call("GetLocalPlayerCullingCardID").then(function (cullCardID) {
      lobbyCode = lobbyCode.toLowerCase();
      console.log("JoinCustomLobby lobbyCode:" + lobbyCode);
      ConnectWebsocketIfNeeded().then(function () {
        if(IsOnline()) {
          LobbyData.OutstandingRequest = true;
          socketConnection.emit("lobby-join", { code: lobbyCode, cullingcard: cullCardID });
        }
        else {
          console.warn("Cannot join custom lobby without socketConnection");
          ShowCustomGameInviteAcceptFailure("Could not establish connection to join custom game.");
        }
      });
    });
  }
  else {
    console.log("JoinCustomLobby:: OutstandingRequest for: " + lobbyCode);
  }
}

function LeaveLobby()
  {
  ConnectWebsocketIfNeeded().then(function () {
    if(IsOnline()) {
      console.log("Requesting to leave private lobby...");
      LobbyData.OutstandingRequest = false;
      LobbyData.EnteringCode = false;
      if (LobbyData.IsInLobby)
      {
          LobbyData.SetIsInLobby(false);
          Matchmaking.IsMatchmaking = false;
      }

      LobbyData.Code = "";
      LobbyData.Owner = null;
      LobbyData.Members = [];
      LobbyData.UpdateDerivedProperties();
      socketConnection.emit("lobby-leave");
    }
    else {
      console.warn("Requesting to leave private lobby socketConnection");
    }
  });
}


function GetEntitlements()
{
  ConnectWebsocketIfNeeded().then(function () {
    if (IsOnline()) {
      console.log("Requesting entitlements...");
      socketConnection.emit("get-entitlements");
    }
  });
}

function SendOpenCrateRequest()
{
  ConnectWebsocketIfNeeded().then(function () {
    if (IsOnline()) {
      console.log("Sending open crate request");
      socketConnection.emit("open-crate");
    }
    else {
      console.warn("Cannot open crate without socketConnection");
    }
  });
}

function SendPlayerSeasonSummaryRequest(otherUserID)
{
  ConnectWebsocketIfNeeded().then(function () {
    if (IsOnline()) {
      console.log("Sending player season summary request");
      var params = {
        userID: otherUserID
      };
      socketConnection.emit("get-season-summary", params);
    }
    else {
      console.warn("Cannot get player season summary without socketConnection");
    }
  });
}

engine.on("SendRedeemTokens", function(consumableList){
  console.log("SendRedeemTokens");
  ConnectWebsocketIfNeeded().then(function () {

	if (IsOnline()) {
	  var params = {
		tokens: consumableList
	  };

	  console.log("Consumable list " + JSON.stringify(params));

	  socketConnection.emit("redeem-tokens", params);
	}
	else {
	  console.warn("Cannot SendRedeemTokens request without socketConnection");
	}
  });
});

engine.on("SendPremiumPurchaseRequest", function(otherPlayerId, otherItemId, otherQuantity, bundle){
    console.log("SendPremiumPurchaseRequest");
    if(CanMakeTokenPurchase)
    {
      ConnectWebsocketIfNeeded().then(function () {

        if (IsOnline()) {
            console.log("Sending premium purchase request");
            console.log("    otherPlayerId = " + otherPlayerId);
            console.log("    otherItemId = " + otherItemId);
            console.log("    otherQuantity = " + otherQuantity);
            console.log("    bundle = " + bundle);

          var params = {
    		playerId: otherPlayerId,
    		itemId: otherItemId,
    		quantity: otherQuantity,
            bundle: bundle
          };
          CanMakeTokenPurchase = false;
          socketConnection.emit("premium-purchase", params);
        }
        else {
          console.warn("Cannot send premium purchase request without socketConnection");
        }
      });
    }

});

engine.on("PurchaseRealMoneyItem", function (steamId, appId, language, currency, itemId, itemName) {
    console.log("PurchaseRealMoneyItem!");

	ConnectWebsocketIfNeeded().then(function () {
    if (IsOnline()) {
      console.log("Sending purchase request");
      var params = {
		steamId: steamId,
		appId: appId,
		itemCount: "1",
		language: language,
		currency: currency,
		itemId: itemId,
		quantity: "1",
		description: itemName
      };
      socketConnection.emit("purchase-item", params);
    }
    else {
      console.warn("Cannot send purchase request without socketConnection");
    }
  });
});

engine.on("SendCheckDLCItems", function(dlc){
	console.log("SendCheckDLCItems");

	ConnectWebsocketIfNeeded().then(function () {
    if (IsOnline()) {
      console.log("Checking DLC items");

	  var params = {
		dlcEntitlements: dlc
      };
      socketConnection.emit("check-dlc-items", params);
    }
    else {
      console.warn("Cannot send check DLC items request without socketConnection");
    }
  });
});

function SendPurchaseAuthenticated(otherAppId, otherOrderId)
{
	ConnectWebsocketIfNeeded().then(function () {
    if (IsOnline()) {
      console.log("Sending purchase authenticated " + otherOrderId);
      var params = {
		orderId: otherOrderId,
		appId: otherAppId
      };
      socketConnection.emit("purchase-item-authenticated", params);
    }
    else {
      console.warn("Cannot send purchase authenticated without socketConnection");
    }
  });
}

function SendPurchaseEntitlementRequest(entitlementID)
{
  ConnectWebsocketIfNeeded().then(function () {
    if (IsOnline()) {
      var modalArgs = {
        options: ["OK"],
        title: "Purchasing...",
        modalID: "Purchasing"
      };
      PushModal('Modal', modalArgs);

      console.log("Sending purchase entitlement request...");
      socketConnection.emit("purchase-entitlement", { entitlementID: entitlementID } );
    }
    else {
      console.warn("Cannot send purchase entitlement request without socketConnection");
    }
  });
}

function populateFriends(clientwebFriendList) {
  var friendList = [];
  for (var i = 0; i < Friends.LocalSteamFriends.length; ++i) {
    var localFriend = Friends.LocalSteamFriends[i];
    var sameRegion = clientwebFriendList.indexOf(localFriend.FriendID) > -1;
    var otherRegion = localFriend.IsPlayingThisGame && !sameRegion;

    //TODO: temporary hack since we cannot load friends on the server
    sameRegion = true;
    otherRegion = false;

    var backendID = GetAuthType() + ":" + localFriend.FriendID;

    friendList.push({
      FriendName: localFriend.FriendName,
      FriendID: backendID,
      AvatarPngData: localFriend.AvatarPngData,
      SameRegion: sameRegion,
      OtherRegion: otherRegion,
      ResolvedCard: false,
      CardID: "",
      CardLevel: "",
      CardRank: "",
      CardImagePath: TryToResolveCardImageFromCache(backendID)
    });
  }

  Friends.FriendList = friendList;
  Friends.UpdateHasFriendOnline();

  ConnectWebsocketIfNeeded().then(function() {
    if (IsOnline()) {
      var playerIDs = [];
      for (var i = 0; i < Friends.FriendList.length; i++) {
        playerIDs.push(Friends.FriendList[i].FriendID);
      }
      var params = {
        "users": playerIDs
      };
      socketConnection.emit('get-cards', params);
      console.log("Getting cards for: " + JSON.stringify(params));
    }
  });

  /*
  for (var i = 0; i < Friends.FriendList.length; i++) {
    // Since this is asynchronous (engine.call) this could have undesired behavior depending on timing (if FriendList is modified twice), but unlikely, so acceptable for now
    console.log("Getting image for " + Friends.FriendList[i].CardID);

    (function (friendIndex) {
      engine.call('GetCullingCardImagePathFromID', Friends.FriendList[friendIndex].CardID).then(
        function (imagePath) {
          ResolveFriendImage(friendIndex, imagePath)
        }
      );
    })(i);
  }
  */
}

function UpdateFriendCardID(friendID, cardID, cardLevel, cardRank) {
  for (var i = 0; i < Friends.FriendList.length; i++) {
    if (Friends.FriendList[i].FriendID == friendID) {
      Friends.FriendList[i].CardID = cardID;
      Friends.FriendList[i].CardLevel = cardLevel;
      Friends.FriendList[i].CardRank = cardRank;
    }
  }

  engine.call('GetCullingCardImagePathFromID', cardID).then(
    function (imagePath) {
      UpdateFriendCardImage(friendID, imagePath);
    }
  );
}

function UpdateFriendCardImage(friendID, imagePath) {
  console.log("Setting card image path to: " + imagePath);

  console.log("FriendID: " + friendID);
  console.log("FriendList: " + JSON.stringify(Friends.FriendList));

  for (var i = 0; i < Friends.FriendList.length; i++) {
    if (Friends.FriendList[i].FriendID == friendID) {
      Friends.FriendList[i].CardImagePath = imagePath;
      Friends.FriendList[i].ResolvedCard = true;
    }
  }

  if (Friends.CurrentPartner.ID == friendID) {
    Friends.CurrentPartner.CardImagePath = imagePath;
  }

  if (Friends.InviteFrom.ID == friendID) {
    Friends.InviteFrom.CardImagePath = imagePath;
  }

  Friends.UpdateHasFriendOnline();
}

function openPlayModalIfWaiting() {
  //if (LobbyData.OpenPlayModalIfNoLobby) {
  //  LobbyData.OpenPlayModalIfNoLobby = false;
  //  if (LobbyData.IsInLobby) {
  //    openPrivateLobbyWindow();
  //  } else {
  //    // no special instructions: go to the normal play modal
  //    $("#playModal").modal({backdrop: true, keyboard: true});
  //  }
  //}
}

function LobbyMemberIsMe(lobbyMember) {

    if (lobbyMember)
    {
        if (PlayerProfileData.UserID == lobbyMember.user) {
            return true;
        }

        if (PlayerProfileData.UserID == "steam:" + lobbyMember.user) {
            return true;
        }

        if ("steam:" + PlayerProfileData.UserID == lobbyMember.user) {
            return true;
        }
    }
    return false;
}

function QueueMatchmaking(GameType)
{
  if(Matchmaking.IsStartingMatchmaking == true)
  {
    return Matchmaking.IsMatchmaking;
  }
  return $.when(GameType, engine.call("RequestLoginTicket"), PlayerProfileData.UserID).then(DoQueueMatchmaking);
}

function DoQueueMatchmaking(GameType, ticket, userid)
{
  Matchmaking.IsStartingMatchmaking = true;
  return $.when(ConnectWebsocketIfNeeded().then(function () {
      if (IsOnline()) {
        Matchmaking.LastQueue = GameType;
        console.log("Requesting to join matchmaking...");

        //We're matchmaking once we try to queue - this way we can show
        //a queuing message if the actual server ack is running slow
        Matchmaking.SetMatchmaking(true);
        Matchmaking.MatchmakingState = "QUEUING";
        var authType = GetAuthType();

        if(authType == "steam")//in this case we want the provider on the front of the id, by default steam doesnt do it
        {
         // userid = authType + ":" + userid;
        }

        var goodFilterStr = "";
        if(Matchmaking.GoodFilters.length > 0)
        {
          goodFilterStr = Matchmaking.GoodFilters.join("|");
        }

        var badFilterStr = "";
        if(Matchmaking.BadFilters.length > 0)
        {
          badFilterStr = Matchmaking.BadFilters.join("|");
        }

        console.log("Engine provided ticket " + ticket);
        console.log("Engine provided userid " + userid);

        console.log("Providing authType: " + authType);
        var postData = {
          ticket: ticket,
          authType: authType,
          appid: Matchmaking.AppId,
          build: Matchmaking.Build,
          userid: userid,
          queuename: GameType,
          goodfilters: goodFilterStr,
          badfilters: badFilterStr,
          // tell coherent how to translate this
          __Type: "JSMatchQueuePostData"
        };

        console.log("using c++ MatchQueueWithTicket postData: " + JSON.stringify(postData));
        engine.call("MatchQueueWithTicket", ClientwebRootData.matchqueue, postData);
      }
      else {
        Matchmaking.IsStartingMatchmaking = false;
      }
    })).then(function(){
    return Matchmaking.IsMatchmaking;
  });
}

engine.on("QueueSuccess", function (bodyText) {
  console.log("QueueSuccess got bodyText: " + bodyText);
});

engine.on("QueueFailure", function (bodyText) {
  console.log("QueueFailure!!! bodyText:" + bodyText);
  LeaveMatchmaking();//something went wrong, they are not allowed to do matchmaking
});

function OnSocketConnectionClosed()
{
  console.log("OnSocketConnectionClosed()");
  try {
    if (socketConnection) {
      socketConnection.io.disconnect();
    }
  } catch (err) {
    // don't care--probably it's already closed
  }

  Matchmaking.SetMatchmaking(false);

  LobbyData.SetIsInLobby(false);
  LobbyData.MatchIsStarting = false;
  LobbyData.OutstandingRequest = false;
  LobbyData.UpdateDerivedProperties();

  ClientwebRootData = {};
  AuthTicket = "";
  socketConnection = null;
  ClientwebData.bIsConnected = false;
  Friends.InGroup = false;
  Friends.IAmTheLeader = false;
  delete ClientwebData.AuthToken;
  if (RECONNECT_AUTOMATICALLY) {
    setTimeout(ConnectWebsocketIfNeeded, 30000);
  }

  // If on the loot screen, kick them back to the main menubar
  if (GetActiveScreen() && (GetActiveScreen().ScreenName == "Lootbox" || GetActiveScreen().ScreenName == "LootDisplay"))
  {
    console.log("Popping back to main menu...");
    PopScreenToMainMenu();
  }
}

function OnMatchmakingCancelClick()
{
  LeaveMatchmaking();
}


function LeaveGroupIfHasOne()
{
  console.log("LeaveGroupIfHasOne()");

  if (Friends.InGroup)
  {
    console.log("Appear to be in a group, requesting leave.");

    // This is so hacky... never should have been necessary
    Friends.InGroup = false;
    Friends.IAmTheLeader = false;
    Matchmaking.SetMatchmaking(false);

    if (IsOnline()) {
      socketConnection.emit("leave-group");
    }
  }
}

engine.on("LeaveGroupIfHasOne", LeaveGroupIfHasOne);

function OnLeavePartyClicked() {
  console.log("OnLeavePartyClicked()");

  if (!ClientwebData.bIsConsole) {
    ConnectWebsocketIfNeeded().then(function () {
      if (IsOnline()) {
        socketConnection.emit("leave-group");
      }
    });
  }
  else {
    LeaveGroupIfHasOne();

    console.log("LeaveSubsystemPartner() being called");
    engine.call("LeaveSubsystemPartner");
  }
}

engine.on("FriendsLoaded", function (friends) {
  // save the friends here in js-land, so we can lookup names via IDs later
  for (var i = 0; i < friends.length; ++i) {
    var friend = friends[i];
    Friends.SavedNames["steam:" + friend.FriendID] = friend.FriendName;
  }
  // sort the list of friends in the order we want for the UI
  friends.sort(function (first, second) {
    if (first.IsPlayingThisGame && !second.IsPlayingThisGame) {
      return -1;
    }
    if (!first.IsPlayingThisGame && second.IsPlayingThisGame) {
      return 1;
    }

    var firstName = first.FriendName.toLowerCase();
    var secondName = second.FriendName.toLowerCase();

    if (firstName < secondName) {
      return -1;
    }
    if (firstName > secondName) {
      return 1;
    }
    return 0;
  });
  Friends.LocalSteamFriends = friends;

  //socketConnection.emit("get-friends");
  //TODO: nope, don't actually load friends from clientweb, because that part
  //      doesn't work for private profiles
  populateFriends([]);
});

function OnSendFriendInviteClicked(friendID) {
  console.log("inviting: " + friendID);
  if (!bSentInvite) {
      bSentInvite = true;
      engine.call("GetLocalPlayerCullingCardID").then(function (localCardID) {
          var params = {
              target: friendID,
              cardID: localCardID
          };
          ConnectWebsocketIfNeeded().then(function () {
              if (IsOnline()) {
                  console.log("emit: group-invite" + params);
                  socketConnection.emit("group-invite", params);
              }
          });
      });
      PopModalByID("FriendsInvite");
  }

}

function OnAcceptInviteClicked(sender) {
  console.log("Accept invite");
  ConnectWebsocketIfNeeded().then(function () {
    if (IsOnline()) {
      socketConnection.emit("group-invite-accept", {userID: Friends.InviteFrom.ID});
    }
  });
}

function OnDeclineInviteClicked(sender) {
  console.log("Decline invite");
  ConnectWebsocketIfNeeded().then(function () {
    if (IsOnline()) {
      socketConnection.emit("group-invite-decline", {userID: Friends.InviteFrom.ID});
    }
  });
}

function DisconnectClientweb()
{
  console.log("DisconnectClientweb()");
  OnSocketConnectionClosed();
}

function SetActualDataCenter(dataCenter)
{
  console.log("SetActualDataCenter(\"" + dataCenter + "\"");

  ClientwebData.ActualDataCenter = dataCenter;

  engine.call("UpdateSubsystemWithCurrentRegion", dataCenter);
}

function SetOverrideDataCenter(datacenter)
{
  if (ClientwebData.OverrideDataCenter != datacenter)
  {
    if (ClientwebData.ActualDataCenter != datacenter) {
      DisconnectClientweb();

      // reconnect with new setting (possibly an empty string, meaning no override)
      ClientwebData.OverrideDataCenter = datacenter;

      ConnectDataCenter();
    }
    else {
      // we were already connected to this data center, so no need to disconnect/reconnect
      ClientwebData.OverrideDataCenter = datacenter;
    }
  }
}

function SetSubsystemTeammate(partnerID, localUserIsHost)
{
  if (ClientwebData.SubsystemPartnerID != partnerID || ClientwebData.SubsystemIsHost != localUserIsHost)
  {
    console.log("SetSubsystemTeammate changing from \"" + ClientwebData.SubsystemPartnerID + "\"");

    // partner changed
    ClientwebData.bHasSubsystemPartnerID = (partnerID != "") ? true : false;
    ClientwebData.SubsystemPartnerID = partnerID;
    ClientwebData.SubsystemIsHost = localUserIsHost;

    if (IsOnline()) {
      console.log("Notifying ClientWeb of subsystem partner: " + partnerID);
      socketConnection.emit("set-ss-partner", {"lobbyPartnerID": partnerID, "lobbyIsHost": localUserIsHost});
    }

    if (!ClientwebData.bHasSubsystemPartnerID) {

    }
  }
}

engine.on("SetSubsystemTeammate", function(partnerID, datacenter, localUserIsHost) {

  console.log("SetSubsystemTeammate(\"" + partnerID + "\", \"" + datacenter + "\", " + localUserIsHost + ")");
  SetOverrideDataCenter(""); // Don't use data center override for now...
  SetSubsystemTeammate(partnerID, localUserIsHost);
});

engine.on("RemoveSubsystemTeammate", function() {
  SetOverrideDataCenter("");
  SetSubsystemTeammate("");
});

engine.on("OnLobbyRegionMismatch", function() {
  ShowError("Could not join partner. Your partner is in a different region.");
});

engine.on("OnLobbyJoinFailure", function(message) {
  ShowError(message);
});

engine.on("ShowFrontEndError", function (message) {
  ShowError(message);
});

engine.on("OnSubsystemNicknameUpdated", function(userid, nickname) {

  console.log("OnSubsystemNicknameUpdated(\"" + userid + "\", \"" + nickname + "\"");

  resolvedLobbyMemberUsernames[userid] = nickname;

  if (userid.indexOf("xblive:") != 0) // quick fix
    userid = "xblive:" + userid;

  Friends.SavedNames[userid] = nickname;

  if (Friends.CurrentPartner)
  {
    if (Friends.CurrentPartner.ID == userid) {
      Friends.CurrentPartner.Name = nickname;
    }
  }
});

function ConnectDataCenter()
{
  var DataCenter = ClientwebData.SelectedDataCenter;

  if (ClientwebData.ShouldOverrideDataCenter()){
    console.log("ConnectDataCenter() with override: " + ClientwebData.OverrideDataCenter);
    ClientwebData.ActualDataCenter = ClientwebData.OverrideDataCenter;
    ConnectWebsocketIfNeeded(true);
  }
  else if(DataCenter == undefined || DataCenter == "" || DataCenter.toLowerCase() == "automatic") {
     console.log("ConnectDataCenter() with automatic bIsConsole" + ClientwebData.bIsConsole);

    if(ClientwebData.bIsConsole)
    {
        engine.call("GetDataCenterFromLocale").then(function (newDataCenter) {
          console.log("GetDataCenterFromLocale " + newDataCenter);
          SetActualDataCenter(newDataCenter);
          ConnectWebsocketIfNeeded(true);
        });
    }
    else
    {
                PingDataCenters().then(function () {
                    var newDataCenter = "";
                    for (var center in ClientwebData.DC_Pings) {
                        if (ClientwebData.bIsConsole && center == "Oceania")
                            continue;

                        if (newDataCenter == "") {
                            newDataCenter = center;
                        } else {
                            if ((ClientwebData.DC_Pings[center]/3) < (ClientwebData.DC_Pings[newDataCenter]/3)) {
                                newDataCenter = center;
                            }
                        }
                    }

                    console.log("SetActualDataCenter " + newDataCenter);
                    engine.call("SetSavedDataCenter", newDataCenter);
                    SetActualDataCenter(newDataCenter);
                    ConnectWebsocketIfNeeded(true);
                });
            }
   } else{
    console.log("ConnectDataCenter() with datacenter: " + DataCenter);

    SetActualDataCenter(DataCenter);
    ConnectWebsocketIfNeeded(true);
  }
}

function SelectAndConnectDataCenter(DataCenter){
  console.log("SelectAndConnectDataCenter(\""+DataCenter+"\")");
  ClientwebData.SelectedDataCenter = DataCenter;
  ConnectDataCenter();
}

function PingDataCenters(){
  var deferred = $.Deferred();
  ClientwebData.DC_Pings["US East"] = 0;
  ClientwebData.DC_Pings["Europe"] = 0;
  
  var pingUSEast = PingDataCenter("http://sdb.amazonaws.com/").then(function(usEastPing){
      ClientwebData.DC_Pings["US East"] += usEastPing;
      console.log("US East Ping: " + usEastPing);
    });

  var pingUSEast2 = PingDataCenter("http://sdb.amazonaws.com/").then(function (usEastPing) {
      ClientwebData.DC_Pings["US East"] += usEastPing;
      console.log("US East Ping2: " + usEastPing);
  });

  var pingUSEast3 = PingDataCenter("http://sdb.amazonaws.com/").then(function (usEastPing) {
      ClientwebData.DC_Pings["US East"] += usEastPing;
      console.log("US East Ping3: " + usEastPing);
  });

  var pingEurope = PingDataCenter("http://dynamodb.eu-central-1.amazonaws.com/").then(function(euPing){
      ClientwebData.DC_Pings["Europe"] += euPing;
      console.log("Europe Ping: " + euPing);
    });

  var pingEurope2 = PingDataCenter("http://dynamodb.eu-central-1.amazonaws.com/").then(function (euPing) {
      ClientwebData.DC_Pings["Europe"] += euPing;
      console.log("Europe Ping2: " + euPing);
  });

  var pingEurope3 = PingDataCenter("http://dynamodb.eu-central-1.amazonaws.com/").then(function (euPing) {
      ClientwebData.DC_Pings["Europe"] += euPing;
      console.log("Europe Ping3: " + euPing);
  });

  if (!ClientwebData.bIsConsole) {

      ClientwebData.DC_Pings["US West"] = 0;
      ClientwebData.DC_Pings["Oceania"] = 0;
      var pingUSWest = PingDataCenter("http://sdb.us-west-1.amazonaws.com/").then(function (usWestPing) {
          ClientwebData.DC_Pings["US West"] += usWestPing;
          console.log("US West Ping: " + usWestPing);
      });

      var pingUSWest2 = PingDataCenter("http://sdb.us-west-1.amazonaws.com/").then(function (usWestPing) {
          ClientwebData.DC_Pings["US West"] += usWestPing;
          console.log("US West Ping2: " + usWestPing);
      });

      var pingUSWest3 = PingDataCenter("http://sdb.us-west-1.amazonaws.com/").then(function (usWestPing) {
          ClientwebData.DC_Pings["US West"] += usWestPing;
          console.log("US West Ping3: " + usWestPing);
      });

    var pingOceania = PingDataCenter("http://sdb.ap-southeast-2.amazonaws.com/").then(function(ocnPing){
        ClientwebData.DC_Pings["Oceania"] += ocnPing;
      console.log("OCN Ping: " + ocnPing);
    });

    var pingOceania2 = PingDataCenter("http://sdb.ap-southeast-2.amazonaws.com/").then(function (ocnPing) {
        ClientwebData.DC_Pings["Oceania"] += ocnPing;
        console.log("OCN Ping2: " + ocnPing);
    });

    var pingOceania3 = PingDataCenter("http://sdb.ap-southeast-2.amazonaws.com/").then(function (ocnPing) {
        ClientwebData.DC_Pings["Oceania"] += ocnPing;
        console.log("OCN Ping3: " + ocnPing);
    });

    $.when(pingUSWest, pingUSWest2, pingUSWest3, pingUSEast, pingUSEast2, pingUSEast3, pingEurope, pingEurope2, pingEurope3, pingOceania, pingOceania2, pingOceania3).then(function () { deferred.resolve(); });
  }
  else {
      $.when(pingUSEast, pingUSEast2, pingUSEast3, pingEurope, pingEurope2, pingEurope3).then(function () { deferred.resolve(); });
  }

  return deferred.promise();
}

function PingDataCenter(dataCenter){
  /*
  No idea why this overly complicated way of doing a ping was used: --SDH

  var imageCell = $("#imageCell");
  var deferred = $.Deferred();
  var randomString = Math.floor(Math.random()*0xFFFFFFFFFFFFFFFF).toString(36);
  var targetUrl = dataCenter + "ping?x=" + randomString;

  var startTime = (new Date()).getTime();
  imageCell.empty();
  imageCell.html("<img id='pingImage' style='display: none'>");
  var pingImage = $("#pingImage");
  pingImage.on("error", function(){
    var endTime = (new Date()).getTime();
    deferred.resolve(endTime - startTime);
  });
  pingImage.attr("src", targetUrl);

  return deferred.promise();
  */

  var randomString = Math.floor(Math.random()*0xFFFFFFFFFFFFFFFF).toString(36);
  var targetUrl = dataCenter + "ping?x=" + randomString;

  var deferred = $.Deferred();
  var startTime = (new Date()).getTime();

  $.ajax({
      method: "GET",
      url: targetUrl,
      success: function (data, status, jqXHR) {
        var endTime = (new Date()).getTime();
        deferred.resolve(endTime - startTime);
      },
      error: function (jqXHR) {
        var endTime = (new Date()).getTime();
        deferred.resolve(endTime - startTime);
      },
      timeout: 3000
    });

  return deferred.promise();
}

var pendingErrors = [];
var currentError = "";
var bShowingErrorModal = false;

function ShowError(error)
{
  if(bShowingErrorModal)
  {
    if(!pendingErrors.containsString(error) && error != currentError)
    {
      console.log("Adding Error: " + error);
      pendingErrors.push(error)
    }
    else
    {
      console.log("Error already in queue: " + error);
    }

    return;
  }

  bShowingErrorModal = true;
  currentError = error;
  var modalArgs = {
    options: ["OK"],
    title:"Error: " + error,
    bSupportsBackButton: true,
    callback: function(option){
      bShowingErrorModal = false;
      if(pendingErrors.length > 0)
      {
        var newError = pendingErrors.pop();
        currentError = newError;
        ShowError(newError);
      }
      else
      {
        currentError = "";
      }
    }
  };

  PushModal('Modal', modalArgs);
}

var QueueTimeHandle = {};

function StartedMatchmaking(){
  Matchmaking.TimeInQueue = 0;
  clearInterval(QueueTimeHandle);
  QueueTimeHandle = setInterval(function(){
    Matchmaking.TimeInQueue++;
  }, 1000);
}

function StoppedMatchmaking(){
    clearInterval(QueueTimeHandle);
}

function OnInvitePressed()
{
  console.log("OnInvitePressed");
  // engine.call("OnInvitePressed");
  if (Friends.InGroup) {
    OnLeavePartyClicked();
    return;
  }

  if (ClientwebData.SubsystemPartnerID != "") {
    // The server may not know or have acknowledged we are in a group on our subsystem (Xbox), but we need to be able to leave it anyways.
    engine.call("LeaveSubsystemPartner");
    return;
  }

  if (IsOnline()) {

    /*
    var modalArgs = {
      options: ["Cancel"],
      title: "Friends",
      bSupportsBackButton: true,
      isInviteModal: true,
      modalID: "FriendsInvite",
      callback: function (option) {
      }
    };
    PushModal('Modal', modalArgs);

    engine.call("LoadFriends");
    */

    if (!ClientwebData.bIsConsole) {
      engine.call("LoadFriends");

      if(GetActiveScreen().ScreenName != "InvitePlayerScreen")
      {
        PushScreen('InvitePlayerScreen');
      }
    }
    else {
      engine.call("ShowSubsystemInviteFriendUI");
    }
  }
  else {
    if (!ClientwebData.bIsConsole) {
      HandleRequireOnline('InvitePlayerScreen');
    }
    else {
      HandleRequireOnline('SUBSYSTEM_FRIENDS');
    }
  }
}

engine.on("OnSubsystemError", function(message) {
  ShowError(message);
});

engine.on("OpenCrateResponse", function(message) {
  OnReceivedOpenCrateResponse(message);
});

function OnReceivedOpenCrateResponse(msg)
{
	console.log("Received open crate response: " + msg);
  if(GetActiveScreen().ScreenName == "LootDisplay")
  {
    GetActiveScreen().CanExit = false;
  }
	// Item IDs (as strings) to pass to OpenLootCrate which is passed to the FrontEnd level for displaying the items
	var itemIDs = [];

	// This is the JSON received from Worldserver (forwarded via Clientweb)
	var crateResponse = JSON.parse(msg);

  LootDisplayScreen.rebindLabels(crateResponse);

	if (crateResponse.hasOwnProperty("itemTypesAdded"))
	{
		// Limit to 4 items
		var numItems = Math.min(crateResponse.itemTypesAdded.length, 4);

		for (var i = 0; i < numItems; i++) {
			if (crateResponse.itemTypesAdded[i].hasOwnProperty("typeId")) {
				itemIDs.push(crateResponse.itemTypesAdded[i].typeId.toString());
			}
		}
	}

	console.log("OpenLootCrate with item IDs: " + JSON.stringify(itemIDs));

	// Trigger FrontEnd map to show the items
  if(GetActiveScreen().ScreenName == "LootDisplay")
  {
    engine.call("OpenLootCrate", itemIDs);
  }
}

function SendInventoryRequest(version) {
    console.log("engine.call to ClientWeb.js is working");
    console.log("Send 'get-inventory-types' Request");

    ConnectWebsocketIfNeeded().then(function () {
        if (IsOnline()) {
            console.log("Sending 'get-inventory-types' request " + version);
            socketConnection.emit("get-inventory-types", version);
            console.log("Post 'get-inventory-types' request " + version);
        }
        else {
            console.warn("Cannot send get inventory types request without socketConnection");
        }
    });
};

function SendPremiumRequest(version) {
    ConnectWebsocketIfNeeded().then(function () {
        if (IsOnline()) {
            console.log("Sending 'get-premium-types' request " + version);
            socketConnection.emit("get-premium-types", version);
        }
        else {
            console.warn("Cannot send get premium types request without socketConnection");
        }
    });
};

function SendGetLeaderboardRequest(version) {

    var bNeedsUpdate = true;
    if(ClientwebData.LeaderboardData != undefined && ClientwebData.LeaderboardData.updatedTime != undefined)
    {
        var dif = (new Date()).getTime() - ClientwebData.LeaderboardData.updatedTime;
        var secondsDif = Math.abs(dif / 1000);

        if (secondsDif >= 10 * 60) {
            bNeedsUpdate = true;
        }
        else {
            bNeedsUpdate = false;
        }
    }

    if (bNeedsUpdate) {
        ConnectWebsocketIfNeeded().then(function () {
            if (IsOnline()) {
                socketConnection.emit("player-leaderboard-request");
            }
            else {
                console.warn("Cannot send get leaderboards without socketConnection");
            }
        });
    }
    else {
      console.log(GetActiveScreen().ScreenName);
      if(GetActiveScreen().ScreenName == "Leaderboard")
      {
        Leaderboard.SetAbleClose();
        document.getElementById("loading-leaderboard-container").classList.add("hidden");
        document.getElementById("leaderboard-menu-options").classList.remove("hidden");
      }
      else if(GetActiveScreen().ScreenName == "Profile")
      {
        ProfileScreen.SetAbleClose();
        document.getElementById("loading-profile-container").classList.add("hidden");
        document.getElementById("player-profile-main-container").classList.remove("hidden");
      }


    }

};
