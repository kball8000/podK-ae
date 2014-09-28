// **--   Home - Pocast page script   --** 
function createPlaylistListviewItem(result){
	var html = '';

	html = '<li data-icon="false"';
	html += 'data-episode-url="' + result.episode_url + '" ';
	html += 'data-storage-id="' + result.urlsafe_key + '" ';
	html += 'id="playlistItem_' + (result.length + 1) + '" ';
	html += 'class="playlistItem"><a href="#">';
	html += '<h2>' + result.podcast_title + '<\/h2>';
	html += '<p>' + result.episode_title + '<\/p><\/a>';
	html += '<a href="#" class="deleteBtn"><\/a>';
	html += '<\/li>';

	return html;
}

function addToPlaylist(e){
/* 	 On main podcast page clicking episodes adds them to the list on the playlist page. 
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
	
	console.log('removepodcast');
	console.dir(elemId);
	console.log('storageId: ' + storageId);

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
	console.dir(e);
	console.log('refresh podcast');
}

// **--   Playlist page script   --** 

function displayPlayerTime(){
	/* Displays the time in the player region of the ui.*/

	var player = $('#audioPlayer')[0];
	var time_s = player.currentTime;  // time in seconds
	$('#playerTimeCurrent').data('init-playback-time', Math.floor(time_s));
	console.log('data-init time = : ' + $('#playerTimeCurrent').data('init-playback-time'));

	var duration = Math.floor(player.duration);
	var s = 0, min = 0, hr = 0;

	hr = Math.floor(time_s/3600);
	min = Math.floor((time_s % 3600)/60);
	s = Math.floor((time_s % 60));

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
	$('#playerTimeCurrent').html(hr+min+s);
}

function setAudioPlayerInit(){
	var initialPlaybackTime = $('#playerTimeCurrent').data('init-playback-time');
	var readyStateInterval;
	var player = $('#audioPlayer')[0];
	var playerSrc = $( player ).children()[0];

	if ($( playerSrc ).attr( 'src' )){
		
		player.load();

		readyStateInterval = setInterval( function(){
			console.log('Player ready state when loading player for the first time: ' + 
						player.readyState);
			if (player.readyState > 0) {
				player.currentTime = initialPlaybackTime;
				displayPlayerTime();
				clearInterval(readyStateInterval);
			}
		}, 100);
	}
	$('#playerTimeCurrent').html(initialPlaybackTime);
}

function playTrack(){
	/* Plays podcast, saves current playback time so user can pick up where they left off and goes to next episode
		on the list when the current playing is finished. */
	var savePlaybackPositionTimer;
	var playbackPositionTimer;
	var nextTrackTimer;
	var player = $('#audioPlayer')[0];

	function ifNextTrack(){
		console.log('in next track');
		if (player.ended){
			console.log('track has ended.');
			clearInterval(nextTrackTimer);
		}
		if (player.paused){
			clearInterval(nextTrackTimer);
		}
	}
	
	function checkPlayerTimeChange(){
		/* Check to see if diplay needs updating. */
		var time_player = $('#audioPlayer')[0].currentTime;  // time in seconds of player
		var time_displayed = $('#playerTimeCurrent').data('init-playback-time');

		if (time_displayed !== Math.floor(time_player)){
			displayPlayerTime();
		}
		if( player.paused){
			clearInterval(playbackPositionTimer);
		}
	}

	function savePlaybackPosition(){
		// Save playback postion to datastore.
		var playerSrc = $( player ).children()[0];
		var episodeInfo = $('#playerEpisodeInfo').children();
		
		if( player.paused){
			clearInterval(savePlaybackPositionTimer);
		}

 		var data = {
			urlsafe_key: $( player ).data('storage-id'),
			episode_url:  $(playerSrc).attr('src') ,
			current_time: Math.floor(player.currentTime)
		};
		
		console.log('saving playback postion data: ');
		console.log('saving playback postion data: urlsafe_key: ' + $( player ).data('storage-id'));
		console.dir(data);
		console.log('Saving playback position to datastore');
		var request = $.ajax({
			url: '/saveplaybackposition',
			type: 'POST',
			data: data
		});
	}

	if(player.paused){
		playbackPositionTimer = setInterval( checkPlayerTimeChange , 300);
		savePlaybackPositionTimer = setInterval( savePlaybackPosition , 5000);
		nextTrackTimer = setInterval( ifNextTrack , 1000 );
		player.play();
	}
	else{
		player.pause();
	}
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
	var elem = {};
	var data = {};

	elem.player = $( '#audioPlayer' )[0];
	elem.playerSrc = $( elem.player ).children()[0];

	data.url = $( this ).data('episode-url');
	data.podcast_urlsafe_key = $( this ).data('storage-id');
	data.playlist_urlsafe_key = $('#playlist').data('playlist-id');

	elem.player.load();
	playTrack();	
	setPlayerAttributes(elem, data);
	saveNowPlaying(data);
}

function removeFromPlaylist(e){
	e.preventDefault();
	e.stopImmediatePropagation();

/* 	var elem = $( this ).parent().get( 0 ); */
	var elem = $( this ).parent();

	var id = $( elem ).attr('id');
	var url = $( elem ).data('episode-url');
	var playlistKey = $('#playlist').data('playlist-id');
/* 	var storageId = $( elem ).data('storage-id'); */

	console.dir(elem);
	console.log('id for removal: ' + id);
	console.log('url for removal: ' + url);
/* 	console.log('storageId for removal: ' + storageId); */
	// Remove item from datastore
	var request = $.ajax({
		url: '/removefromplaylist',
		type: 'POST',
		data: { url: url, playlist_key: playlistKey }
	});
	request.done( function(){
		console.log('Successfully removed from playlist: ');
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
		html += podcast.episode[i].current_time + '33<\/a><\/li>';
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
	$('#iTunesSearchResultsHtml').empty();		// Really only applies when searching iTunes, not adding by RSS.
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
	/* 	Consider  adding the spinner loader animation from JQM here. */
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
	$( '#itunesScript' ).empty(); 		// Remove any searches between page reloads.
	$( '#itunesScript' ).append(html); 	// Appending script runs it and gets result from Apple store.
	$( '#iTunesSearchValue').blur(); 	// Makes the go keyboard disappear on mobile.
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
/* 		return true; */
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
//$( 'body' ).pagecontainer({
	beforechange: function(event, ui){
		console.log('in before change function, checking for audio player');
		if ( $('#audioPlayer').length > 0){
			console.log('player exists.');
			var player = $('#audioPlayer')[0];
			if ( !player.paused ){
				playTrack();
			}
		}
	}
});
// Podcasts Page
$('#PodcastPage').on('pagecreate', function(e, ui){
	$( '.deleteBtn' ).on( 'click', removePodcast );
	$( '.refreshBtn' ).on( 'click', refreshPodcast );
	$( '.subscriptionList' ).on( 'click', '.addToPlaylist', addToPlaylist );
});
// Playlists Page
$('#PlaylistPage').on('pagecreate', function(e, ui){
	setAudioPlayerInit();
	$( '#playlist' ).on( 'click', '.deleteBtn', removeFromPlaylist );
	$( '#playlist' ).on( 'click', 'li', sendEpisodeToPlayer );
	$( '#playBtn' ).on( 'click', playTrack );
	$( '#rewindBtn' ).on( 'click', rewindTrack );
	$( '#fastForwardBtn').on( 'click', fastForwardTrack );
	$( '#muteBtn' ).on( 'click', muteAudio );
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
