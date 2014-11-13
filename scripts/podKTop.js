// **--   jQuery mobile overrides:   --** 
/* $.mobile.page.prototype.options.domCache = true; */

// Global variables / objects
var podsyData = (function(){
    
    var dict = {};

    function get(key){
        return dict[key];
    }

    function getAll(){
        return dict;
    }

    function set(key, value){
        dict[key] = value;
/*         console.log('podsyData, setting: key: ' + key + ', value: ' + dict[key]);
        console.dir(dict); */
    }
        
    function remove(func){
        delete dict[func];
    }

    function removeAll(){
        dict = {};
    }
    
    return {
        set: set,
        get: get,
        remove: remove,
        removeAll: removeAll
    };
}());

var timerStorage = (function(){
    
    var dict = {};

    function get(func){
        return dict[func];
    }

    function getAll(){
        return dict;
    }

    function set(func, timer){
        dict[func] = timer;
    }
    
    function clear(func){
/*         console.log('clearing: ' + func + ', ' + dict[func]) ; */
        clearInterval(dict[func]);
        dict[func] = false;
    } 

    function clearAll(){
        for (var i in dict){
            clearInterval(dict[i]);
            dict[i] = false;
        }
    } 
    
    return {
        set: set,
        get: get,
        getAll: getAll,
        clear: clear,
        clearAll: clearAll
    };
}());

// **--   Home - Pocast page script   --** 
function getPlayerElem(){
    var audio = document.getElementById('audioPlayer');
    var video = document.getElementById('videoPlayer');

    if (audio){
        return audio;
    }
    else if(video){
        return video;
    }
    else{
        return false;
    }
}

function displayNotification(notification){
    console.log('will display notification');
}

function createPlaylistListviewItem(add){
    var html = '';

    html = "<li data-icon='false' ";
    html += "data-episode-url='" + add.episode_url + "' ";
    html += "data-podcast-id='" + add.urlsafe_key + "' ";
    html += "class='playlistItem'>";
    html += "<a href='#'>";
    html += "<h2>" + add.podcast_title + "<\/h2>";
    html += "<p>" + add.episode_title + "<\/p>";
    html += "<p class='ui-li-aside episodeCurrentTime' ";
    html += "data-playback-time=0 <b>0<\/b><\/p>";
    html += "<\/a>";
    html += "<a href='#' class='deletePlaylistBtn'><\/a>";
    html += "<\/li>";
    
    console.log('createPlaylistListviewItem, html' + html);

    return html;
}

function createPodcastListViewItem(episode){
    var html = "<li data-episode-url='" + episode.episode_url + "'>";
    html += "<a href='#' class='addToPlaylist'> ";
    html += episode.episode_title + 'Time: ' + episode.current_time;
    html += "<\/a><\/li>";
    
    return html;
}

function removePodcastListviewItem(listview, remove){
    var items = $(listview).find('li');
    console.log('removelistviewitem, items to remove: ' + items);
    console.dir(remove);
    for(var i=0; i<remove.length; i+=1){
        for(var j=0; j<items.length; j+=1){
            console.log('removelistviewitem, episode to remove: ' + remove[i].episode_url);
            if ($(items[j]).data('episode-url') === remove[i].url){
                $(items[j]).remove();
                break;
            }
        }
    }
}

function removeOverflow(li){
    var maxLength = 100;
    var listLength = li.childElementCount;
    
    while( listLength > maxLength - 1){
        $(li.children[listLength]).remove();
        listLength -= 1;
    }
}

function addToNewListListview(newEpisodes){
    var listview = document.getElementById('newList');
    var html;

    for(var i=0; i<newEpisodes.length; i+=1){
        html = createPlaylistListviewItem(newEpisodes[i]);
        $(listview).prepend(html);
    }

    removeOverflow(listview);

    $(listview).listview('refresh');    
}

function addToPodcastListview(podcast, add){
    var podcast_listview = $(podcast).find('ul');
    var html;
    for(var i=0; i<add.length; i+=1){
        html = createPodcastListViewItem(add[i]);
        $(podcast_listview).prepend(html);
    }
    $(podcast_listview).listview('refresh');
}

function updateAllPodcastsHtml(allNewEpisodes){
/*  Only runs if podcast page is unavailable for some reason, so only updating New 
    page */
    var length = allNewEpisodes.length;
    for (var i=0; i<length; i+=1){
        allNewEpisodes[i].add.reverse();     // after op: oldest to newest.
        addToNewListListview(allNewEpisodes[i].add);
    }
}

function setSliderLocation(player){
    var time = player.currentTime;
    var duration = player.duration;
    
    $('#playerSlider').prop('value', (time/duration*100));
    $('#playerSlider').slider('refresh');
}

