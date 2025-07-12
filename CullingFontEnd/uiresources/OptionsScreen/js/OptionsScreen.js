function unique(list) {
    var result = [];
    $.each(list, function(i, e) {
        if ($.inArray(e, result) == -1) result.push(e);
    });
    return result;
}

var ActionMapData = {
	ActionMap : [],
	AxisMap : []
};

var KeyBindMessageData = {
	KeyToBind : "",
	ErrorMessage : ""
}

var ActionMapDB = {
	ActionMappings : {}
}

var bIsFrontEnd = false;

function GetAxisMapTable()
{
	return [
		{
			"Axis": "MoveForward",
			"Keys" : []
		},
		{
			"Axis": "MoveBackward",
			"Keys" : []
		},
		{
			"Axis": "MoveLeft",
			"Keys" : []
		},
		{
			"Axis": "MoveRight",
			"Keys" : []
		},
		{
			"Axis": "TurnLeft",
			"Keys" : []
		},
		{
			"Axis": "TurnRight",
			"Keys" : []
		}
	]
}

function GetNewActionMapTable()
{
    return [
		{
		    "Action": "Jump",
		    "Keys": []
		},
        {
        	"Action": "Run",
        	"Keys": []
        },
		{
		    "Action": "CrouchToggle",
		    "Keys": []
		},
		{
			"Action": "Fire",
			"Keys" : []
		},
		{
			"Action": "Targeting",
			"Keys" : []
		},
		{
			"Action": "Reload",
			"Keys" : []
		},
		{
			"Action": "Use",
			"Keys" : []
		},
		{
			"Action": "Drop",
			"Keys" : []
		},
		{
			"Action": "Throw",
			"Keys" : []
		},
		{
			"Action": "Shove",
			"Keys" : []
		},
		{
		    "Action": "NextWeapon",
		    "Keys": []
		},
		{
		    "Action": "PrevWeapon",
		    "Keys": []
		},
		{
			"Action": "InvSlot1",
			"Keys" : []
		},
		{
			"Action": "InvSlot2",
			"Keys" : []
		},
		{
			"Action": "InvSlot3",
			"Keys" : []
		},
		{
			"Action": "InvSlot4",
			"Keys" : []
		},
		{
			"Action": "InvSlot5",
			"Keys" : []
		},
		{
		    "Action": "SayTeam",
		    "Keys": []
		},
		{
		    "Action": "SayDead",
		    "Keys": []
		},
    {
        "Action": "Suicide",
        "Keys": []
    },
    {
        "Action": "SpectateScoreboard",
        "Keys": []
    },
    {
        "Action": "Taunt",
        "Keys": []
    },
    {
        "Action": "PushToTalk",
        "Keys": []
    }

	];
}

rivets.formatters.GetKey0 = function(value){
  if(value == undefined || value[0] == undefined || value[0] == ""){
    return "None";
  }
  return value[0];
}

rivets.formatters.GetKey1 = function(value){
  if(value[1] == undefined || value[1] == ""){
    return "None";
  }
  return value[1];
}

rivets.formatters.FormatAction = function(value){
  return TranslateAction(value);
};

rivets.formatters.speakerConfigConversion = function(value)
{
  if(value == 0){
    return "Headphones";
  } else {
    return "Speakers";
  }
};

function InitControlMappings()
{
  engine.call("GetActionMaps").then(function(ActionMaps){
    OnGetActionMaps(ActionMaps);
  });

  engine.call("GetAxisMaps").then(function(AxisMaps){
    OnGetAxisMaps(AxisMaps);
  });

}

var mouseSensitivitySlider = document.getElementById("mouse-sensitivity-slider");
var SettingsObject = {};

function clamp(min,max,value)
{
	return Math.min(max, Math.max(min, value));
}

function SetSettingsObject(obj)
{
  SettingsObject = obj;
}

