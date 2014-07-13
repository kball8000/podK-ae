var myAudio = function(){
	var gib = document.getElementsByTagName('audio')[0];
	var gibTime = document.getElementById('currentGibTime');
	var gibTotalTime = document.getElementById('durationGibTIme');

    function playSelectedEpisode(ep){
        console.log('I will play ');
        console.log(ep);
        gib.src=ep;
	}

	function playAudio(){
		if(gib.paused){
			gib.play();
		}
		else{
			gib.pause();
		}
	}

	function stopAudio(){
		gib.currentTime = 0;
		gib.pause();
	}

	function displayTime(){
		gibTime.innerHTML = readableTime(gib.currentTime);
		gibTotalTime.innerHTML = readableTime(gib.duration);
	}

	function fastForward(){
		var t = gib.currentTime + 30;
		gib.currentTime = t;
	}

	function rewind(){
		var t = gib.currentTime - 15;
		gib.currentTime = t;
	}
	
	function readableTime(t0){
		var hr = 0;			/* number values */
		var min = 0;
		var s = 0;
		var hrStr = '0:';	/* string outputs */
		var minStr = '00:';
		var sStr = '00'; 

		var out = ''; /*output to screen */
		
		t0 = Math.floor(t0);

		hr = (t0 >= 3600) ? Math.floor(t0 / 3600) : 0;
		t0 = t0 - hr*3600;

		min = (t0 >= 60) ? Math.floor(t0 / 60) : 0;
		t0 = t0 - min*60;

		s = t0;

		hrStr = (hr > 0) ? hr.toString() + ':' : '';
		minStr = (min < 10 && hr > 0) ? '0' + min.toString() + ':' : min.toString() + ':';
		sStr = (s < 10) ? '0' + s.toString() : s.toString();

		out = hrStr + minStr + sStr;

		return out;
	}
	
	return{
		playAudio:playAudio,
		playSelectedEpisode:playSelectedEpisode,
		stopAudio:stopAudio,
		rewind:rewind,
		fastForward:fastForward,
		displayTime:displayTime
	};
}();