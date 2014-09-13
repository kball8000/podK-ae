// **--   Home - Pocast page script   --** 

function addToPlaylist(e){
	e.preventDefault();
/* 	e.stopPropagation(); */
	
	var elemPodcast = $( this ).parents().eq(4).get(0);
	var elemEpisode = $( this ).parent().get(0);

	var urlPodcast = $( elemPodcast ).data('podcast-url');
	var urlEpisode = $( elemEpisode ).data('episode-url');
/* 	var url = $( elemEpisode ).data('episode-url'); */

	var list = $( '#playlist ul' );
	var length = $( list ).children().length;
	console.log('length = ' + length);
 	var html = '<li data-icon="false" id="playlistItem_' + (length + 1);
	html += '" class="playlistItem"><a href="#">';
	html += '<h2>More<\/h2><p>Less<\/p><\/a><a href="#" class="deleteBtn"><\/a><\/li>';
	console.log('html: ' + html);
			
			
/*				<h2>{{ episode.titlePodcast }}</h2>
				<p>{{ episode.titleEpisode }}</p>
			</a>
			<a href="#" class='deleteBtn'></a>
		</li>
 */
	
	var request = $.ajax({
		url: '/addtoplaylist',
		type: 'POST',
		data: { urlEpisode: urlEpisode, urlPodcast: urlPodcast }
	});
	request.done( function(result){
		$( list ).prepend(html).listview('refresh');
		console.log('Added ' + result.titlePodcast + ' - ' + result.titleEpisode + ' to playlist!');
	});
}