function PCButtonConversion(value){
  var retString = value;
  switch(value)
  {
    case "Zero":
      retString = "0";
      break;
    case "One":
      retString = "1";
      break;
    case "Two":
      retString = "2";
      break;
    case "Three":
      retString = "3";
      break;
    case "Four":
      retString = "4";
      break;
    case "Five":
      retString = "5";
      break;
    case "Six":
      retString = "6";
      break;
    case "Seven":
      retString = "7";
      break;
    case "Eight":
      retString = "8";
      break;
    case "Nine":
      retString = "9";
      break;
    case "RightMouseButton":
      retString = "RMB";
      break;
    case "LeftMouseButton":
      retString = "LMB";
      break;
    case "MiddleMouseButton":
      retString = "MMB";
      break;
    case "MouseWheelUp":
      retString = "MW+";
      break;
    case "MouseWheelDown":
      retString = "MW-";
      break;
    case "ThumbMouseButton":
      retString = "MB1";
      break;
    case "ThumbMouseButton2":
      retString = "MB2";
      break;
    case "LeftBracket":
      retString = "[";
      break;
    case "RightBracket":
      retString = "]";
      break;
    case "Semicolon":
      retString = ";";
      break;
    case "Comma":
      retString = ",";
      break;
    case "Period":
      retString = ".";
      break;
    case "Slash":
      retString = "/";
      break;
    case "LeftShift":
      retString = "LS";
      break;
    case "RightShift":
      retString = "RS";
      break;
    case "SpaceBar":
      retString = "Space";
      break;
    case "SpaceBar":
      retString = "Space";
      break;
    case "Equals":
      retString = "=";
      break;
    case "Tilde":
        retString = "`";
        break;
    case "Multiply":
      retString = "*";
      break;
    case "Divide":
      retString = "/";
      break;
    case "Subtrack":
      retString = "-";
      break;
    case "Add":
      retString = "+";
      break;
    case "NumPadZero":
      retString = "NUM0";
      break;
    case "NumPadOne":
      retString = "NUM1";
      break;
    case "NumPadTwo":
      retString = "NUM2";
      break;
    case "NumPadThree":
      retString = "NUM3";
      break;
    case "NumPadFour":
      retString = "NUM4";
      break;
    case "NumPadFive":
      retString = "NUM5";
      break;
    case "NumPadSix":
      retString = "NUM6";
      break;
    case "NumPadEight":
      retString = "NUM8";
      break;
    case "NumPadNine":
      retString = "NUM9";
      break;
    case "Hyphen":
      retString = "-";
      break;
    case "Apostrophe":
      retString = "'";
      break;
    }

  return retString;
}

function BindOptionsScreenFormatters(){
  rivets.formatters.FormatInvSlotKey = function(value){
    return PCButtonConversion(value);
  }

  rivets.formatters.numericSetting = function(value)
  {
  	return clamp(0, 10, value);
  };

  rivets.formatters.formatResolution = function(value){
    if(value != undefined){
      return value.replace(".", "x");
    }
    return "";
  }

  rivets.formatters.resQualitySetting = function(value){
  	var optionString = "";

  	if(value <= 50){
  		optionString = "50%";
  	} else if(value <= 75){
  		optionString = "75%";
  	} else if(value <= 100){
  		optionString = "Full";
  	}

  	return optionString;
  };
}

BindOptionsScreenFormatters()

function RestoreDefaultControls()
{
    engine.call("SetDefaultKeyBindings");
}

function ResetVideoSettings()
{
    engine.call("SetDefaultVideoSettings");
}

function AutoDetectVideoSettings()
{
    engine.call("AutoDetectVideoSettings");
}

