// **--   Page container scripts   --** 
function checkPlayerRunning(event, ui){
    var player = document.getElementById('audioPlayer');
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

// **--   Home - Pocast page script   --** 
function createPlaylistListviewItem(result){
    var html = '';

    html = '<li data-icon="false"';
    html += 'data-episode-url="' + result.episode_url + '" ';
    html += 'data-storage-id="' + result.urlsafe_key + '" ';
    html += 'class="playlistItem"><a href="#">';
    html += '<h2>' + result.podcast_title + '<\/h2>';
    html += '<p>' + result.episode_title + '<\/p><\/a>';
    html += '<a href="#" class="deleteBtn"><\/a>';
    html += '<\/li>';

    return html;
}

function createListViewItem(epiode){
    var html = "<li data-episode-url='" + epiode.url + "'>";
    html += "<a href='#' class='addToPlaylist'> ";
    html += epiode.title + 'Time: ' + epiode.current_time;
    html += "<\/a><\/li>";
    
    return html;
}

function removeListViewItem(listview, remove){
    var items = $(listview).find('li');
    console.log('removelistviewitem, items, remove: ' + items);
    console.dir(items);
    console.dir(remove);
    for(var i=0; i<remove.length; i+=1){
        for(var j=0; j<items.length; j+=1){
            console.log('removelistviewitem, items');
            console.dir($(items[j]));
            console.log('items[j].data: ' + $(items[j]).data('episode-url'));
            console.log('remove[i].url: ' + remove[i].url);
            if ($(items[j]).data('episode-url') == remove[i].url){
                $(items[j]).remove();
                console.log('removelistviewitem, removed');
                console.dir($(items[j]));
                break;
            }
        }
/*         $(items).each(function(){
            console.log('removelistviewitem, each');
            console.dir($(this));
            console.dir($(this).data('episode-url'));
            console.log('remove.url' + remove[i].url);
            if ($(this).data('episode-url') == remove[i].url){
                $(this).remove();
                console.log('removelistviewitem, remove');
                console.dir($(this));
            }
        }); */
    }
}

function updatePodcastHtml(elemId, result){
    var listview = $(elemId).find('ul');
    var html;
    console.log('result: ');
    console.dir(result);
    console.log('listview: ');
    console.dir($(listview));
    for(var i=0; i<result.add.length; i+=1){
        html = createListViewItem(result.add[i]);
        console.log('updatePodcastHtml html: ' + html);
        $(listview).prepend(html);
    }
    removeListViewItem(listview , result.remove);
    $(listview).listview('refresh');
    console.log('listview: ');
    console.dir($(listview));
}

function addToPlaylist(e){
/*      On main podcast page clicking episodes adds them to the list on the playlist page. 
Must go to playlist page in order to actually play the episode*/
    e.preventDefault();
    e.stopImmediatePropagation();
    
    var elemId = $( this ).parents().eq(3).get(0);
    var storageId = $( elemId ).data('storage-id');
    var episodeUrl = $( this ).parent().data('episode-url');
    var playlistId = $( '#subscriptionList' ).data('playlist-id');

    var length = $( '#playlist' ).children().length;
     var html = '';

    var request = $.ajax({
        url: '/addtoplaylist',
        type: 'POST',
        data: { episode_url: episodeUrl, urlsafe_key: storageId, playlist_urlsafe_key: playlistId }
    });
    $.mobile.loading('show');
    request.done( function(result){
        result.length = length;
        html = createPlaylistListviewItem(result);
        $( '#playlist' ).prepend(html).listview('refresh');
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
    var storageId = $( elemId ).data('storage-id');
    
    var html = 'Removing ' + title;
    var html_done = title + ' removed' ;
    
    if (confirm('Delete ' + title + '?') === true){
        var request = $.ajax({
            url: "/removepodcast",
            type: "POST",
            data: { urlsafe_key : storageId }
        });
        $( '#podcastNotification' ).html(html).fadeIn(300);
        request.done(function(){
            $( elemId ).fadeOut(2000);
            $( '#podcastNotification' ).fadeOut(800);
            setTimeout( function(){
                $( '#podcastNotification' ).html(html_done).fadeIn(300).delay(4000).fadeOut(800);
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
    console.log('refreshpodcast, event:');
    console.dir(e);
    
    var elemId = $( this ).parents().eq(3).get(0);
    var storageId = $( elemId ).data('storage-id');
    console.log('refreshpodcast, storageId:' + storageId);
        
    var request = $.ajax({
        url: "/refreshpodcast",
        type: "POST",
        data: { urlsafe_key : storageId }
    });
    request.done(function(result){
        console.log('refreshpodast done.');
        updatePodcastHtml(elemId, result);
    });
}

// **--   Playlist page script   --** 
function setPlayerLoadedUi(e){
/*     console.log('setplayerloadedui, is this where it is switching back to play button?'); */
    var player = document.getElementById('audioPlayer');
    $('#playBtn').html('&#9654;');
    $('#playerTimeCurrent').css('fontWeight', 'bold');

    $('.ui-slider-track').css('backgroundColor', 'rgb(241, 210, 170)');

    $('.ui-slider-handle').css('backgroundColor', 'rgb(231, 175, 124)');
    $('.ui-slider-handle').css('border-color', 'rgba(50, 50, 50, 40)');
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

function updateTimeFromSlidestart(e){
    console.log('updateTimeFromSlidetart fired');

    var player = document.getElementById('audioPlayer');
    
    if(!player.paused){
        playTrack(e);    // pauses track
    }
    
    var location = $('#playerSlider').prop('value');
    var duration = player.duration;
    console.log('updateTimeFromSlidestart, location' + location + ', duration: ' + duration);
    displayPlayerTime('', (duration * (location/100)));
}

// This area does not work correctly. I think I need to isolate the setTimeout
// from the play funciton sort of.

function updateTimeFromSlidestop(e){
    console.log('updateTimeFromSlidetop fired');
    console.dir(e);

    var player = document.getElementById('audioPlayer');
    var location = $('#playerSlider').prop('value');
    var duration = player.duration;
    
    displayPlayerTime('', (duration * (location/100)));
    if(player.paused){
        playTrack(e);    // plays track
    }
    
    console.log('updateTimeFromSlidestop, location' + location + ', duration: ' + duration);

}

function setSliderLocation(){
    var player = document.getElementById('audioPlayer');
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

function displayAudioSeekable(){
    var player = document.getElementById('audioPlayer');
    var duration = player.duration; // seconds
/*     var seekable = player.buffered; */
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

    var player = document.getElementById('audioPlayer');

    var playerTime_s = Math.floor(player.currentTime);  // time in seconds
    var duration = Math.floor(player.duration);
    var episodeUrl = $(player).data('episode-url');

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
}

function resumePlayerTime(){
    var initialPlaybackTime = $('#playerTimeCurrent').data('playback-time');
    console.log('resumePlayerTime, initialPlaybacktime: ' + initialPlaybackTime);

    /*     Set the player time and set the ui player time*/
    $('#audioPlayer').prop('currentTime', initialPlaybackTime);
    $('#playerTimeCurrent').html(initialPlaybackTime);
    setSliderLocation();
}

function audioPlayerInit(){
    console.log('audioplayerinit');
    var player = document.getElementById('audioPlayer');
    
    if(player.src){
        player.load();
    }
}

function lastTimer(val){
    this.val = val;
}

function playTrack(eCaller){
    
    /* Plays podcast, saves current playback time so user can pick up where they left off and goes to next episode
        on the list when the current playing is finished. */
    var savePlaybackPositionTimer;
    var player = document.getElementById('audioPlayer');

    function savePlaybackPosition(){
        // Save playback postion to datastore.

        if( player.paused ){
            clearInterval(savePlaybackPositionTimer);
            lastTimer.val = null;
        }

         var data = {
            urlsafe_key: $( player ).data('storage-id'),
            episode_url:  $( player ).data('episode-url') ,
            current_time: Math.floor( player.currentTime )
        };
        
        console.log('Saving time to datastore, timer(right), data(below): ' + 
                    savePlaybackPositionTimer);
        console.dir(data);
        
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
    }
    else{
        player.pause();
        $('#playBtn').html('&#9654;');
    }
}

function playNextTrack(){
    console.log('playnexttrack, find the next track in the list and play it.');
}

function rewindTrack(){
    var player = $('#audioPlayer')[0];
    player.currentTime -= 15;
}

function fastForwardTrack(){
    var player = $('#audioPlayer')[0];
    player.currentTime += 30;
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

function saveNowPlaying(data){
    // Save this new 'now playing track' to data store.
    var request = $.ajax({
        url:'/savenowplaying',
        type: 'POST',
        data: data
    });
    request.done( function(result){
        // Set values in player to the now current title
        $('#playerPodcastTitle').html(result.podcast_title);
        $('#playerEpisodeTitle').html(result.episode_title);
        $('#audioPlayer')[0].currentTime = result.current_time;
    });
}

function setPlayerAttributes(elem, data){
    $( elem.playerSrc ).attr( 'src', data.url );
    $( elem.player ).data('episode-url', data.url);
    $( elem.player ).data('storage-id', data.podcastUrlsafeKey);
}

function sendEpisodeToPlayer(e){
// When clicking episode in playlist (listview) play the episode
// Saves to datastore and updates player to show titles.
    var elem = {
        player: $( '#audioPlayer' )
    };
    console.log('removed the 0');
    // Added separately, since it's dependant on the player element of elem dict.
    elem.playerSrc = $( elem.player ).children()[0];

    var data = {
        url: $( this ).data('episode-url'),
        podcast_urlsafe_key: $( this ).data('storage-id'),
        playlist_urlsafe_key: $('#playlist').data('playlist-id')
    };

    setPlayerAttributes(elem, data);
    elem.player.load();
    playTrack();
    saveNowPlaying(data);
    console.dir(elem);
}

function removeFromPlaylist(e){
    e.preventDefault();
    e.stopImmediatePropagation();

    var elem = $( this ).parent();
    
    var id = $( elem ).attr('id');
    var url = $( elem ).data('episode-url');
    var playlistKey = $('#playlist').data('playlist-id');

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

// **--   Search page script   --** 
function createHtmlPodcastPage(podcast){
    var html = "<div id='subscriptionItem_" + (podcast.length + 1) + "' class='subscriptionItem'>";
    html += "<div data-role='collapsible' data-inset='false' class='subscriptionCollapsible' data-storage-id='" + podcast.urlsafe_key + "'>";
    html += "<h3><img src='" + podcast.image_url + "' alt='podcast logo' height='45' width='45'>";
    html += "<span>" + podcast.title + "<\/span>";
    html += "<div class='subscriptionFunctions' data-podcast-title='" + podcast.title + "'>";
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
    var htmlAdding = '<b>Adding</b> ' + title;
    var htmlAdded = '<b>Added!</b> ' + title + '<br>See results in <a href="/">Podcasts</a>';
    var htmlFailed = '<i>Failed</i> to add ' + title;
    var htmlPodcastPage = '';
    var length = $('#subscriptionList').children().length;

    var request = $.ajax({
        url: "/addpodcast",
        type: "POST",
        data: { url: url }
    });
    $('#searchNotification').html(htmlAdding).fadeIn(300);
    $('#iTunesSearchResultsHtml').empty();        // Really only applies when searching iTunes, not adding by RSS.
    request.done(function(podcast){
        $( '#searchNotification' ).fadeOut( 800 );
        podcast.length = length;
        htmlPodcastPage = createHtmlPodcastPage(podcast);
        $('#subscriptionList').prepend(htmlPodcastPage).trigger('create');
        /* Used setTimeout so text doesn't update before display does.*/
        setTimeout( function(){
            $( '#searchNotification' ).html(htmlAdded).fadeIn(300).delay(2000).fadeOut(800);
        }, 1500 ); 
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

// **--  Event listeners --**
//$( document ).pagecontainer({
$( ':mobile-pagecontainer' ).pagecontainer({
    // Turn player off if it is on and user is switching page. Odd to still
    // have it running unless I put player controls on all pages end goal.
    beforehide: checkPlayerRunning
});
// Podcasts Page
$('#PodcastPage').on('pagecreate', function(e, ui){
    $( '.deleteBtn' ).on( 'click', removePodcast );
    $( '.refreshBtn' ).on( 'click', refreshPodcast );
    $( '.subscriptionList' ).on( 'click', '.addToPlaylist', addToPlaylist );
});
// Playlists Page
$('#PlaylistPage').on('pagecreate', function(e, ui){
    /* Player functions. */
    audioPlayerInit();
    $( '#audioPlayer' ).on( 'durationchange', resumePlayerTime);
    $( '#audioPlayer' ).on( 'canplay', setPlayerLoadedUi);
    $( '#audioPlayer' ).on( 'timeupdate', displayPlayerTime);
    $( '#playerSlider' ).on( 'slidestart', updateTimeFromSlidestart);
    $( '#playerSlider' ).on( 'slidestop', updateTimeFromSlidestop);
    $( '#audioPlayer' ).on( 'ended', playNextTrack);

    /* Player ui functions. */
    $( '#playBtn' ).on( 'click', playTrack );
    $( '#rewindBtn' ).on( 'click', rewindTrack );
    $( '#fastForwardBtn').on( 'click', fastForwardTrack );
    $( '#muteBtn' ).on( 'click', muteAudio );

    /* Playlist functions: */
    $( '#playlist' ).on( 'click', '.deleteBtn', removeFromPlaylist );
    $( '#playlist' ).on( 'click', 'li', sendEpisodeToPlayer );
});

// New Page
$('#NewPage').on('pagecreate', function(e, ui){
    console.log('in new page');
});

// Search Page
$('#SearchPage').on('pagecreate', function(e, ui){
    $( '#iTunesSearchForm' ).on( 'submit', sendITunesSearchRequest );
    $( '#rssSubscribeForm' ).on( 'submit', addPodcastFromRssUrl );
    $( '#iTunesSearchResultsHtml' ).on( 'click', 'li', addPodcastFromITunesSearch );
});
