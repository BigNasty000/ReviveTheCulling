

function ShowGameMessage(message, duration) {
	var $container = $('<div/>').attr('id', 'GameMessage');
	var $rootElement = $('<div/>').addClass('gameMessage-root');
	
	var $backgroundElement = $('<div/>').addClass('gameMessage-bg');
	$backgroundElement.appendTo($rootElement);

	var $top = $('<div/>').addClass('gameMessage-topbar');
	$top.appendTo($rootElement);

	var $message = $('<div/>').addClass('gameMessage-message');
	$message.appendTo($rootElement);

	var $bottom = $('<div/>').addClass('gameMessage-bottombar');
	$bottom.appendTo($rootElement);	

	$rootElement.appendTo($container);
	$container.prependTo($('#GameMessageContainer'));

	$message.html(message);

	$backgroundElement.addClass('gameMessage-fadein');
	$message.addClass('gameMessage-fadein');
	$top.addClass('gameMessage-scaleIn');
	$bottom.addClass('gameMessage-scaleIn');
	setTimeout(this.OnDurationEnd, duration, $backgroundElement, $message, $top, $bottom, $container);
	return $container;
}

function OnDurationEnd($backgroundElement, $message, $top, $bottom, $container){
	console.log("onDurationEnd");
	$backgroundElement.removeClass('gameMessage-fadein');
	$message.removeClass('gameMessage-fadein');
	$top.removeClass('gameMessage-scaleIn');
	$bottom.removeClass('gameMessage-scaleIn');

	$backgroundElement.addClass('gameMessage-fadeout');
	$message.addClass('gameMessage-fadeout');
	$top.addClass('gameMessage-scaleOut');
	$bottom.addClass('gameMessage-scaleOut');
	$container.addClass('gameMessage-fadeout');
	$top.one('webkitAnimationEnd oanimationend msAnimationEnd animationend', function(e){
		
		$backgroundElement.remove();
		$message.remove();
		$top.remove();
		$bottom.remove();
		$container.remove();
		$container.addClass('gameMessage-hidden');
	});
}