var AvailResolutions = ["1280.720", "1920.1080"];
var InvertYCheckbox = document.getElementById("invert-y-axis");
var MouseSmoothCheckbox = document.getElementById("smooth-mouse");
//We need to call this to apply our settings at the object level
function UpdateGameSettingsFromEngine(settings)
{
  console.log("Settings: " + JSON.stringify(settings));
	SettingsObject.res = settings['res'];
	SettingsObject.screenMode = settings['screenMode'];
	SettingsObject.resQuality = settings['resQuality'];
	SettingsObject.postQuality = settings['postQuality'];
	SettingsObject.effectsQuality = settings['effectsQuality'];
	SettingsObject.aaQuality = settings['aaQuality'];
	SettingsObject.shadowQuality = settings['shadowQuality']
	SettingsObject.viewDistQuality = settings['viewDistQuality'];
	SettingsObject.texQuality = settings['texQuality'];
	SettingsObject.mouseSensitivity = settings['mouseSensitivity'];
	SettingsObject.masterVolume = settings['masterVolume'];
  SettingsObject.musicVolume = settings['musicVolume'];
	SettingsObject.showPing = settings['showPing'];
	SettingsObject.showWeaponTooltips = settings['showWeaponTooltips'];
	SettingsObject.invertY = settings['invertY'];
	SettingsObject.smoothMouse = settings['smoothMouse'];
	SettingsObject.fov = settings['fov'];
  SettingsObject.vSync = settings['vSync'];
	SettingsObject.__Type = "JSGameSettings";

	//mouseSensitivitySlider.noUiSlider.set(SettingsObject.mouseSensitivity);
  /*
  if(!bIsFrontEnd){
  	InvertYCheckbox.checked = SettingsObject.invertY == 1 ? true : false;
  	MouseSmoothCheckbox.checked = SettingsObject.smoothMouse == 1 ? true : false
  }
  */

	if(SettingsObject.showPing == 1){
		pingData.showPing = true;
		//console.log("Showing ping.");
	} else {
		pingData.showPing = false;
		//console.log("Hiding ping.");
	}
}

function ChangeResQuality(increment)
{
  console.log("ResQuality: " + SettingsObject.resQuality);
	if(SettingsObject.resQuality <= 50) {
		if(increment){
			SettingsObject.resQuality = 75;
		} else {
			SettingsObject.resQuality = 100;
		}
	} else if (SettingsObject.resQuality <= 75) {
		if(increment){
			SettingsObject.resQuality = 100;
		} else {
			SettingsObject.resQuality = 50;
		}
	} else if (SettingsObject.resQuality <= 100) {
		if(increment){
			SettingsObject.resQuality = 50;
		} else {
			SettingsObject.resQuality = 75
		}
	}
}

function ChangeScreenMode(increment)
{
	if(increment)
	{
		if(SettingsObject.screenMode < 2){
			SettingsObject.screenMode = SettingsObject.screenMode + 1;
		} else {
			SettingsObject.screenMode = 0;
		}
	} else {
		if(SettingsObject.screenMode > 0)
		{
			SettingsObject.screenMode = SettingsObject.screenMode - 1;
		} else {
			SettingsObject.screenMode = 2;
		}
	}
}

function ChangeLinearValue(option, min, max, increment)
{
	if(increment)
	{
		if(SettingsObject[option] < max){
			SettingsObject[option] = SettingsObject[option] + 1;
		} else {
			SettingsObject[option] = min;
		}
	} else {
			if(SettingsObject[option] > min){
				SettingsObject[option] = SettingsObject[option] - 1;
			} else {
				SettingsObject[option] = max;
			}
		}
}

function OptionItemClicked(option, bIncrement, event)
{
	//console.log("Event: " + event);
	console.log("Option Item Clicked: " + option);
	optionsDirty = true;
	var increment = bIncrement;
/*
  if(window.event.type == "wheel"){
    console.log("wheel event");
		if(window.event.wheelDelta < 0){
			increment = false;
		}
	} else if(bIncrement != undefined && bIncrement == true){
    increment = true;
  }
*/
	switch(option){
		case "resQuality":
			ChangeResQuality(increment);
			break;
		case "screenMode":
			//ChangeScreenMode(increment);
			ChangeLinearValue(option, 0, 2, increment);
			break;
		case "postQuality":
      ChangeLinearValue(option, 2, 3, increment);
      break;
		case "effectsQuality":
		case "aaQuality":
		case "viewDistQuality":
		case "texQuality":
			ChangeLinearValue(option, 1, 3, increment);
			break;
    case "shadowQuality":
      ChangeLinearValue(option, 0, 3, increment);
      break;
		case "masterVolume":
    case "musicVolume":
			ChangeLinearValue(option, 0, 10, increment);
			break;
		case "mouseSensitivity":
			ChangeLinearValue(option, 1, 20, increment);
			break;
		case "fov":
			ChangeLinearValue(option, 70, 100, increment);
			break;
		case "showPing":
			if(SettingsObject.showPing > 0){
				SettingsObject.showPing = 0;
			} else {
				SettingsObject.showPing = 1;
			}
			break;
    case "invertY":
			if(SettingsObject.invertY > 0){
				SettingsObject.invertY = 0;
			} else {
				SettingsObject.invertY = 1;
			}
			break;
    case "vSync":
			if(SettingsObject.vSync > 0){
				SettingsObject.vSync = 0;
			} else {
				SettingsObject.vSync = 1;
			}
			break;
    case "smoothMouse":
			if(SettingsObject.smoothMouse > 0){
				SettingsObject.smoothMouse = 0;
			} else {
				SettingsObject.smoothMouse = 1;
			}
			break;
		case "showWeaponTooltips":
			ChangeLinearValue(option, 0, 1, increment);
			break;
	}

	OptionsSave();
}