function colorSliderBackround(start, length, roundStart, roundEnd){
    roundStart = (roundStart) ? roundStart : false;
    roundEnd = (roundEnd) ? roundEnd : false;

    var div = document.createElement('div');
    div.className = 'seekableSegment';
    div.style.left = start + 'px';
    div.style.width = length + 'px';
    if(roundStart){
      div.style.borderTopLeftRadius = 5 + 'px';
      div.style.borderBottomLeftRadius = 5 + 'px';
    }
    if(roundEnd){
      div.style.borderTopRightRadius = 5 + 'px';
      div.style.borderBottomRightRadius = 5 + 'px';
    }
    $('.ui-slider-track').prepend(div);
  }

function displayAudioSeekable(player){
    var duration = player.duration; // seconds
    /* var seekable = player.buffered; */
    var seekable = player.seekable;
    var widthSlider = $('.ui-slider-track').prop('clientWidth')-1;
    var roundStart, roundEnd = false;
    var start_s, end_s, start_percent, end_percent, start_px, width_px;
    console.log('displayAudioSeekable, ' + ', ' + seekable.end(0) + ', ' + seekable.start(0) + ', ' + seekable.length );

    $('.seekableSegment').remove();

    for(var i=0; i<seekable.length; i+=1 ){
        start_s = seekable.start(i);
        end_s = seekable.end(i);
        
        start_percent = start_s / duration;
        end_percent = end_s / duration;
        
        start_px = Math.floor(start_percent * widthSlider);
        width_px = Math.floor(end_percent * widthSlider) - start_px;
        
        if (start_px<5){
            roundStart = true;
        }
        if ((end_percent > 0.99)){
            roundEnd = true;
        }
        
        colorSliderBackround(start_px, width_px, roundStart, roundEnd);
        roundStart = roundEnd = false;
    }

    if(seekable.length === 1 || seekable.end(0) === duration ||
        seekable.start(0) === 0){
    console.log('going to make seekable false');
    podsyData.set('runSeekable', false);
    }
}

function ifUpdateSeekable(player){
    if(podsyData.get('runSeekable')){
        displayAudioSeekable(player);
    }
}

function savePlaybackTime(player){
    var playerDiv = document.getElementById('playerDiv');
    
    var data = {
        urlsafe_key: $( playerDiv ).data('podcast-id'),
        episode_url:  $( playerDiv ).data('episode-url')
    };

    // Save timer to global variable so it can be cleared on pauseTrack function.
    if (!timerStorage.get('playbackTime')){
        timerStorage.set('playbackTime', setInterval( function(){
            data.current_time = Math.floor( player.currentTime );
            var request = $.ajax({
                url: '/saveplaybacktime',
                type: 'POST',
                data: data
            });
            console.log('Saving time to datastore, timer(right), data(below):' + timerStorage.get('playbackTime'));
            console.dir(data);
        }, 15000));
    }
}

function startSliderTimer(player){
    if(!timerStorage.get('slider')){
        timerStorage.set('slider', setInterval( function(){
            setSliderLocation(player);
        }, 400));
    }
}

function startSeekableTimer(player){
    console.log('startSeekableTimer...');
    // This insures display seekable runs at least once to color slider background.
    podsyData.set('runSeekable', true);
    
    if(!timerStorage.get('seekable')){
        timerStorage.set('seekable', setInterval( function(){
            ifUpdateSeekable(player);
        }, 3000));
    }
}

function playTrack(e){
    var player = e.target;
    
    /* Update data storage  */
    savePlaybackTime(player);
    
    /* Update UI with timers while playing */
    $('#playBtn').html('||');
/*     $('#playBtn').html('&#x2590;&#x2590;'); */
    startSliderTimer(player);
    startSeekableTimer(player);
}

function pauseTrack(e){
    /* Update UI */
    $('#playBtn').html('&#9654;');
    
    // Clear timers used to update UI while track is playing.
    timerStorage.clear('playbackTime');
    timerStorage.clear('slider');
    timerStorage.clear('seekable');
}

function playTrackBtn(e){
    var player = getPlayerElem();

    if(player.paused){
        player.play();
    }
    else{
        player.pause();
    }
}

function secondsToReadableTime(time_s, duration){

    var hr = Math.floor(time_s/3600);
    var min = Math.floor((time_s % 3600)/60);
    var s = Math.floor((time_s % 60));

    if(duration >= 3600){
        hr = (hr>0) ? hr.toString() + ':' : '0:' ;
    }
    else{
        hr = (hr>0) ? hr.toString() + ':' : '' ;
    }
    if(time_s > 3600 && min < 10 || duration >= 3600 && min < 10){
        min = '0' + min.toString() + ':' ;
    }
    else{
        min = min.toString() + ':' ;
    }
    s = (s>9) ? s.toString() : '0' + s.toString();

    return (hr+min+s);
}

