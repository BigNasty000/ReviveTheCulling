//Add your CSS files here
$('head').append('<link rel="stylesheet" type="text/css" href="css/Screens/DynAppearanceCategory.css">');

function DynAppearanceCategoryScreen(args)
{
  BaseMenuScreen.call(this);
  this.custType = args.custType;
  //DynGenScreen.call(this, args.elemSource);
  this.InitDynGen(args.elemSource);
  this.ScreenActions = [{value: "Select"}, {value: "Back"}];
  this.screenData = {
    Categories : [],
    ScreenName : ""
  };
}

//DynAppearanceCategoryScreen.prototype = Object.create(DynGenScreen.prototype);
//$.extend(DynAppearanceCategoryScreen.prototype, BaseMenuScreen.prototype);
DynAppearanceCategoryScreen.prototype = Object.create(BaseMenuScreen.prototype);
DynAppearanceCategoryScreen.prototype.constructor = DynAppearanceCategoryScreen;

DynAppearanceCategoryScreen.prototype.OnCreation = function()
{
  //DynGenScreen.prototype.OnCreation.call(this);
  this.OnCreation_DynGen();
  this.ActiveMenu = $(this.Selector).find(".vertical-list-menu")[0];
  this.rivetsBinder = rivets.bind($(this.Selector), {
    screenData : this.screenData
  });
  this.OnShow();
}

DynAppearanceCategoryScreen.prototype.OnShow = function()
{

  engine.call("GetCategoriesForCustType", this.custType).then($.proxy(function(categories){
    console.log("Got Categories")
    this.OnGetCategories(categories);
    BaseMenuScreen.prototype.OnShow.call(this);
    }, this)
  );

  switch(this.custType)
  {
    case "hair":
      engine.call("SetHeadCamera");
      break;
    case "hat":
      engine.call("SetCharacterCamera");
      break;
    case "torso":
      engine.call("SetCharacterCamera");
      break;
    case "legs":
      engine.call("SetCharacterCamera");
      break;
    default:
      console.warn("Unsopported Customization Type: " + this.custType);
      return;
  }
}

DynAppearanceCategoryScreen.prototype.OnClosed = function()
{
  if(this.rivetsBinder != undefined)
  {
    this.rivetsBinder.unbind();
  }
  //DynGenScreen.prototype.OnClosed.call(this);
  this.OnClosed_DynGen();
}

DynAppearanceCategoryScreen.prototype.OnGetCategories = function(categories)
{
  console.log("Got Categories for " + this.custType + ": " + JSON.stringify(categories));
  this.screenData.Categories = categories;
  this.screenData.ScreenName = this.custType.toUpperCase();
  this.ResetFocus();
  $(this.Selector).find('li').hover(function(event){
    if(event)
    {
      OnMouseHover(event.target);
    }
  });
}

DynAppearanceCategoryScreen.prototype.OnOptionElemSelected = function(element)
{
    console.log("OnOptionElemSelected DynAppearanceCategory");
    if(element.dataset == undefined || element.dataset.category ==  undefined)
    {
      console.log("Appearance Item Element missing category dataset member.");
      return;
    }

    var category = element.dataset.category;
    PushScreen("DynAppearanceItem", {custType : this.custType, category : category, elemSource : "AppearanceItemScreen"});
    return;
}

$.extend(DynAppearanceCategoryScreen.prototype, VerticalMenuMixin);
$.extend(DynAppearanceCategoryScreen.prototype, DynGenMixin);

Screens['DynAppearanceCategory'] = DynAppearanceCategoryScreen;