function deletePodcast(e){
	/* -Acts on the 'X' button next to each podcast. It removes the subscription to that podcast.
	 -Would like to maintain a history of inactive subscriptions. */
	// -Really nice yes / no pop up in http://demos.jquerymobile.com/1.4.3/popup/ -- dialog, but way more complicated than the standard confirm
	// -May want to change this to an undo / dismiss notifcation thing that doesn't disappear until you do something else???
	// -When I redo where the delete and refresh buttons are, change the way you retrieve the title
	// from data-url to looking at title text in <a> element.
	
	
	e.preventDefault();
	e.stopImmediatePropagation();
	
	var elemUrl = $( this ).parents().eq(1).get(0);
	var title = $( this ).data('podcast-title');
	console.dir('title in delete podcast' + title);
	var podcast = $( elemUrl ).data('podcast-url');
/* 	var title = $( elemTitle ).data('podcast-title'); */
	var divToRemove = elemUrl.id;
	var html = 'Removing ' + title;
	var html_done = title + ' removed' ;

	if (confirm('Delete ' + title + '?') === true){
		var request = $.ajax({
			url: "/removepodcast",
			type: "POST",
			data: { podcast : podcast }
		});
		$( '#podcastNotification' ).html(html).fadeIn(300);
		request.done(function(){
			$( '#'+divToRemove ).remove();
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
function removeFromPlaylist(e){
	e.preventDefault();
	e.stopImmediatePropagation();

	var elem = $( this ).parent().get( 0 );
	var id = elem.id;
	var url = $( elem ).data('episode-url');
	console.log('url for removal: ' + url);
	// Remove item from datastore
	var request = $.ajax({
		url: '/removefromplaylist',
		type: 'POST',
		data: { url: url }
	});
	request.done( function(result){
		console.log('Removed from playlist: ' + result );
	});
	
	// Remove item from ui
	$( '#'+id ).remove();
	
}

function playPodcast(){
/* 	var elem = $( this ).get( 0 );
	var url = $( elem ).data('episode-url');
 */
/* 	var url = $( this ).data('episode-url'); */
	console.log('in playpodcast playlist page playBtn');
	var savePlaybackPositionTimer;
//	console.log('episode url in playpodcast: ' + url );
	// This almost makes both players go, but I need the refresh doesn't work.
	// It only works if I set the actual audio tag source...
	
	var player = $( '#audioPlayer' )[0];
	console.dir(player);
	
	function savePlaybackPosition(){
/* 		$.ajax request */
	}
	
	if(player.paused){
		player.play();
	}
	else{
		player.pause();
	}
	savePlaybackPositionTimer = setInterval( savePlaybackPosition , 10000);
}

function setNowPlaying(urlPodcast, urlEpisode){
	console.log('setNowPlaying ep url: ' + urlEpisode );
	console.log('setNowPlaying pd url: ' + urlPodcast );
	var request = $.ajax({
		url:'/setnowplaying',
		type: 'POST',
		data: { url_podcast: urlPodcast, url_episode: urlEpisode }
	});
	request.fail( function(){
		console.log('failed to load to player');
	});
/* 	$.ajax request to save info to datastore */
}

function sendEpisodeToPlayer(e){
/* When clicking episode in playlist (listview) play the episode */
	var url = $( this ).data('episode-url');
	var urlPodcast = $( this ).data('podcast-url');
	var player = $( '#audioPlayer' )[0];
	var playerSrc = $( player ).children()[0];
	
	$( playerSrc ).attr( 'src', url );
	player.load();
	setNowPlaying(urlPodcast, url);
	playPodcast();	
}

// **--   Search page script   --** 
function addPodcastToDatastore( url, title ){
	// since I don't know the title like in itunes search which returns it, 
	// The line below uses default 'rss feed' text since the user isn't supplying title.
	title = (title) ? title : 'RSS Feed';  
	var htmlAdding = '<b>Adding</b> ' + title;
	var htmlAdded = '<b>Added!</b> ' + title + '<br>See results in <a href="/">Podcasts</a>';
	var htmlFailed = '<i>Failed</i> to add ' + title;

	console.log('url: ' + url);
	
	var request = $.ajax({
		url: "/addpodcast",
		type: "POST",
		data: { url: url }
	});
	$('#searchNotification').html(htmlAdding).fadeIn(300);
	$('#iTunesSearchResultsHtml').empty();		// Really only applies when searching iTunes, not adding by RSS.
	request.done(function(podcast){
		$( '#searchNotification' ).fadeOut( 800 );
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
/* 	var elem = $( this ).get(0); */
	var url = $( this ).data('podcast-url');
	var title = $( this ).data('podcast-title');
	event.preventDefault();
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

function showITunesSearchResults(arg){
	//This callback function of the dynamically loaded script display the restults from iTunes store.
	var results = arg.results;
	var podcastFeed;
	var title;
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
		return true;
	}
	html += '<ul data-role="listview" data-inset="true">';
	for(var i=0; i<arg.resultCount; i++){
		/* Using jQuery mobile listiew with thumbnails to display iTunes search results. */
//		podcastFeed = encodeURIComponent(results[i].urlPodcast);
		podcastFeed = results[i].feedUrl;
		title = results[i].collectionCensoredName;
//	<div id='subscriptionItem_{{ loop.index }}' data-podcast-title='{{ feed.title }}' data-podcast-url='{{feed.urlPodcast}}' class='subscriptionItem'>

		html += '<li data-podcast-title="' + title + '" data-podcast-url=' + podcastFeed +'><a href="#">';
		html += '<img src="' + results[i].artworkUrl100 + '">';
		html += '<h2>' + results[i].collectionCensoredName + '</h2>';
		html += '<p>' + results[i].artistName + '</p>';
		html += '<\/a><\/li>';
	}
	html += '<\/ul>'; // close list of shows
	$('#iTunesSearchResultsHtml').html(html).trigger('create');
	$('#searchNotification').fadeOut(300);
}

function sendITunesSearchRequest(event){
	//Search iTunes API with a dynamically loaded script from user input

	event.preventDefault();

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


// **--  Event listeners --**
// Podcasts Page
$('#PodcastPage').on('pagecreate', function(e, ui){
	$( '.subscriptionFunctions' ).on( 'click', '.deleteBtn', deletePodcast );
	$( '.subscriptionFunctions' ).on( 'click', '.refreshBtn', refreshPodcast );
	$( '.subscriptionCollapsible' ).on( 'click', '.addToPlaylist', addToPlaylist );
});
// Playlists Page
$('#PlaylistPage').on('pagecreate', function(e, ui){
	/* 		load time from data in nowPlaying */
	if( $( '#audioPlayer' ).length  ){
		console.log('loading player...');
	}
	$( '#playlist' ).on( 'click', '.deleteBtn', removeFromPlaylist );
	$( '#playlist' ).on( 'click', 'li', sendEpisodeToPlayer );
	$( '#playBtnId' ).on( 'click', playPodcast );
});
// New Page
$('#NewPage').on('pagecreate', function(e, ui){
	console.log('in new page')
});
// Search Page
$('#SearchPage').on('pagecreate', function(e, ui){
	$( '#iTunesSearchForm' ).on( 'submit', sendITunesSearchRequest );
	$( '#rssSubscribeForm' ).on( 'submit', addPodcastFromRssUrl );
	$( '#iTunesSearchResultsHtml' ).on( 'click', 'li', addPodcastFromITunesSearch );
});