function InvertYOnClick()
{
	if(InvertYCheckbox.checked){
		SettingsObject.invertY = 1;
	} else {
		SettingsObject.invertY = 0;
	}

	optionsDirty = true;
	OptionsSave();
}

function SmoothMouseOnClick()
{
	if(MouseSmoothCheckbox.checked){
		SettingsObject.smoothMouse = 1;
	} else {
		SettingsObject.smoothMouse = 0;
	}

	optionsDirty = true;
	OptionsSave();
}

function OptionsSave()
{
	//All we need to do is write out the current slider values to globalScope.gamesettings, then pass that to the engine
	var splitRes = SettingsObject.res.split(".");
  console.log("Res: " + SettingsObject.res + " SplitRes: " + splitRes);
  var SettingsToSave = {
    xRes : Number(splitRes[0]),
    yRes : Number(splitRes[1]),
    screenMode : Number(SettingsObject.screenMode),
    resQuality : Number(SettingsObject.resQuality),
    postQuality : Number(SettingsObject.postQuality),
    effectsQuality : Number(SettingsObject.effectsQuality),
    aaQuality : Number(SettingsObject.aaQuality),
    shadowQuality : Number(SettingsObject.shadowQuality),
    viewDistQuality : Number(SettingsObject.viewDistQuality),
    texQuality : Number(SettingsObject.texQuality),
    mouseSensitivity : Number(SettingsObject.mouseSensitivity),
    masterVolume : Number(SettingsObject.masterVolume),
    showPing : Number(SettingsObject.showPing),
    fov : Number(SettingsObject.fov),
    showWeaponTooltips : Number(SettingsObject.showWeaponTooltips),
    invertY : Number(SettingsObject.invertY),
    smoothMouse : Number(SettingsObject.smoothMouse),
    musicVolume : Number(SettingsObject.musicVolume),
    vSync : Number(SettingsObject.vSync),
    "__Type" : "JSGameSettings"
  }

	console.log("Saving settings: " + JSON.stringify(SettingsToSave));
	engine.call("SaveUserSettings", SettingsToSave);
	optionsDirty = false;
/*
	//We need to redraw the HUD in case the resolution changed and we didn't pick it up
	setTimeout(function(){
		$(document.body).hide().show(0);
	}, 1);*/
}
/*
noUiSlider.create(mouseSensitivitySlider, {
  start: [ 0.1 ],
  step: 0.01,
  range: {
    'min': [0.01],
    'max': [0.5]
  }
});

mouseSensitivitySlider.noUiSlider.on('change', UpdateMouseSensitivity);
*/
function UpdateMouseSensitivity(value)
{
	SettingsObject.mouseSensitivity = Number(value);
	optionsDirty = true;
	OptionsSave();
	console.log("GameSettings.mouseSensitivity: " + SettingsObject.mouseSensitivity);
}

var bIsActionsBound = false;

