//////////////////////////////
//	Localization Functions	//
//////////////////////////////
var locDB = {};
var currLanguage = "en";

$.getJSON('../Localization/FrontEnd.json', function(data) {
  console.log("Loading Localization File: FrontEnd.json");
  locDB = data;
  //ReadyForRivetsBind();
  //StartTooltipRotation();
});

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

rivets.formatters.getLocalizedNameForItem = function(value){
  return loc("items." + value);
}
