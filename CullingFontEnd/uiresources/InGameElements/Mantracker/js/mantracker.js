engine.hideOverlay();
var isVisible = false;
var currentRotation = 0;
var currentDistance = -1;
(function(){Math.clamp=function(a,b,c){return Math.max(b,Math.min(c,a));}})();
//Get our elements for use later
var trackerContent = document.getElementById('tracker-content');
var trackerHeader = document.getElementById('tracker-header');
var trackerBody = document.getElementById('tracker-body');
var trackerFooter = document.getElementById('tracker-footer');
var trackerDistance = document.getElementById('tracker-distance');
//Event Listeners
function OnContentAnimEnd(event){
    if(isVisible && trackerContent.classList.contains('anim-crt-off')){
      isVisible = false;
      trackerContent.classList.add('hidden');
    } else if(isVisible && trackerContent.classList.contains('anim-crt-on')){
      trackerContent.classList.remove('anim-crt-on');
      //Arrow here remove hidden
      //Arrow here add scale in anim
    }
}

//Setup Event Listeners (for animations)
trackerContent.addEventListener("animationend", OnContentAnimEnd);
trackerContent.addEventListener("webkitAnimationEnd", OnContentAnimEnd);

function TrackerEquipped(){
  trackerContent.classList.remove('anim-crt-off');
  trackerContent.classList.add('anim-crt-on');
  trackerContent.classList.remove('hidden');
  currentArrow = document.getElementById('current-arrow');
  currentArrow.classList.add('hidden');
  currentDistance = -1;
  isVisible = true;
}

function TrackerUnEquipped(){
  trackerContent.classList.remove('anim-crt-on');
  trackerContent.classList.add('anim-crt-off');
}

function OnArrowRotationChanged(rot){
  currentRotation = rot;
  var Arrows = document.getElementsByClassName('tracker-arrow');
  if(Arrows.length > 0){
    for(var i = 0; i < Arrows.length; ++i){
      var Arrow = Arrows[i];
      Arrow.style.transform = "rotate(" + rot + "deg)";
    }
  }
}

function RemoveCurrentArrow(){
  currentArrow = document.getElementById('current-arrow');
  if(currentArrow){
    currentArrow.id = "";
    currentArrow.classList.remove('arrow-scale-in');
    currentArrow.classList.add('arrow-scale-out');
    currentArrow.classList.add('dying-arrow');
    currentArrow.addEventListener("webkitAnimationEnd", function(){
      console.log("trying to remove arrow");
      this.remove();
    });
  }
}

function OnArrowDistanceChanged(newDist){
  if(newDist == -1){
    RemoveCurrentArrow();
    trackerDistance.innerHTML = "?";
    return;
  }

  var clampedDist = Math.clamp(newDist, 0, 10000);
  newDist = Math.floor((clampedDist / 10000) * 3);

  clampedDist = Math.ceil(clampedDist / 100);
  if(clampedDist == 100)
  {
    trackerDistance.innerHTML = "99+";
  } 
  else 
  {
    trackerDistance.innerHTML = clampedDist;
  }

  if(currentDistance == newDist){
    return;
  }

  currentDistance = newDist;

  RemoveCurrentArrow();

  currentArrow = document.createElement('div');
  currentArrow.classList.add('hidden');
  currentArrow.classList.add("arrow-scale-in");
  currentArrow.classList.add("tracker-arrow");
  currentArrow.id = 'current-arrow';
  
  switch(Math.clamp(newDist, 0, 3)){
    case 0:
      currentArrow.style.backgroundImage = "url('images/mantracker_red_arrow.png')";
	  currentArrow.classList.remove('hidden');
	  break;
    case 1:
      currentArrow.style.backgroundImage = "url('images/mantracker_yellow_arrow.png')";
	  currentArrow.classList.remove('hidden');
	  break;
    case 2:
      currentArrow.style.backgroundImage = "url('images/mantracker_green_arrow.png')";
	  currentArrow.classList.remove('hidden');
	  break;
  }
  currentArrow = trackerBody.appendChild(currentArrow);
  currentArrow.style.transform = "rotate(" + currentRotation + "deg)";
}

engine.on("TrackerEquipped", function(){
  TrackerEquipped()
});

engine.on("TrackerUnEquipped", function(){
  TrackerUnEquipped()
});

engine.on("SetArrowDistance", function(dist){
  OnArrowDistanceChanged(dist);
});

engine.on("SetArrowRotation", function(rot){
  OnArrowRotationChanged(Math.floor(rot));
});
/*
$('.tracker-content').on("animationend webkitAnimationEnd", function(e){
  if(isVisible && $('.tracker-content').hasClass('anim-crt-off')){
    isVisible = false;
    $('.tracker-content').addClass('hidden');
  } else if(isVisible && $('.tracker-content').hasClass('anim-crt-on')){
    $('.tracker-content').removeClass('anim-crt-on');
    $('.tracker-arrow').removeClass('hidden');
    $('.tracker-arrow').addClass('arrow-scale-in');
  }
})

$('.tracker-arrow').on("animationend webkitAnimationEnd", function(e){
  doRotate = true;
});

function TrackerEquipped()
{
  $('.tracker-content').removeClass('anim-crt-off');
  $('.tracker-content').addClass('anim-crt-on');
  $('.tracker-content').stop(true).css({top: 0, left: 0});
  $('.tracker-content').removeClass('hidden');
  isVisible = true;
}

function TrackerUnEquipped()
{
  $('.tracker-content').removeClass('anim-crt-on');
  $('.tracker-content').addClass('anim-crt-off');
}
*/
var rotation = 0;
var doRotate = false;

setInterval(function(){
  if(!doRotate){
    return;
  }
  OnArrowRotationChanged(rotation);
  rotation++;
  if(rotation > 360){
    rotation = 0;
  }
}, 15);

var currDist = 0;
setInterval(function(){
  if(!doRotate){
    return;
  }

  OnArrowDistanceChanged(currDist);
  currDist++;
  if(currDist > 2){
    currDist = 0;
  }
}, 1000);

OnArrowDistanceChanged(1);