function filterListByDataUrl(list, url){
    var result = $('#' + list +' li').filter(function(){
        return ($(this).data('episode-url') === url);
    });

    return (result || false);
}

function displayPlayerTime(event, time){
    /* Displays the time in the player region of the ui.*/
    /* Temporarily also displays the playlist region of the ui.*/
    
    var player          = getPlayerElem();
    var playerDiv       = document.getElementById('playerDiv');
    var playlistList    = document.getElementById('playlist');

    var playerTime_s    = Math.floor(player.currentTime);  // time in seconds
    var duration        = Math.floor(player.duration);
    var episodeUrl      = $(playerDiv).data('episode-url');

    // If we are just updating the ui, take time from player, but if we are 
    // updating based on slide position, use value from call within slide funciton
    if (time){
        player.currentTime = time;
        playerTime_s = time;
    }
    
    var readableTime = secondsToReadableTime(playerTime_s, duration);

/*     var playlistItem = findItemPlaylist(episodeUrl); */
    var playlistItem = filterListByDataUrl('playlist', episodeUrl);
    var playlistItemTime = $(playlistItem).find('.episodeCurrentTime');

    // Update player ui and data
    $('#playerTimeCurrent').html(readableTime);
    $('#playerTimeCurrent').data('playback-time', playerTime_s);

    // Update playlist ui and data
    playlistItemTime.html(readableTime);
    playlistItemTime.data('playback-time', playerTime_s);    
}

function setPlayerAttributes(player, data){
    var timer;
    var playerDiv = document.getElementById('playerDiv');
    var myE = {'type': 'setPlayerAttributes from init'};
    timerStorage.clear('setPlayerAttributes');
    timer = setInterval( function(){
        console.log('setPlayerAttributes, ready state' + player.readyState + ', time: ' + player.currentTime);
        timerStorage.set('setPlayerAttributes', timer);
        if (player.readyState > 1){
            console.log('setPlayerAttributes, setting time and playing');
            player.currentTime = data.currentTime;
            displayPlayerTime(myE, data.currentTime);
            player.play();
            setSliderLocation(player);
            timerStorage.clear('setPlayerAttributes');
        }
    }, 300);
    $( playerDiv ).data('episode-url', data.url);
    $( playerDiv ).data('podcast-id', data.podcast_urlsafe_key);
}

function setTrackAttributes(result){
    $('#playerPodcastTitle').html(result.podcast_title);
    $('#playerEpisodeTitle').html(result.episode_title);
}

function saveNowPlaying(player, data){
    // Save this new 'now playing track' to data store.
    var request = $.ajax({
        url:'/savenowplaying',
        type: 'POST',
        data: data
    });
    request.done( function(result){
        // Set values in player to the now current title
        setTrackAttributes(result);
    });
}

function markListenedPodcast(data){
    
    data = {
        url: 'http://www.podtrac.com/pts/redirect.mp3/twit.cachefly.net/audio/sn/sn0479/sn0479.mp3',
        podcast_key: 'ahRkZXZ-a2JhbGwtdGVzdC10b29sc3I_CxIMcG9kY2FzdF9mZWVkIhlkZWZhdWx0X3BvZGNhc3RfZmVlZF9saXN0DAsSB1BvZGNhc3QYgICAgIDYswoM',
        list_key: 'ahRkZXZ-a2JhbGwtdGVzdC10b29sc3JACxIMcG9kY2FzdF9mZWVkIhlkZWZhdWx0X3BvZGNhc3RfZmVlZF9saXN0DAsSCFBsYXlsaXN0GICAgICA2P0KDA'
    };
    if($('#subscriptionList')){
        console.log('will change color class of episode');
        
    }
}

function saveListenedStatus(data){
    var request = $.ajax({
        url: '/savelistenedstatus',
        type: 'POST',
        data: data
    });
}

function removeFromPlaylist(elem, data){
    var notification = {
        message: 'Server error: Playlist is unchanged.',
        displayTime: 1000
    };

    // Remove item from datastore
    var request = $.ajax({
        url: '/removeepisodefromlist',
        type: 'POST',
        data: data
    });
    $( elem ).fadeOut(500);
    request.done( function(){
        console.log('Successfully removed from playlist');
        $( elem ).remove();
    });
    request.fail( function(){
        $( elem ).delay(1000).fadeIn(1000);
        displayNotification(notification);
        console.log('failed to remove: ' +  data.url);
    });
}

function removeFromPlaylistBtn(e){
    e.preventDefault();
    e.stopImmediatePropagation();
    
    var elem = $( this ).parent(); 

    var data = {
        url: $( elem ).data('episode-url'),
        list_key: $('#playlist').data('playlist-id')
    };
    
    removeFromPlaylist(elem, data);
}