function OnGetActionMaps(ActionMaps)
{
  console.log("OnGetActionMaps");
	ActionMapData.ActionMap = GetNewActionMapTable();
	if(bIsActionsBound == false){
    console.log("Binding controls");
		BindControlData();
	}

	for(var i = 0; i < ActionMaps.length; ++i)
	{
		var ActionMapItem = ActionMaps[i];
    console.log("ActionMapItem: " + JSON.stringify(ActionMapItem));
		var ActionMapEntry = GetActionMapEntry(ActionMapItem["Action"]);
		if(ActionMapEntry != undefined){
			console.log("Adding Action " + ActionMapItem["Action"] + " with Key " + ActionMapItem["Key"]);
			ActionMapEntry["Keys"].push(ActionMapItem["Key"]);
		}
	}

	BuildActionMapDB(ActionMaps);
}

function BuildActionMapDB(ActionMaps)
{
	ActionMapDB.ActionMappings = {};

	for(var i = 0; i < ActionMaps.length; ++i){
		var ActionMapEntry = ActionMaps[i];
    //console.log(JSON.stringify(ActionMapEntry));
		if(ActionMapDB.ActionMappings[ActionMapEntry["Action"]] == undefined){
			ActionMapDB.ActionMappings[ActionMapEntry["Action"]] = {
				Key : ""
			};
		}
		ActionMapDB.ActionMappings[ActionMapEntry["Action"]].Key = ActionMapEntry["Key"];
    //console.log(JSON.stringify(ActionMapDB.ActionMappings));
    //console.log(ActionMapEntry["Key"]);
  /*  if(ActionMapEntry["Key"].indexOf("Gamepad") != -1){
      SetHasGamepad(true);
    }
    else{
      SetHasGamepad(false);
    }*/
	}
}

function GetActionMapEntry(action, bIsAxis)
{
	var container = [];
	var label = "";
	if(bIsAxis != undefined && bIsAxis == true)
	{
		container = ActionMapData.AxisMap;
		label = "Axis";
	} else {
		container = ActionMapData.ActionMap;
		label = "Action";
	}
	for(var i = 0; i < container.length; ++i)
	{
		if(container[i] != undefined && container[i][label] == action)
		{
			return container[i];
		}
	}

	return undefined;
}

function OnGetAxisMaps(AxisMaps)
{
  //console.log(JSON.stringify(AxisMaps));
	ActionMapData.AxisMap = GetAxisMapTable();
  if(bIsActionsBound == false){
    BindControlData();
	}
	for(var i = 0; i < AxisMaps.length; ++i)
	{
		var AxisMapItem = AxisMaps[i];
		var AxisMapEntry = GetActionMapEntry(AxisMapItem["Action"], true);
		//console.log("AxisMapEntry: " + JSON.stringify("AxisMapEntry"));
		if(AxisMapEntry != undefined){
			AxisMapEntry["Keys"].push(AxisMapItem["Key"]);
		}
    //console.log(JSON.stringify(AxisMapEntry));
	}
}

var KeyBindMessageElem = document.getElementById("KeyBindMessage");
var KeyBindMessageError = document.getElementById("KeyBindMessageError");
var bKeyAlreadyBound = false;

function OnAxisClicked(elem)
{
    var leftclick = false;
    var e = window.event;

    if (e.which == 1) {
        leftclick = true;
    }

    if (leftclick)
    {
        var Axis = elem.getAttribute("data-axis");
        //console.log("OnAxisClicked " + Axis);
        var Key = elem.getAttribute("data-key");
        KeyBindMessageData.KeyToBind = Axis;
        console.log("KeyBindMessageData: " + Axis);
        if (Key == "None") {
            Key = "";
        }
        bKeyAlreadyBound = false;
        engine.call("SetKeybindMode", Axis, Key, 0);

        KeyBindMessage.classList.remove("hidden");
        KeyBindMessageData.ErrorMessage = "";
        window.event.stopPropagation();
        BlockInputWhileBinding();
    }

	return false;
}

