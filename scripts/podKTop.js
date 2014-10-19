// **--   jQuery mobile overrides:   --** 
/* $.mobile.page.prototype.options.domCache = true; */

// **--   Home - Pocast page script   --** 
function getPlayerElem(){
    var audioSrc    = document.getElementById('audioSrc');
    var audioType   = audioSrc.src.split('.').pop();
    var videoSrc    = document.getElementById('videoSrc');
    var videoType   = videoSrc.src.split('.').pop();
    var defaultUrl  = location.href + '#'; 
    
    if (audioType === 'mp3'){
        return document.getElementById('audioPlayer');
    }
    else if(videoType === 'mp4'){
        return document.getElementById('videoPlayer');
    }
    else{
        return false;
    }
}

/* **-- Marked for deletion as it us unused and more importantly probably does not work
currently, not checking for defaul # url. --** */
function getPlayerSrc(){
    var audioSrc = document.getElementById('audioPlayer');
    var videoSrc = document.getElementById('videoPlayer');
    
    if (audioSrc.src){
        return audioSrc;
    }
    else if(videoSrc.src){
        return videoSrc;
    }
    else{
        return false;
    }
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

function addToPlaylistListview(listview, newEpisodes){
    var html;
    for(var i=0; i<newEpisodes.length; i+=1){
        html = createPlaylistListviewItem(newEpisodes[i]);
        console.log('addToPlaylistListview html: ' + html);
        $(listview).prepend(html);
    }
}

function addToPodcastListview(listview, add){
    var html;
    for(var i=0; i<add.length; i+=1){
        html = createPodcastListViewItem(add[i]);
        console.log('addToPodcastHtml html: ' + html);
        $(listview).prepend(html);
    }    
}

function updatePodcastHtml(elemId, result){
    /* Update the listview on the Podcast page and the New page to reflect latest
    rss feed */
    var podcast_listview = $(elemId).find('ul');
    var new_listview = $('#newList');
    console.log('result: ');
    console.dir(result);
    
/*     result.add.reverse();       // after op: oldest to newest. */

    addToPodcastListview(podcast_listview, result.add);
    addToPlaylistListview(new_listview, result.add);
    removePodcastListviewItem(podcast_listview , result.remove);
    $(podcast_listview).listview('refresh');
    $(new_listview).listview('refresh');
}

function updateAllPodcastsHtml(listview, newEpisodesForAllPodcasts){
    console.log('updateallpodcasthtml');
    for (var i=0; i<newEpisodesForAllPodcasts.length; i+=1){
        console.log('updateallpodcasthtml, result[i]' + newEpisodesForAllPodcasts[i]);
        newEpisodesForAllPodcasts[i].add.reverse();     // after op: oldest to newest.
        addToPlaylistListview(listview, newEpisodesForAllPodcasts[i].add);
    }
}

function setSliderLocation(player){
    // var player = document.getElementById('audioPlayer');
    var time = player.currentTime;
    var duration = player.duration;
    
    console.log('setsliderlocation, player below, time and duration right:' + time + ', ' + duration );
    console.dir(player);
    
    $('#playerSlider').prop('value', (time/duration*100));
    $('#playerSlider').slider('refresh');
}

function lastTimer(val){
    this.val = val;
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

function displayAudioSeekable(){
    // var player = document.getElementById('audioPlayer');
    var player = getPlayerElem();
    var duration = player.duration; // seconds
    /* var seekable = player.buffered; */
    var seekable = player.seekable;
    var widthSlider = $('.ui-slider-track').prop('clientWidth')-1;
    var roundStart, roundEnd = false;
    var start_s, end_s, start_percent, end_percent, start_px, width_px;

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
        
/*         console.log('widthSlider' + widthSlider);
        console.log(start_px + ', '+width_px+', '+roundStart+', '+roundEnd); */
        colorSliderBackround(start_px, width_px, roundStart, roundEnd);
        roundStart = roundEnd = false;
    }
}

function playTrack(eCaller){
    
    /* Plays podcast, saves current playback time so user can pick up where they left off and goes to next episode
        on the list when the current playing is finished. */
    var savePlaybackPositionTimer;
/*     var player = document.getElementById('audioPlayer'); */
    var player      = getPlayerElem();
    var playerDiv    = document.getElementById('playerDiv');

    function savePlaybackPosition(){
        // Save playback postion to datastore.

        if( player.paused ){
            clearInterval(savePlaybackPositionTimer);
            lastTimer.val = null;
        }

         var data = {
/*             urlsafe_key: $( player ).data('podcast-id'),
            episode_url:  $( player ).data('episode-url') , */
            urlsafe_key: $( playerDiv ).data('podcast-id'),
            episode_url:  $( playerDiv ).data('episode-url') ,
            current_time: Math.floor( player.currentTime )
        };
        
        console.log('Saving time to datastore, timer(right), data(below): ' + 
                    savePlaybackPositionTimer);
        console.dir(data);
        displayAudioSeekable();
        setSliderLocation(player);

        
        var request = $.ajax({
            url: '/saveplaybacktime',
            type: 'POST',
            data: data
        });
    }

    if(player.paused){
        if(!lastTimer.val){
            lastTimer.val = 'save time to datastore timer is running';
            savePlaybackPositionTimer = setInterval( savePlaybackPosition , 5000);
        }
        player.play();
        $('#playBtn').html('||');
        console.log('playtrack, after player.play() ' + $('#playBtn').html());
        setSliderLocation(player);

    }
    else{
        player.pause();
        $('#playBtn').html('&#9654;');
        console.log('playtrack, after player.pause() ' + $('#playBtn').html());
    }
}

function setPlayerAttributes(player, data){
    var setTimeInt;
    var playerDiv = document.getElementById('playerDiv');
    setTimeInt = setInterval( function(){
        console.log('setPlayerAttributes, checking ready state');
        if (player.readyState > 3){
            console.log('setPlayerAttributes, setting time and playing');
            player.currentTime = data.currentTime;
            playTrack();
            setSliderLocation(player);
            clearInterval(setTimeInt);
        }
    }, 300);
    $( playerDiv ).data('episode-url', data.url);
    $( playerDiv ).data('podcast-id', data.podcast_urlsafe_key);
/*     $(player).on('canplay', function(){
        $(player).currentTime = result.current_time;
    }); */
}

function setTrackAttributes(result){
    // $( elem.playerSrc ).attr( 'src', data.url );
    console.log('setTrackAttributes: data, result:');
    console.dir(result);
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

function removeFromPlaylist(e){
    e.preventDefault();
    e.stopImmediatePropagation();

    var elem = $( this ).parent();
    
    var id = $( elem ).attr('id');
    var url = $( elem ).data('episode-url');
    var playlistKey = $('#playlist').data('playlist-id');
    console.log('url: ' + url + ', playkey: ' + playlistKey);

    // Remove item from datastore
    var request = $.ajax({
        url: '/removefromplaylist',
        type: 'POST',
        data: { url: url, playlist_key: playlistKey }
    });
    request.done( function(){
        console.log('Successfully removed from playlist');
        $( elem ).fadeOut(800);
    });
    
    // Remove item from ui
    $( '#'+id ).remove();
    
}

function changePlayer(new_url){
/* Decide whether to show / hide or leave video player as is. */
    var audio = document.getElementById('audioPlayer');
    var audioSrc = document.getElementById('audioSrc');
    var video = document.getElementById('videoPlayer');
    var videoSrc = document.getElementById('videoSrc');

    var player = getPlayerElem();
    var defaultUrl = location.href + '#';

    var prevFiletype = player.children[0].src.split('.').pop();
    var newFiletype = new_url.split('.').pop();

    if(!player.paused){
        playTrack();    // Pauses track.
    }
    
    console.log('changeplayer, audio src: ' + audioSrc.src);
    console.log('changeplayer, video src: ' + videoSrc.src);

/* ***--- Work on this region, need to consider if previous is location.href#  ---***  */
/* ***--- Can make this way simplyer if I just rehide or reshow video, so 
no need to check old version. and remove the fadein slideout suff if needed.---***  */
    if (prevFiletype === 'mp4' && newFiletype !== 'mp4'){
        videoSrc.src = defaultUrl;
        $(video).hide();
        player = audio;
    }
    else if(prevFiletype !== 'mp4' && newFiletype ==='mp4'){
        audioSrc.src = defaultUrl;
        $(video).fadeIn(500);
        player = video;
    }
    else if(prevFiletype === 'mp4' && newFiletype ==='mp4'){
        player = video;
    }
    else if(prevFiletype === 'mp3' && newFiletype ==='mp3'){
        player = audio;
    }
    else{
        player = false;
    }
        
/*     audio.src = '';
    video.src = ''; */
    return player;
}

function sendEpisodeToPlayer(e){
// When clicking episode in playlist (listview) play the episode
// Saves to datastore and updates player to show titles.
    // var player = document.getElementById('audioPlayer');
    //var playerSrc = document.getElementById('audioSrc');
    // var player = getPlayerElem();
    // var playerSrc = getPlayerSrc();
    var player, playerSrc;
    
    var timeElem = $(this).find('.episodeCurrentTime');
    var time = parseInt($(timeElem).data('playback-time'));
    console.log('sendEpisodeToPlayer, timeElem below:');
    console.dir(timeElem);
    console.log('sendEpisodeToPlayer, time:' + time);
    
    var data = {
        url: $( this ).data('episode-url'),
        podcast_urlsafe_key: $( this ).data('podcast-id'),
        playlist_urlsafe_key: $('#playlist').data('playlist-id'),
        currentTime: time
    };
        
    player = changePlayer(data.url);
    playerSrc = player.children[0];
    // console.log('sendEpisodeToPlayer, playerSrc' + playerSrc);

    if(!player.paused){    
        playTrack();        // Pauses player
    }

/*     var filetype = data.url.split('.').pop();

    if (filetype === 'mp3'){
        player = document.getElementById('audioPlayer');
        playerSrc = document.getElementById('audioSrc');
        playerSrc.src = data.url;
    }
    else{
        player = document.getElementById('videoPlayer');
        playerSrc = document.getElementById('videoSrc');
        playerSrc.src = data.url;
    }
     */
    console.log('sendEpisodeToPlayer, data below:');
    console.dir(data);

    playerSrc.src = data.url;
    player.load();    
    setPlayerAttributes(player, data);  // ui
    saveNowPlaying(player, data);       // to datastore

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

    console.log('addtoplaylist, playlist id, data below:');
    console.dir(data);
    
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

function removePodcast(e){
    // -Really nice yes / no pop up in http://demos.jquerymobile.com/1.4.3/popup/ -- dialog, but way more complicated than the standard confirm
    // -May want to change this to an undo / dismiss notifcation thing that doesn't disappear until you do something else???
    
    e.preventDefault();
    e.stopImmediatePropagation();
    
    var title = $( this ).parent().data('podcast-title');
    var elemId = $( this ).parents().eq(3).get(0);
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
    console.log('refreshpodcast, individual podcast click event:');
    
    var elemId = $( this ).parents().eq(3).get(0);
    var storageId = $( elemId ).data('podcast-id');
    console.log('refreshpodcast, storageId:' + storageId);

    var t = new Date();
    console.log('refreshallpodcast, start time:' + t.toTimeString() + ', ms: ' + t.getMilliseconds());

    
    var request = $.ajax({
        url: "/refreshpodcast",
        type: "POST",
        data: { urlsafe_key : storageId }
    });
    request.done(function(result){
        console.log('refreshpodast done.');
        updatePodcastHtml(elemId, result);
        t = new Date();
        console.log('refreshallpodcast, end time:' + t.toTimeString() + ', ms: ' + t.getMilliseconds());
    });
}

function refreshAllPodcasts(e){
    console.log('refreshing all podcasts');
    var listview = $('#newList');
    var podcastElem;

    var t = new Date();
    console.log('refreshallpodcast, start time:' + t.toTimeString() + ', ms: ' + t.getMilliseconds());

    console.log('refreshallpodcasts, subscriptionList page check');
    console.dir($('#subscriptionList'));
    if($('#subscriptionList').length){
        console.log('refreshAllPodcasts, simulate clicking all refresh buttons');
        $('.refreshBtn').each( function(){
            console.log('pushing this button, below:');
            console.dir(this);
            podcastElem = $(this).parents().eq(3).get(0);
            console.dir(podcastElem);
            console.log('id: ' + $(podcastElem).data('podcast-id'));
            $(this).click();
        });
    }
    else{
        console.log('refreshAllPodcasts, just update new page');
        var request = $.ajax({
            url: '/refreshallpodcasts',
            type: 'POST'
        });
        request.done( function(newEpisodes){
            console.log('refreshallpodcast, received results from server.');
            updateAllPodcastsHtml(listview, newEpisodes);
            $(listview).listview('refresh');
        });
    }

}

// **--   Playlist page script   --** 
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

function findItemPlaylist(episode_url){
    
    var elem ;
    
    $('.playlistItem').each( function(){
        if ($(this).data('episode-url') === episode_url){
            elem = $(this);
        }
    });
    
    return elem;
}

function displayPlayerTime(event, time){
    /* Displays the time in the player region of the ui.*/
    /* Temporarily also displays the playlist region of the ui.*/

    // var player = document.getElementById('audioPlayer');
    var player          = getPlayerElem();
    var playerDiv       = document.getElementById('playerDiv');
    

    var playerTime_s    = Math.floor(player.currentTime);  // time in seconds
    var duration        = Math.floor(player.duration);
    // var episodeUrl      = $(player).data('episode-url');
    var episodeUrl      = $(playerDiv).data('episode-url');

    console.log('displayPlayerTime, player below, time and url: ' + playerTime_s + ', ' + episodeUrl);
    console.dir(player);
    // If we are just updating the ui, take time from player, but if we are 
    // updating based on slide position, use value from call within slide funciton
    if (time){
        player.currentTime = time;
        playerTime_s = time;
    }
    
    var readableTime = secondsToReadableTime(playerTime_s, duration);

    var playlistItem = findItemPlaylist(episodeUrl);
    var playlistItemTime = $(playlistItem).find('.episodeCurrentTime');

    // Update player ui and data
    $('#playerTimeCurrent').html(readableTime);
    $('#playerTimeCurrent').data('playback-time', playerTime_s);

    // Update playlist ui and data
    playlistItemTime.html(readableTime);
    playlistItemTime.data('playback-time', playerTime_s);
    
    // console.log('displayplayertime, oncanplaythru:' + player.oncanplaythrough);
/*     displayAudioSeekable(); */
}

function updateTimeFromSlidestart(e){
    console.log('updateTimeFromSlidetart fired');

    // var player = document.getElementById('audioPlayer');
    var player = getPlayerElem();
    
    if(!player.paused){
        playTrack(e);    // pauses track
    }
    
    var location = $('#playerSlider').prop('value');
    var duration = player.duration;
    console.log('updateTimeFromSlidestart, location' + location + ', duration: ' + duration);
    displayPlayerTime('', (duration * (location/100)));
}

function updateTimeFromSlidestop(e){
    console.log('updateTimeFromSlidetop fired');
    console.dir(e);

    // var player = document.getElementById('audioPlayer');
    var player = getPlayerElem();
    var location = $('#playerSlider').prop('value');
    var duration = player.duration;
    
    displayPlayerTime('', (duration * (location/100)));
    if(player.paused){
        playTrack(e);    // plays track
    }
    
    console.log('updateTimeFromSlidestop, location' + location + ', duration: ' + duration);

}

function resumePlayerTime(player){
    var setTimeInt;
    var initialPlaybackTime = $('#playerTimeCurrent').data('playback-time');
/*     var player = getPlayerElem(); */
    // console.log('resumePlayerTime, initialPlaybacktime: ' + initialPlaybackTime);

    /*     Set the player time and set the ui player time*/
    setTimeInt = setInterval( function(){
        console.log('resumePlayerTime, checking ready state');
        if (player.readyState > 3){
            player.currentTime = initialPlaybackTime;
            // console.log('resumePlayerTime, setting time: ' + player.currentTime);
            setSliderLocation(player);
            clearInterval(setTimeInt);
        }
    }, 300);

    
/*     player.currentTime = initialPlaybackTime; */
/*     $(player).prop('currentTime', initialPlaybackTime); */
    $('#playerTimeCurrent').html(initialPlaybackTime);
}

function setPlayerLoadedUi(player){
/*     console.log('setplayerloadedui, is this where it is switching back to play button?'); */
    // var player = document.getElementById('audioPlayer');
/*     var player = getPlayerElem(); */
    $('#playBtn').html('&#9654;');
    $('#playerTimeCurrent').css('fontWeight', 'bold');

    $('.ui-slider-track').css('backgroundColor', 'rgb(241, 210, 170)');
    $('.ui-slider-handle').css('backgroundColor', 'rgb(231, 175, 124)');
    $('.ui-slider-handle').css('border-color', 'rgba(50, 50, 50, 40)');
}

function playerInit(){
    console.log('playerInit');
    
/*     var audioPlayer = document.getElementById('audioPlayer'); */
/*     var audioSrc = document.getElementById('audioSrc'); */
    var player = getPlayerElem();
    var videoPlayer = document.getElementById('videoPlayer');
    var videoSrc = document.getElementById('videoSrc');
    var playerInactiveUrl = location.href + '#';
/*     var playerInactiveUrl = location.href; */

    console.log('audioplayerint: player, video below.');
    console.dir(player);
/*     console.dir(audioPlayer); */
    console.dir(videoPlayer);
    
    console.log('playerInit, before if, videoPlayersrc: ' + videoSrc.src);
    console.log('playerInit, before if, playerInactiveUrl: ' + playerInactiveUrl);
    if(videoSrc.src !== playerInactiveUrl){
        console.log('playerInit, in if');
        $(videoPlayer).fadeIn(2500);
    }
    
    resumePlayerTime(player);
    setPlayerLoadedUi(player);
/*     setSliderLocation(player); */
    
/*     if(videoSrc.src !== activePlayerCheck){
        console.log('playerInit, in videoPlayersrc? ' + videoSrc.src);
        videoPlayer.load();
    }
    else{
        $(videoPlayer).hide();
    }
    
    if(audioSrc.src !== activePlayerCheck){
        audioPlayer.load();
        console.log('hid player loading');
    } */
}

function playNextTrack(){
    console.log('playnexttrack, find the next track in the list and play it.');
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
    var player = $('#audioPlayer')[0];
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

// **--   Search page scripts   --** 
function createHtmlPodcastPage(podcast){
    // var html = "<  id='subscriptionItem_" + (podcast.length + 1) + "' class='subscriptionItem'>";
    var html = "<div class='subscriptionItem'>";
    html += "<div data-role='collapsible' data-inset='false' class='subscriptionCollapsible' ";
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
    html += "<\/ul><\/div><\/div>";    
    
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
/*     var length = $('#subscriptionList').children().length; */

    var request = $.ajax({
        url: "/addpodcast",
        type: "POST",
        data: { url: url }
    });
    $('#searchNotification').html(htmlAdding).fadeIn(300);
    $('#iTunesSearchResultsHtml').empty();        // Really only applies when searching iTunes, not adding by RSS.
    request.done(function(podcast){
        $( '#searchNotification' ).fadeOut( 800 );
/*         podcast.length = length; */
        if(podcast){
            console.log('addpodcasttodatastore, podcast return info below: ');
            console.dir(podcast);
            htmlPodcastPage = createHtmlPodcastPage(podcast);
            $('#subscriptionList').prepend(htmlPodcastPage).trigger('create');
            $( '.deleteBtn' ).on( 'click', removePodcast );
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
    if (player){
        console.log('player exists. is paused = ' + player.paused );
        if ( !player.paused ){
            console.log('player is playing and should get puased');
            playTrack();
        }
    }
    else{
        console.log("player doesn't exist");
    }
}

// **--  Event listeners --**
$( ':mobile-pagecontainer' ).pagecontainer({
/* $( document ).pagecontainer({ */
    // Turn player off if it is on and user is switching page. Odd to still
    // have it running unless I put player controls on all pages end goal.
    beforehide: checkPlayerRunning
});

/* $( document ).on( "pagecontainerbeforehide", podcastPageInit ); */

/* $( ':mobile-pagecontainer' ).pagecontainer({ */
/* $( document ).pagecontainer({ */
    // Turn player off if it is on and user is switching page. Odd to still
    // have it running unless I put player controls on all pages end goal.
/*     beforechange: function(){
        console.log('before changing... pagecontainer function'); */
/*         $.mobile.page.prototype.options.domCache = true; */
/*         console.log('domCache = ' + $.mobile.page.prototype.options.domCache);
    }
}); */
// Podcasts Page
$('#PodcastPage').on('pagecreate', function(e, ui){
    $( '.deleteBtn' ).on( 'click', removePodcast );
    $( '.refreshBtn' ).on( 'click', refreshPodcast );
    $( '.subscriptionList' ).on( 'click', '.addToPlaylist', addToPlaylist );
});
// Playlists Page
/* $('#PlaylistPage').on('pageshow', function(e, ui){
    console.log('PlaylistPage pageshow starting...:');
    playerInit();
}); */
$('#PlaylistPage').on('pagecreate', function(e, ui){
    console.log('PlaylistPage pagecreate starting...:');
    /* Player functions. */
    playerInit();
    /* Chose duration change a bit arbitrarily, just wanted to be sure time was
    there in the player to be modified. */
/*     $( '#audioPlayer' ).on( 'durationchange', resumePlayerTime); */
/*     $( '#audioPlayer' ).on( 'canplay', setPlayerLoadedUi); */
    $( '#audioPlayer' ).on( 'timeupdate', displayPlayerTime);
    $( '#videoPlayer' ).on( 'timeupdate', displayPlayerTime);
    $( '#playerSlider' ).on( 'slidestart', updateTimeFromSlidestart);
    $( '#playerSlider' ).on( 'slidestop', updateTimeFromSlidestop);
    $( '#audioPlayer' ).on( 'ended', playNextTrack);
    $( '#videoPlayer' ).on( 'ended', playNextTrack);

    /* Player ui functions. */
    $( '#playBtn' ).on( 'click', playTrack );
    $( '#rewindBtn' ).on( 'click', rewindTrack );
    $( '#fastForwardBtn').on( 'click', fastForwardTrack );
    $( '#muteBtn' ).on( 'click', muteAudio );

    /* Playlist functions: */
    $( '#playlist' ).on( 'click', '.deletePlaylistBtn', removeFromPlaylist );
    $( '#playlist' ).on( 'click', 'li', sendEpisodeToPlayer );
});

// New Page
$('#NewPage').on('pagecreate', function(e, ui){
    console.log('NewPage, domcache:' + $.mobile.page.prototype.options.domCache);
    $('#refreshAllPodcasts').on('click', refreshAllPodcasts);
    $( '#newList' ).on( 'click', 'li', fromNewToPlaylist );
});

// Search Page
$('#SearchPage').on('pagecreate', function(e, ui){
    console.log('SearchPage, domcache:' + $.mobile.page.prototype.options.domCache);
    $( '#iTunesSearchForm' ).on( 'submit', sendITunesSearchRequest );
    $( '#rssSubscribeForm' ).on( 'submit', addPodcastFromRssUrl );
    $( '#iTunesSearchResultsHtml' ).on( 'click', 'li', addPodcastFromITunesSearch );
});
