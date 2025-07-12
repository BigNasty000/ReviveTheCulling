const PauseRecipesSelector = document.getElementById("pause-recipes-menu");

//Add your CSS files here
$('head').append('<link rel="stylesheet" type="text/css" href="css/Screens/Recipes.css">');


var RecipeData = {
	MeleeWeapons : [{
			 Display : "Crafted Knife",
			 Item1 : "rock",
			 Item2 : "rock",
			 Item3 : "",
			 Item4 : "",
			 Result : "crafted_knife",
			 Category : "WEAPON",
			 Cost : 2
		},{
			 Display : "Crated Spear",
			 Item1 : "crafted_knife",
			 Item2 : "branch",
			 Item3 : "",
			 Item4 : "",
			 Result: "crafted_spear",
			 Category: "WEAPON",
			 Cost: 0
		},{
			 Display : "Crated Hatchet",
			 Item1 : "crafted_knife",
			 Item2 : "rock",
			 Item3 : "",
			 Item4 : "",
			 Result: "crafted_hatchet",
			 Category: "WEAPON",
			 Cost: 0
		},{
			 Display : "Crafted Cudgel",
			 Item1 : "crafted_hatchet",
			 Item2 : "rock",
			 Item3 : "",
			 Item4 : "",
			 Result: "crafted_cudgel",
			 Category: "WEAPON",
			 Cost: 0
		}
	],
	RangedWeapons: [{
			 Display : "Crafted Bow",
			 Item1 : "crafted_spear",
			 Item2 : "branch",
			 Item3 : "crafted_hatchet",
			 Item4 : "crafted_cudgel",
			 Result: "crafted_bow",
			 Category: "WEAPON",
			 Cost: 5
		},{
			 Display : "Crafted Blowgun",
			 Item1 : "caltrops",
			 Item2 : "BP_GasPylon_2_C",
			 Item3 : "",
			 Item4 : "",
			 Result: "crafted_blowgun",
			 Category: "WEAPON",
			 Cost: 5
		}
	],
  Items: [{
			 Display : "Crafted Bandage",
			 Item1 : "branch",
			 Item2 : "branch",
			 Item3 : "",
			 Item4 : "",
			 Result: "crafted_bandage",
			 Category: "ITEMS",
			 Cost: 5
		},{
			 Display : "Crafted Satchel",
			 Item1 : "crafted_bandage",
			 Item2 : "branch",
			 Item3 : "bandage",
			 Item4 : "",
			 Result: "crafted_satchel",
			 Category: "ITEMS",
			 Cost: 7
		},{
			 Display : "Crafted Armor",
			 Item1 : "crafted_satchel",
			 Item2 : "rock",
			 Item3 : "backpack",
			 Item4 : "",
			 Result: "crude_crafted_armor",
			 Category: "ITEMS",
			 Cost: 10
		}
		// {
		// 	 Display : "Reinforced Crafted Armor",
		// 	 Item1 : "backpack",
		// 	 Item2 : "rock",
		// 	 Item3 : "crude_crafted_armor",
		// 	 Item4 : "",
		// 	 Result: "Reinforced_Crafted_Armor",
		// 	 Category: "ITEMS",
		// 	 Cost: 30
		// }
	],
  Traps: [{
			 Display : "Crafted Caltrops",
			 Item1 : "branch",
			 Item2 : "rock",
			 Item3 : "",
			 Item4 : "",
			 Result: "caltrops",
			 Category: "TRAPS",
			 Cost: 4
		},{
			 Display : "Crafted Punji Sticks",
			 Item1 : "branch",
			 Item2 : "BP_GasPylon_2_C",
			 Item3 : "",
			 Item4 : "",
			 Result: "crafted_punji_sticks",
			 Category: "TRAPS",
			 Cost: 5
		},{
			 Display : "Crafted Snare",
			 Item1 : "caltrops",
			 Item2 : "rock",
			 Item3 : "",
			 Item4 : "",
			 Result: "crafted_snare",
			 Category: "TRAPS",
			 Cost: 8
		}
	],
  Ammo: [
		// {
    //     Display : "Gun Ammo",
    //     Item1 : "357_magnum",
    //     Item2 : "Hazard_ExplodingBarrel_C",
		// 		Item3 : "smg",
 		// 	 	Item4 : "rifle",
    //     Result: "bullet",
    //     Category: "AMMO",
    //     Cost: 75
    //  },
		 // {
     //    Display : "Alarm Gun Ammo",
     //    Item1 : "alarm_gun",
     //    Item2 : "Hazard_ExplodingBarrel_C",
			// 	Item3 : "",
 			//   Item4 : "",
     //    Result: "alarm_gun",
     //    Category: "AMMO",
     //    Cost: 5
     // },
		 {
        Display : "Bow Arrows",
        Item1 : "crafted_bow",
        Item2 : "branch",
				Item3 : "hunting_bow",
 			  Item4 : "compound_bow",
        Result: "arrow",
        Category: "AMMO",
        Cost: 5
     },{
        Display : "Auto Bow Arrows",
        Item1 : "auto_bow",
        Item2 : "branch",
				Item3 : "",
 			  Item4 : "",
        Result: "arrow",
        Category: "AMMO",
        Cost: 5
     },{
        Display : "Caltrops",
        Item1 : "caltrops",
        Item2 : "branch",
				Item3 : "",
 			  Item4 : "",
        Result: "caltrops",
        Category: "AMMO",
        Cost: 5
     },
		 // {
     //    Display : "Compound Bow Arrows",
     //    Item1 : "compound_bow",
     //    Item2 : "branch",
			// 	Item3 : "",
 			//   Item4 : "",
     //    Result: "arrow",
     //    Category: "AMMO",
     //    Cost: 5
     // },
		 {
        Display : "Blowgun Darts",
        Item1 : "crafted_blowgun",
        Item2 : "BP_GasPylon_2_C",
				Item3 : "",
 			  Item4 : "",
        Result: "dart",
        Category: "AMMO",
        Cost: 5
     }
	],
	Grenades : [{
				 Display : "Crafted Smoke Bomb",
				 Item1 : "rock",
				 Item2 : "BP_GasPylon_2_C",
				 Item3 : "",
				 Item4 : "",
				 Result: "crafted_smoke_bomb",
				 Category: "TRAPS",
				 Cost: 5
			},{
				 Display : "Crafted Gas Grenade",
				 Item1 : "crafted_smoke_bomb",
				 Item2 : "BP_GasPylon_2_C",
				 Item3 : "",
				 Item4 : "",
				 Result: "crafted_gas_bomb",
				 Category: "TRAPS",
				 Cost: 5
			},{
				 Display : "Crafted Explosive",
				 Item1 : "branch",
				 Item2 : "Hazard_ExplodingBarrel_C",
				 Item3 : "",
				 Item4 : "",
				 Result: "crafted_explosive",
				 Category: "ITEMS",
				 Cost: 12
			}
	]
};