function removeFromPlaylistEnded(url){
    // Runs when track has finished playing.
    var elem = filterListByDataUrl('playlist', url);
    
    var data = {
        url: url,
        podcast_key: $('#playerDiv').data('podcast-id'), // Needed to save listening status
        list_key: $('#playlist').data('playlist-id')
    };

    removeFromPlaylist(elem, data); // UI and datastore
    saveListenedStatus(data);       // Save this to datastore.
    markListenedPodcast(data);      // UI of podcast page
}

function removeAVHtml(player){
    /* This line is required to keep browser from continuing to download content*/
    player.src = '';
    $(player).remove();
}

function addPlayerEventListeners(player){
    $( player ).on( 'play', playTrack);
    $( player ).on( 'pause', pauseTrack);
    $( player ).on( 'timeupdate', displayPlayerTime);
    $( player ).on( 'ended', playNextTrack);
}

function createAVHtml(type, url){
    var html;
    var player;
    if(type === 'audio'){
        html  = "<audio id='audioPlayer' src='" + url + "' preload='auto'>";
        html += "<\/audio>";
        $('#playerDiv').prepend(html);

        player = document.getElementById('audioPlayer');
        addPlayerEventListeners(player);
        
        return player;
    }
    else if(type === 'video'){
        html  = "<video id='videoPlayer' src='" + url + "' width='100%'";
        html += "preload='auto'><\/video>";
        $('#videoPlayerDiv').append(html);
        
        player = document.getElementById('videoPlayer');
        addPlayerEventListeners(player);
        
        return player;
    }
    else{
        return false;
    }
}

function changePlayer(new_url){
/* Decide whether to show / hide or leave video player as is. */

    var player = getPlayerElem();
    var prevFiletype = player.src.split('.').pop();
    var newFiletype = new_url.split('.').pop();

    if(!player.paused){
        player.pause();    
    }
    
    if (prevFiletype === 'mp4' && newFiletype !== 'mp4'){
        $(player).slideUp(1000);        // Hide video player.
        $('#goFsBtn').fadeOut(300);     // Hide fullscreen button
        removeAVHtml(player);
        player = createAVHtml('audio', new_url);
    }
    else if(prevFiletype !== 'mp4' && newFiletype ==='mp4'){
        removeAVHtml(player);
        player = createAVHtml('video', new_url);
        $(player).fadeIn(500);          // Show video element.
        $('#goFsBtn').fadeIn(500);      // Show fullscreen button
    }
    else if(prevFiletype === newFiletype){
    /* This is a bit of a hack, even though you are changing src, this is 
       required to stop browser from continuing to download content. MDN */
        player.src = '';
        player.src = new_url;
    }
    else{
        player = false;
    }
        
    return player;
}

function sendEpisodeToPlayer(e){
// When clicking episode in playlist (listview) play the episode
// Saves to datastore and updates player to show titles.
    var player = getPlayerElem();
    var playerSrc;
    
    var timeElem = $(this).find('.episodeCurrentTime');
    var time = parseInt($(timeElem).data('playback-time'));
    
    var data = {
        url: $( this ).data('episode-url'),
        podcast_urlsafe_key: $( this ).data('podcast-id'),
        playlist_urlsafe_key: $('#playlist').data('playlist-id'),
        currentTime: time
    };
        
    timerStorage.clearAll();

    if(!player.paused){    
        player.pause();
    }
    
    player = changePlayer(data.url);
    player.load();
    setPlayerAttributes(player, data);  // ui
    saveNowPlaying(player, data);       // to permanent storage
}

function addToPlaylist(e){
/*      On main podcast page clicking episodes adds them to the list on the playlist page. 
Must go to playlist page in order to actually play the episode*/
    e.preventDefault();
    e.stopImmediatePropagation();
    
    var elemId = $( this ).parents().eq(3).get(0);
    var data = {};
    var html = '';

    data.episode_url = $( this ).parent().data('episode-url');
    data.podcast_urlsafe_key = $( elemId ).data('podcast-id');
    data.playlist_urlsafe_key = $( '#subscriptionList' ).data('playlist-id');

    var request = $.ajax({
        url: '/addtoplaylist',
        type: 'POST',
        data: data
    });
    $.mobile.loading('show');
    request.done( function(result){
        console.log('addtoplaylist, result below:');
        console.dir(result);
        if(!result.alreadyInList){
            html = createPlaylistListviewItem(result);
            $( '#playlist' ).prepend(html).listview('refresh');
        }
        $.mobile.loading('hide');
    });
}

function getPodcastElem(elem){
    var parents = $(elem).parents();
    return $(parents).filter('.subscriptionItem');
}

