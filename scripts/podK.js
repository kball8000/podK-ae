$( function(){
    //Audio controls click event handlers
    $( '#playBtn' ).click(myAudio.playEpisode);
    $( '#rewindBtn' ).click(myAudio.rewindEpisode);
    $( '#fastForwardBtn' ).click(myAudio.fastForwardEpisode);
    $( '#muteBtn' ).click(myAudio.toggleSound);
});

var myAudio = function(){
    var episode = document.getElementsByTagName('audio')[0];
    var episodeCurrentPlaybackPosition = document.getElementById('episodeCurrentPlaybackPosition');
    var episodeTotalTime = document.getElementById('durationepisodeCurrentPlaybackPosition');

    function playEpisode(){
        if(episode.paused){
            episode.play();
        }
        else{
            episode.pause();
        }
    }

    function playSelectedEpisode(ep){
        episode.src = ep;
        episode.play();
    }
    
    function displayTime(){
        episodeCurrentPlaybackPosition.innerHTML = readableTime(episode.currentTime);
        episodeTotalTime.innerHTML = readableTime(episode.duration);
    }

    function fastForwardEpisode(){
        var t = episode.currentTime + 30;
        episode.currentTime = t;
    }

    function rewindEpisode(){
        var t = episode.currentTime - 15;
        episode.currentTime = t;
    }
    
    function toggleSound(){
    // For the icons visit: http://www.fileformat.info/info/unicode/char/search.htm?q=speaker&preview=entity
    // For the uriencode bit, visit: http://www.the-art-of-web.com/javascript/escape/
        var icon = document.getElementById('muteBtn');
        if(episode.muted){
            episode.muted=false;
            icon.innerHTML = 'Mute';
//            icon.innerHTML = decodeURI('%F0%9F%94%89');
        }
        else{
            episode.muted=true;
            icon.innerHTML = 'Unmute';
//            icon.innerHTML = decodeURI("%F0%9F%94%87");
        }
    }

    function readableTime(t0){
        var hr = 0;            /* number values */
        var min = 0;
        var s = 0;
        var hrStr = '0:';    /* string outputs */
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
        playEpisode:playEpisode,
        playSelectedEpisode:playSelectedEpisode,
        rewindEpisode:rewindEpisode,
        fastForwardEpisode:fastForwardEpisode,
        toggleSound:toggleSound,
        displayTime:displayTime
    };
}();