rivets.bind($(PauseRecipesSelector), {
  screenData : RecipeData
});

function PauseRecipesScreen()
{
  BaseMenuScreen.call(this);
  this.Selector = PauseRecipesSelector;
  this.ActiveMenu = document.getElementById("pause-recipes-menu-options");
  this.ScreenActions = [{value:"Select"}, {value:"Back"}];
	this.ScreenName = "PauseRecipesScreen";
}

PauseRecipesScreen.prototype = Object.create(BaseMenuScreen.prototype);
PauseRecipesScreen.prototype.constructor = PauseRecipesScreen;

PauseRecipesScreen.prototype.OnCreation = function()
{
  BaseMenuScreen.prototype.OnCreation.call(this);

}

PauseRecipesScreen.prototype.OnShow = function()
{
  this.SetNewActiveMenu(this.ActiveMenu);
	console.log(RecipeData.MeleeWeapons.length);
	console.log(JSON.stringify(RecipeData.MeleeWeapons));
  BaseMenuScreen.prototype.OnShow.call(this);
}

PauseRecipesScreen.prototype.OnHide = function()
{
  BaseMenuScreen.prototype.OnHide.call(this);
}

PauseRecipesScreen.prototype.OnClosed = function()
{
  BaseMenuScreen.prototype.OnClosed.call(this);
}

//Sort recipes based on their loc name
/*function SortRecipes(r1, r2){
  var r1loc = rivets.formatters.getWeaponLocalized(r1.Result);
  var r2loc = rivets.formatters.getWeaponLocalized(r2.Result);

  if(r1loc < r2loc){
    return -1;
  } else if(r1loc > r2loc) {
    return 1;
  }
  return 0;
}

function OnGetRecipes(recipes)
{
	console.log(JSON.stringify(recipes));
  for(var i = 0; i < recipes.length; ++i)
  {
    var recipe = recipes[i];

    switch(recipe.Category.toLowerCase())
    {
      case "weapon":
        RecipeData.Weapons.push(recipe)
        break;
      case "trap":
        RecipeData.Traps.push(recipe)
        break;
      case "item":
        RecipeData.Items.push(recipe)
        break;
      case "ammo":
        RecipeData.Ammo.push(recipe)
        break;
    }
  }

  RecipeData.Weapons = RecipeData.Weapons.sort(SortRecipes);
  RecipeData.Traps = RecipeData.Traps.sort(SortRecipes);
  RecipeData.Items = RecipeData.Items.sort(SortRecipes);
  RecipeData.Ammo = RecipeData.Ammo.sort(SortRecipes);
}*/

$.extend(PauseRecipesScreen.prototype, VerticalMenuMixin);

Screens['PauseRecipes'] = PauseRecipesScreen;