function removePodcast(e){
    // -Really nice yes / no pop up in http://demos.jquerymobile.com/1.4.3/popup/ -- dialog, but way more complicated than the standard confirm
    // -May want to change this to an undo / dismiss notifcation thing that doesn't disappear until you do something else???
    
    e.preventDefault();
    e.stopImmediatePropagation();
    
    var title = $( this ).parent().data('podcast-title');
/*     var elemId = $( this ).parents().eq(3).get(0); */
    var elemId = getPodcastElem(this);
    var storageId = $( elemId ).data('podcast-id');
    
    var html = 'Removing ' + title;
    var html_done = title + ' removed' ;
    console.log('removing: ' + title);
    
    if (confirm('Delete ' + title + '?') === true){
        var request = $.ajax({
            url: "/removepodcast",
            type: "POST",
            data: { urlsafe_key : storageId }
        });
        $( '#podcastNotification' ).html(html).fadeIn(300);
        request.done(function(){
            $( elemId ).fadeOut(1000);
            $( '#podcastNotification' ).fadeOut(800);
            setTimeout( function(){
                $( '#podcastNotification' ).html(html_done).fadeIn(300).delay(3000).fadeOut(800);
            }, 1100);
        });
    }
    else{
        return true;
    }

}

function refreshPodcast(e){
    e.preventDefault();
    e.stopImmediatePropagation();
    
/*     var podcastElem = $( this ).parents().eq(3).get(0); */
    var podcastElem = getPodcastElem(this);

    var storageId = $( podcastElem ).data('podcast-id');

    var request = $.ajax({
        url: "/refreshpodcast",
        type: "POST",
        data: { urlsafe_key : storageId }
    });
    request.done(function(result){
        console.log('completed refresh.');
        console.dir(result);
        // If Podcast page exists in DOM, update it.
        if($('#subscriptionList').length>0){
            addToPodcastListview(podcastElem, result.add);
            removePodcastListviewItem(podcastElem , result.remove);
        }
        
        // If new page exists in DOM, update it.
        if($('#newList').length>0){
            addToNewListListview(result.add);
        }
    });
}

// **--   Playlist page script   --** 
function setPlayerLoadedUi(player){
    $('#playBtn').html('&#9654;');
    $('#playerTimeCurrent').css('fontWeight', 'bold');

    $('.ui-slider-track').css('backgroundColor', 'rgb(241, 210, 170)');
    $('.ui-slider-handle').css('backgroundColor', 'rgb(231, 175, 124)');
    $('.ui-slider-handle').css('border-color', 'rgba(50, 50, 50, 40)');
}

function resumePlayerTime(player){
    var timer;
    var initialPlaybackTime = $('#playerTimeCurrent').data('playback-time');

    /*     Set the player time and set the ui player time*/
    if(!timerStorage.get('resumePlayerTime')){
        timer = setInterval( function(){
            console.log('resumePlayerTime, ready state' + player.readyState + ', time: ' + player.currentTime + ', ' + player.networkState);
            timerStorage.set('resumePlayerTime', timer);
            if (player.readyState > 1){
                player.currentTime = initialPlaybackTime;
                console.log('resumePlayerTime, currentTime after: ' + player.currentTime);
                setPlayerLoadedUi(player);
                setSliderLocation(player);
                displayAudioSeekable(player);
                timerStorage.clear('resumePlayerTime');
            }
        }, 500);
    }

    $('#playerTimeCurrent').html(initialPlaybackTime);
}

function fullScreenVideoControls(){
    var elem = document.getElementById('videoPlayerDiv');
    var elem1 = document.getElementById('videoPlayer');
    console.log('clicking on video');
    
    elem1.controls = false;

    if(document.webkitFullscreenElement){
        console.log('fullScreenVideoControls, in if');
        console.log('elem.controls' + elem1.controls);
        $('#videoRewind').fadeIn(300);
        console.log('fullScreenVideoControls, fullscreenTimer: ' + fullscreenTimer.val);
        if(!fullscreenTimer.val){
            console.log('fullScreenVideoControls, in timer if');
            fullscreenTimer.val='run';
            console.log('fullScreenVideoControls, in if should be run: ' + fullscreenTimer.val);
            setTimeout( function(){
                $('#videoRewind').fadeOut(300);
                fullscreenTimer.val = undefined;
            }, 2000);
            
        }
        
    }
}

function toggleFullscreen(e){
    console.dir(e);
    console.log('event type: ' + e.type);
    var elem = document.getElementById('videoPlayer');
    if (!document.fullscreenElement &&    // alternative standard method
        !document.mozFullScreenElement && !document.webkitFullscreenElement && 
        !document.msFullscreenElement ) {  // current working methods
        if (elem.requestFullscreen) {
          elem.requestFullscreen();
        } else if (elem.msRequestFullscreen) {
          elem.msRequestFullscreen();
        } else if (elem.mozRequestFullScreen) {
          elem.mozRequestFullScreen();
        } else if (elem.webkitRequestFullscreen) {
          elem.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
        }
    } 
    else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (document.msExitFullscreen) {
          document.msExitFullscreen();
        } else if (document.mozCancelFullScreen) {
          document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
  }
}

