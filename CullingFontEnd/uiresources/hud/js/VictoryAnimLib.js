
function PulseSize(maxScaleX, maxScaleY, time, selector, numRepeats)
{
	var scaleVal = 'scale(' + maxScaleX + ',' + maxScaleY + ')';
	var scale = [
		{percent: 0.5, transform: scaleVal },
		{percent: 1, transform: 'scale(1,1)' }
	];
	
	if(numRepeats == null)
	{
		numRepeats = 0;
	}

	var PulseSizeAnim = new CoherentAnimation({repeat: numRepeats});
	PulseSizeAnim.caTo({
		selector: selector,
		anims: scale,
		seconds: time
	}).play();

	//If we're looping infinitely, we probably want a reference to the CAnim
	if(numRepeats == -1)
	{
		return PulseSizeAnim;
	}
}

function PulseOpacity(opacity, time, selector, numRepeats)
{
	var pulse = [
		{percent: 1, opacity: opacity},
		];

	if(numRepeats == null)
	{
		numRepeats = 0;
	}

	var PulseOpacityAnim = new CoherentAnimation({repeat: numRepeats, yoyo: true});
	PulseOpacityAnim.caTo({
				selector: selector,
				anims: pulse,
				seconds: time
			}).play();

	if(numRepeats == -1)
	{
		return PulseOpacityAnim;
	}
}