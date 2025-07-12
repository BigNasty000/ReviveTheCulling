/**
 * Created by jimwe on 7/21/2015.
 */

function TooltipContainer(id, options) {
	if(options == undefined) {
		this.options = {
			showTime: 5000,
			positionTag: "top-right",
			elementTag: 'tooltip-default',
			contentTag: 'tooltip-content-default',
			titleTag: 'tooltip-title-default',
			messageTag: 'tooltip-message-default',
			maxTooltips: 5,
		};

	} else {
		this.options = options;
	}

	this.$container = $('<div/>').attr('id', id)
		.addClass(this.options.positionTag)
		.addClass('tooltip-container')
		.addClass('container-fluid')
		.attr('role', 'alert');
	this.$container.appendTo($('body'));
	this.id = id;
}

TooltipContainer.prototype.CreateTooltip = function(title, message){
	//Make the root
	var $rootElement = $('<div/>')
		.addClass('container-fluid')
		.addClass(this.options.elementTag)
		.addClass('well');

	if(this.options.showTime > 0) {
		$rootElement.onShow = function(){
			$rootElement.animate({ opacity: 1 }, 2000);
			$rootElement.hideTimer = setTimeout($rootElement.onHide, 4000);
		};

		$rootElement.onHide = function(){
			$rootElement.animate({ opacity: 0 }, 2000);
			setTimeout($rootElement.removeTooltip, 2000);
		};

		$rootElement.removeTooltip = function(){
			$rootElement.remove();
		}
	} else {
		$rootElement.onShow = function(){
			$rootElement.animate({ opacity: 1 }, 2000);
		};
	}

	//Now the content container
	var $content = $('<div/>');
	$content.addClass(this.options.contentTag);

	//Add the title to the content container
	var $title = $('<div/>');
	$title.addClass(this.options.titleTag);
	$title.append(title);
	$content.append($title);

	//Add the message to the content container
	var $message = $('<div/>');
	$message.addClass(this.options.messageTag);
	$message.append(message);
	$content.append($message);

	//And now attach the content container to root
	$rootElement.append($content);

	//and now add it to the root container, returning the element for ref later
	this.$container.prepend($rootElement);
	console.log("Appending new root element to container");
	if($rootElement.onShow != undefined){
		$rootElement.onShow();
	}

	if(this.options.maxTooltips > 0 && $('#' + this.id).find('.well').length > this.options.maxTooltips){
		$('#' + this.id).find('.well').last().remove();
	}
	return $rootElement;
};