/* Playlist page - **-- Player Functions --** */
function updateTimeFromSlidestart(e){
    var player = getPlayerElem();
    
    if(!player.paused){
        player.pause();
        /* Sets that player was going so when user is done seeking, play will resume */
        podsyData.set('resumePlaying', true); 
    }
    
    var location    = $('#playerSlider').prop('value');
    var duration    = player.duration;
    var myE         = {'type': 'updateTimeFromSlider'};

    displayPlayerTime(myE, (duration * (location/100)));
}

function updateTimeFromSlidestop(e){

    var player      = getPlayerElem();
    var location    = $('#playerSlider').prop('value');
    var duration    = player.duration;
    
    displayPlayerTime('', (duration * (location/100)));

    if(podsyData.get('resumePlaying')){
        player.play();
        podsyData.clear('resumePlaying');
    }

}

function playerInit(){
    console.log('playerInit');
    
    var player = getPlayerElem();
    if(player.id === 'videoPlayer'){
        $(player).fadeIn(500);
        $('#goFsBtn').show();
    }
    
    player.load();
    resumePlayerTime(player);
}

// Marked for deletion: function removeFromNewList()
// At the moment, no reason to remove from newlist.
function removeFromNewList(){
    var player  = getPlayerElem();
    var url     = player.src;
    var newList = document.getElementById('newList');
    var elem    = filterListByDataUrl('newList', url);

    // **-- Combine with remove from playlist.
    // Will need to change python portion as well depending which list.
    // Also the remove from ui portion --**

    $(elem).remove();
}

function playNextTrack(e){
    console.log('playnexttrack, find the next track in the list and play it.');
    console.dir(e);
    console.log(e.target.src);
    var src = e.target.src;
    removeFromPlaylistEnded(src);
}

function rewindTrack(){
    var player = getPlayerElem();
    player.currentTime -= 15;
    setSliderLocation(player);
}

function fastForwardTrack(){
    var player = getPlayerElem();
    player.currentTime += 30;
    setSliderLocation(player);
}

function muteAudio(){
    var player = getPlayerElem();
    var btn = $('#muteBtn');
    if (player.muted){
        player.muted = false;
        btn.html('Mute');
    }
    else{
        player.muted = true;
        btn.html('Unmute');
    }
}

// **--   New page scripts   --** 

function fromNewToPlaylist(e){
    var data = {};
    var html = '';

    data.episode_url = $( this ).data('episode-url');
    data.podcast_urlsafe_key = $( this ).data('podcast-id');
    data.playlist_urlsafe_key = $( this ).parent().data('playlist-id');

    console.log('adding to playlist, info below:');
    console.dir(data);

    var request = $.ajax({
        url: '/addtoplaylist',
        type: 'POST',
        data: data
    });
    $.mobile.loading('show');
    request.done( function(result){
        console.log('added to playlist, from newlist');
        console.log('change color while processing...');
        html = createPlaylistListviewItem(result);
        $( '#playlist' ).prepend(html).listview('refresh');
        $.mobile.loading('hide');
    });
}

function refreshAllPodcasts(e){
    /* Refresh New Page. If Podcast page exists, refresh that as well. */
    if($('#subscriptionList').length){
        $('.refreshBtn').each( function(){
            $(this).click();
        });
    }
    else{
        var request = $.ajax({
            url: '/refreshallpodcasts',
            type: 'POST'
        });
        request.done( function(newEpisodes){
            updateAllPodcastsHtml(newEpisodes);
        });
    }

}

// **--   Search page scripts   --** 
function createHtmlPodcastPage(podcast){
    var html = "<div data-role='collapsible' data-inset='false' class='subscriptionItem' ";
    html += "data-podcast-id='" + podcast.urlsafe_key + "'>";
    html += "<h3><img src='" + podcast.image_url + "' alt='podcast logo' height='45' width='45'>";
    html += "<span>" + podcast.title + "<\/span>";
    html += "<div class='subscriptionFunctions' ";
    html += "data-podcast-title='" + podcast.title + "'>";
    html += "<button class='deleteBtn ui-btn ui-icon-delete ui-btn-icon-notext ui-btn-inline'><\/button><span id='podcastBtnSpace'> <\/span>";
    html += "<button class='refreshBtn ui-btn ui-icon-refresh ui-btn-icon-notext ui-btn-inline'><\/button>";
    html += "<\/div><\/h3>";
    html += "<ul data-role='listview'>";
 
    for (var i = 0; i < podcast.episode.length; i += 1){
        html += "<li data-episode-url='" + podcast.episode[i].url + "'>";
        html += "<a href='#' class='addToPlaylist'>" + podcast.episode[i].title + "Time: ";
        html += podcast.episode[i].current_time + '<\/a><\/li>';
    }
    html += "<\/ul><\/div>";    
    
    console.log('createhtmlpodcastpage, html = ' + html);
    return html;
}