function OnActionClicked(elem, bIsAlternate)
{
	var Action = elem.getAttribute("data-action");
	var Key = elem.getAttribute("data-key");

	console.log("Key: " + Key);
	console.log("OnActionClicked " + Action);
	console.log("window.event.button = " + window.event.button);
	console.log("window.event.which = " + window.event.which);
	var leftclick = false;
	var e = window.event;

	if (e.which == 1) {
	    leftclick = true;
	}

	if (leftclick)
	{
	    KeyBindMessageData.KeyToBind = Action;
	    if (Key == "None") {
	        Key = "";
	    }
	    bKeyAlreadyBound = false;
	    engine.call("SetKeybindMode", Action, Key, 1);
	    KeyBindMessage.classList.remove("hidden");
	    KeyBindMessageData.ErrorMessage = "";
	    document.getElementById("cloned-elements").click();
	    window.event.stopPropagation();
	    BlockInputWhileBinding();
	}
	return false;
}
var BackButtonDisabled = false;
function BlockInputWhileBinding()
{
    BackButtonDisabled = true;
    $('body').on('keydown', function (e) {
        console.log("BlockInputWhileBinding:: e.keyCode " + e.keyCode);
        if (e.keyCode == 27 ||
            e.keyCode == 32 ||
            e.keyCode == 33 ||
            e.keyCode == 34 ||
            e.keyCode == 38 ||
            e.keyCode == 40
            )
        {
        e.stopPropagation();
        e.preventDefault();
        console.log("Blocked a move input");
        }
  });
}

function UnblockInputWhileBinding()
{
    BackButtonDisabled = false;
  $('body').off('keydown');
}

engine.on("OnBindingSet", function(){
		var TimeoutTime = 750;
		if(bKeyAlreadyBound == false){
			TimeoutTime = 50;
		}
		setTimeout(function(){
			CloseKeyBindMessageWindow();
		}, TimeoutTime);
    GetAllMappings();
});

engine.on("UpdateAllMappings", function(){
  //console.log('UpdateAllMappings');
  GetAllMappings();
  SetToolTips();
});

function GetAllMappings()
{
		engine.call("GetActionMaps").then(function(ActionMaps){
			OnGetActionMaps(ActionMaps);
		});

		engine.call("GetAxisMaps").then(function(AxisMaps){
			OnGetAxisMaps(AxisMaps);
		});
}

engine.on("KeyAlreadyBound", function(BoundAction, Key, bWasProtected){
	bKeyAlreadyBound = true;

	if(bWasProtected){
		KeyBindMessageData.ErrorMessage = Key + " cannot be bound - please choose another key."
	} else {
		KeyBindMessageData.ErrorMessage = "Key already bound to " + TranslateAction(BoundAction) + " - overwriting.";
	}

	KeyBindMessageError.classList.add("hidden");
	setTimeout(function(){
			KeyBindMessageError.classList.remove("hidden");
	},100);

});

function OnRightClickKeyBind(elem) {
    var rightclick = false;
    var e = window.event;
    if (e.which) {
        rightclick = (e.which == 3);
    }
    else if (e.button) {
        rightclick = (e.button == 2);
    }

    //console.log("OnRightClickKeyBind:: e: " + e.button);

    if (rightclick) {
			console.log("RightClick");
			var Action = elem.getAttribute("data-action");
			var Axis = elem.getAttribute("data-axis");
			var Key = elem.getAttribute("data-key");
			console.log("Key: " + Key);

			if(Action != undefined){
				engine.call("ClearActionBinding", Action, Key, true);
			} else {
				engine.call("ClearAxisBinding", Axis, Key, true);
			}
	}
}

engine.on("CancelKeybindMode", function(){
		CloseKeyBindMessageWindow();
});

function CloseKeyBindMessageWindow()
{
  setTimeout(function(){
    KeyBindMessage.classList.add("hidden");
  	KeyBindMessageError.classList.add("hidden");
    UnblockInputWhileBinding();
  }, 10);

}

function TranslateAction(Action)
{
	switch(Action)
	{
		case "Targeting":
			Action = "Block / Aim";
			break;
		case "Block / Aim":
			Action = "Targeting";
			break;
	}

	return Action;
}

function BindControlData(){
/*
  if(bIsFrontEnd == false){
    rivets.bind($('#controls-table'),{
      ActionMapData: ActionMapData
    });
  }

  rivets.bind($('#KeyBindMessage'),{
    KeyBindMessageData : KeyBindMessageData
  });
*/
  bIsActionsBound = true;
}
