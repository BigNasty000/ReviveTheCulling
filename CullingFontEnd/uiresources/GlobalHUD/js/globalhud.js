engine.hideOverlay();

ItemData = [];

engine.on("AddToast", function(header, text, duration){
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

engine.on("OnNewEntitlements", function(entitlements){
  console.log("New Entitlements Engine Call");
  OnNewEntitlements(entitlements);
});

engine.on("OnNewEntitlement", function(entitlement){
  console.log("New Entitlement Engine Call");
  OnNewEntitlement(entitlement);
});

function ConcatItemData(data)
{
  ItemData = ItemData.concat(data.items);
}

function GetItemDataForItemDef(itemdef)
{
    for(var i = 0; i < ItemData.length; ++ i){
      if (ItemData[i].itemdefid == itemdef){
        return ItemData[i];
      }
    }

    return undefined;
}

var ToastTemplate = document.getElementById('cloned-elements').getElementsByClassName('toast-object-container')[0];

function AddToast(header, text, duration, icon)
{
  var ToastContainer = document.getElementById("toast-container");
  var newToast = ToastTemplate.cloneNode(true);
  var toastHeader = newToast.getElementsByClassName("toast-object-header")[0];
  var toastText = newToast.getElementsByClassName("toast-object-text")[0];
  var toastIcon = newToast.getElementsByClassName("toast-object-left-image")[0];

  toastHeader.innerHTML = header;
  toastText.innerHTML = text;
  if(icon && icon != undefined){
      toastIcon.style.backgroundImage = 'url("' + icon + '")';
  }

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

function OnNewEntitlements(entitlements)
{
  console.log("New Entitlements pushed to UI");
  for(var i = 0; i < entitlements.length; ++i){
    var itemDef = GetItemDataForItemDef(entitlements[i]);
    console.log("New Entitlement Toast: " + itemDef.name);
    AddToast("REWARD!", itemDef.name, 20000, itemDef.icon_url);
  }
}

function OnNewEntitlement(entitlement)
{
  console.log("New Entitlement pushed to UI");
  var itemDef = GetItemDataForItemDef(entitlement);
  console.log("New Entitlement Toast: " + itemDef.name);
  AddToast("REWARD!", itemDef.name, 20000, itemDef.icon_url);
}

function TestStuff()
{
  AddToast("New Item!", "A sick item, brah!", 500000, "http://victory.xaviant.com/images/game_data/Bowler_Hat.png" );
}
/*
function TestStuff(){
  setTimeout(function(){
    AddToast("TEst toast", "test text", 5000);
    TestStuff();
  }, 2500);
}

TestStuff();
*/