function addPodcastToDatastore( url, title){
    // since I don't know the title like in itunes search which returns it, 
    // The line below uses default 'rss feed' text since the user isn't supplying title.
    title = (title) ? title : 'RSS Feed';  
    var htmlAdding  = '<b>Adding</b> ' + title;
    var htmlAdded   = '<b>Added!</b> ' + title + '<br>See results in <a href="/">Podcasts</a>';
    var htmlFailed  = '<i>Failed</i> to add ' + title;
    var htmlAlreadyAdded = '<i>Already added</i>  ' + title + ' to Subscription List';
    var htmlPodcastPage = '';

    var request = $.ajax({
        url: "/addpodcast",
        type: "POST",
        data: { url: url }
    });
    $('#searchNotification').html(htmlAdding).fadeIn(300);
    $('#iTunesSearchResultsHtml').empty();        // Really only applies when searching iTunes, not adding by RSS.
    request.done(function(podcast){
        $( '#searchNotification' ).fadeOut( 800 );
        if(podcast){
            console.log('addpodcasttodatastore, podcast return info below: ');
            console.dir(podcast);
            htmlPodcastPage = createHtmlPodcastPage(podcast);
            $('#subscriptionList').prepend(htmlPodcastPage).trigger('create');
            $( '.deleteBtn' ).on( 'click', removePodcast );
            $( '.refreshBtn').on( 'click', refreshPodcast );
            setTimeout( function(){
                $( '#searchNotification' ).html(htmlAdded).fadeIn(300).delay(2000).fadeOut(800);
            }, 1500 ); 
        }
        else{
            setTimeout( function(){
                $( '#searchNotification' ).html(htmlAlreadyAdded).fadeIn(300).delay(2000).fadeOut(800);
            }, 1500 ); 
        }
        /* Used setTimeout so text doesn't update before display does.*/
    });
    request.fail(function(){
        $('#searchNotification').html(htmlFailed);
        $('#searchNotification').delay(5000).fadeOut(800);
    });

}

function addPodcastFromITunesSearch(e){

    var url = $( this ).data('podcast-url');
    var title = $( this ).data('podcast-title');
    
    e.preventDefault();

    $( '#iTunesSearchButton' ).focus();  // Closes keyboard on mobile devices.
    addPodcastToDatastore(url, title);
}

function addPodcastFromRssUrl(e){
    /* Get parameter from add rss input field and send to add podcast, as opposed to subscribe button from iTunes search results. */
    e.preventDefault();

    /*     Consider  adding the spinner loader animation from JQM here. */
    $( '#rssSubscribeButton' ).focus();  // Closes keyboard on mobile devices.
    var url = $( '#rssSubscribeUrl' ).val();
    addPodcastToDatastore(url);
}

function sendITunesSearchRequest(e){
    //Search iTunes API with a dynamically loaded script from user input

    e.preventDefault();

    var notificationHtml = 'Searching iTunes...';
    var searchValue = $('#iTunesSearchValue').val();
    var url = 'https://itunes.apple.com/search?entity=podcast' + '&term=' + 
        encodeURIComponent(searchValue) + '&callback=showITunesSearchResults';
    var html = "<script src='" + url + "'><\/script>";
    $( '#itunesScript' ).empty();         // Remove any searches between page reloads.
    $( '#itunesScript' ).append(html);     // Appending script runs it and gets result from Apple store.
    $( '#iTunesSearchValue').blur();     // Makes the go keyboard disappear on mobile.
    $('#searchNotification').html(notificationHtml).fadeIn(300);

    // Next display search results.
    return false;
}

function createXMLResultHtml(results){
    var html = '<ul data-role="listview" data-inset="true">';
    for(var i=0; i<results.length_results; i+=1){
        /* Using jQuery mobile listiew with thumbnails to display iTunes search results. */
         html += '<li data-podcast-title="' + results[i].collectionCensoredName + '" ';
        html += 'data-podcast-url="' + results[i].feedUrl +'">';
        html += '<a href="#">';
        html += '<img src="' + results[i].artworkUrl100 + '">';
        html += '<h2>' + results[i].collectionCensoredName + '</h2>';
        html += '<p>' + results[i].artistName + '</p>';
        html += '<\/a><\/li>';
    }
    html += '<\/ul>'; // close list of shows    

    return html;
}

