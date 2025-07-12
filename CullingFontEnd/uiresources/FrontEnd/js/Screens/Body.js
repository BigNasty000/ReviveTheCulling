const BodySelector = document.getElementById("body-menu");
const Gender_Male = 0;
const Gender_Female = 1;
const Gender_MaleBot = 2;
const Gender_FemaleBot = 3;
const SkinToneMax = 5;
const HeadMax = 2;

//Add your CSS files here
$('head').append('<link rel="stylesheet" type="text/css" href="css/Screens/Body.css">');

var BodyScreenData = {
  Gender : Gender_Male,
  Head : 0,
  SkinTone : 0
}

rivets.bind($(BodySelector), {
  screenData : BodyScreenData
});

function BodyScreen()
{
  BaseMenuScreen.call(this);
  this.Selector = BodySelector;
  this.ActiveMenu = document.getElementById("body-menu-options");
  this.ScreenActions = [{value:"DecrementOption"}, {value:"IncrementOption"}, {value:"Back"}];
}

BodyScreen.prototype = Object.create(BaseMenuScreen.prototype);
BodyScreen.prototype.constructor = BodyScreen;

BodyScreen.prototype.OnCreation = function()
{
  BaseMenuScreen.prototype.OnShow.call(this);
  this.RefreshBodyData();
}

BodyScreen.prototype.RefreshBodyData = function()
{
  engine.call("GetBodyData").then($.proxy(function(result){
    this.OnGetBodyData(result);
  },this));
}

BodyScreen.prototype.OnMouseClicked = function(elem)
{
  if(elem.dataset && elem.dataset.picker)
  {
    console.log("Elem Clicked: " + elem.nodeName);
    if(this.HasMenuItemElem(elem))
    {
      var parent = this.GetAbsoluteMenuItemElem(elem);
      if(parent.dataset && parent.dataset.pickerConfigVar)
      {
        var direction = elem.dataset.picker;
        var configVar = parent.dataset.pickerConfigVar;
        var numDir = direction == "right" ? 1 : -1;
        console.log("Picker clicked " + direction + " to change " + configVar + " (" + numDir + ")");
        this.IncrementSettings(numDir, configVar);
      }
      else
      {
        console.warn("Picker element parent (" + parent.nodeName + ") missing dataset vars " + JSON.stringify(parent.dataset));
      }
    }
    else
    {
      console.warn("Clicked a picker element that isn't apart of current Screen");
    }
  }

  BaseMenuScreen.prototype.OnMouseClicked.call(this, elem);
}

BodyScreen.prototype.OnGetBodyData = function(bodydata)
{
  BodyScreenData.Gender = bodydata.Gender;
  BodyScreenData.Head = bodydata.Head;
  BodyScreenData.SkinTone = bodydata.SkinTone;
}

BodyScreen.prototype.IncrementSettings = function(direction, setting)
{
  BodyScreenData[setting] += direction;
  var min = 0;
  var max = 0;
  var setter = "";

  switch(setting)
  {
    case "Gender":
      max = Gender_Female;
      setter = "SetGender";
      break;
    case "Head":
      max = HeadMax;
      setter = "SetHeadType";
      break;
    case "SkinTone":
      max = SkinToneMax;
      setter = "SetSkinTone";
      break;
    default:
      console.warn("Incrementing unsupported setting: " + setting);
      return;
  }

  if(BodyScreenData[setting] > max)
  {
    BodyScreenData[setting] = min;
  }
  else if(BodyScreenData[setting] < min)
  {
    BodyScreenData[setting] = max;
  }
  var self = this;
  engine.call(setter, BodyScreenData[setting]).then(function(){
    self.RefreshBodyData();
  })
}

BodyScreen.prototype.OnOptionElemSelected = function(elem)
{
  console.log("Elem Clicked: " + elem.nodeName);
  /*
  if(elem.dataset && elem.dataset.index)
  {
    var index = Number(elem.dataset.index);
    if(index < AirdropScreenData.Airdrops.length)
    {
      var airdrop = AirdropScreenData.Airdrops[index];
      engine.call("SetAirdropPackage", airdrop.AssetName).then($.proxy(function(){
        this.RefreshAirdrops();
      }, this));
    }
  }
  */
}

BodyScreen.prototype.IncrementOnElement = function(elem, direction)
{
    if(this.HasMenuItemElem(elem) && elem.dataset != undefined && elem.dataset.pickerConfigVar != undefined)
    {
        var pickerConfigVar = elem.dataset.pickerConfigVar;
        this.IncrementSettings(direction, pickerConfigVar);
    }
}

$.extend(BodyScreen.prototype, VerticalMenuMixin);

Screens['Body'] = BodyScreen;