function showITunesSearchResults(arg){
    //This callback function of the dynamically loaded script display the restults from iTunes store.
    var results = arg.results;
    var html = '';
    
    // Sort results based on the 'collection name', iTunes term, in genral the title of the show.
    // May be unnecessary, but kind of a nicety and not a ton of extra code.
    function compareResultsObjects(a,b){
        if (a.collectionName > b.collectionName){
            return 1;
        }
        if (a.collectionName < b.collectionName){
            return -1;
        }
        return 0;
    }
    results.sort(compareResultsObjects);

    if (arg.resultCount === 0) {
        $('#iTunesSearchResultsHtml').empty();    
        $('#iTunesSearchResultsHtml').html('No results found');
        $('#searchNotification').fadeOut(300);
/*         return true; */
    }
    else{
        results.length_results = arg.resultCount; 
        html = createXMLResultHtml(results);
        $('#iTunesSearchResultsHtml').html(html).trigger('create');
        $('#searchNotification').fadeOut(300);
    }
}

// **--   Page container scripts   --** 
function checkPlayerRunning(event, ui){
    // var player = document.getElementById('audioPlayer');
    var player = getPlayerElem();
    console.log('beforehide, checkplayerunning');
    timerStorage.clearAll();
    if (player){
        console.log('player exists. is paused = ' + player.paused );
        if ( !player.paused ){
            console.log('player is playing and should get puased');
            player.pause();
        }
    }
    else{
        console.log("player doesn't exist");
    }
}

function reloadPage(){
    location.reload();
}

function addReloadListener(e){
    if(!podsyData.get('reloadListener' + e.target.id)){
        podsyData.set('reloadListener' + e.target.id, true);
        $( '.reloadBtn' ).on('click', reloadPage);
    }
}

// **--  Event listeners --**
// General
$( ':mobile-pagecontainer' ).pagecontainer({
    beforehide: checkPlayerRunning
});
$( document ).on('pagecreate', addReloadListener);

// Podcasts Page
$('#PodcastPage').on('pagecreate', function(e, ui){
    $( '.deleteBtn' ).on( 'click', removePodcast );
    $( '.refreshBtn' ).on( 'click', refreshPodcast );
    $( '.subscriptionList' ).on( 'click', '.addToPlaylist', addToPlaylist );
});

// Playlists Page
$('#PlaylistPage').on('pagecreate', function(e, ui){
    console.log('PlaylistPage pagecreate starting...:');
    /* Player functions. */
    playerInit();
    $( '#audioPlayer' ).on( 'play', playTrack);
    $( '#videoPlayer' ).on( 'play', playTrack);
    $( '#audioPlayer' ).on( 'pause', pauseTrack);
    $( '#videoPlayer' ).on( 'pause', pauseTrack);
    $( '#audioPlayer' ).on( 'timeupdate', displayPlayerTime);
    $( '#videoPlayer' ).on( 'timeupdate', displayPlayerTime);
    $( '#playerSlider' ).on( 'slidestart', updateTimeFromSlidestart);
    $( '#playerSlider' ).on( 'slidestop', updateTimeFromSlidestop);
    $( '#audioPlayer' ).on( 'ended', playNextTrack);
    $( '#videoPlayer' ).on( 'ended', playNextTrack);
    $( '#goFsBtn').on('click', toggleFullscreen);
    $( '#videoPlayer' ).on( 'dblclick', toggleFullscreen);
    $( '#videoPlayer' ).on( 'doubletap', toggleFullscreen);
/*     $( '#videoPlayerDiv' ).on( 'click', fullScreenVideoControls); */
/*     $( '#reloadBtn' ).on('click', reloadPage); */
    $('#tom').on('click', markListenedPodcast);

    /* Player ui functions. */
    $( '#playBtn' ).on( 'click', playTrackBtn );
    $( '#rewindBtn' ).on( 'click', rewindTrack );
    $( '#fastForwardBtn').on( 'click', fastForwardTrack );
    $( '#muteBtn' ).on( 'click', muteAudio );

    /* Playlist functions: */
    $( '#playlist' ).on( 'click', '.deletePlaylistBtn', removeFromPlaylistBtn );
    $( '#playlist' ).on( 'click', 'li', sendEpisodeToPlayer );
});

// New Page
$('#NewPage').on('pagecreate', function(e, ui){
/*     console.log('NewPage, domcache:' + $.mobile.page.prototype.options.domCache); */
    $('#refreshAllPodcasts').on('click', refreshAllPodcasts);
    $( '#newList' ).on( 'click', 'li', fromNewToPlaylist );
});

// Search Page
$('#SearchPage').on('pagecreate', function(e, ui){
/*     console.log('SearchPage, domcache:' + $.mobile.page.prototype.options.domCache); */
    $( '#iTunesSearchForm' ).on( 'submit', sendITunesSearchRequest );
    $( '#rssSubscribeForm' ).on( 'submit', addPodcastFromRssUrl );
    $( '#iTunesSearchResultsHtml' ).on( 'click', 'li', addPodcastFromITunesSearch );
});
