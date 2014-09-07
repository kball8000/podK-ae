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
	// Really nice yes / no pop up in http://demos.jquerymobile.com/1.4.3/popup/ -- dialog, but way more complicated than the standard confirm
	// May want to change this to an undo / dismiss notifcation thing that doesn't disappear until you do something else???
	
	var elem = $( this ).parents().eq(1).get(0);
	var title = $( elem ).data('podcast-title');
	var podcast = $( elem ).data('podcast-url');
	var divToRemove = elem.id;
	var html = 'Removing ' + title;

	e.preventDefault();
	e.stopImmediatePropagation();
	
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
	e.stopPropagation();
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

function playPodcast(e){
	var elem = $( this ).get( 0 );
	var url = $( elem ).data('episode-url');

	// This almost makes both players go, but I need the refresh doesn't work.
	// It only works if I set the actual audio tag source...
	
	$('.audioSource').attr('src', url);
	$('.stdControls').refresh();
		
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

$( document ).ready( function(){
	//Event listeners Podcasts Page
	$( '.subscriptionFunctions' ).on( 'click', '.deleteBtn', deletePodcast );
	$( '.subscriptionFunctions' ).on( 'click', '.refreshBtn', refreshPodcast );
	$( '.subscriptionCollapsible' ).on('click', '.addToPlaylist', addToPlaylist);
	//Event listeners Search Page
	$( '#iTunesSearchForm' ).on( 'submit', sendITunesSearchRequest );
	$( '#rssSubscribeForm' ).on( 'submit', addPodcastFromRssUrl );
	$( '#iTunesSearchResultsHtml' ).on( 'click', 'li', addPodcastFromITunesSearch );
	//Event listeners Playlists Page
	$( '#playlist' ).on('click', '.deleteBtn', removeFromPlaylist);
	$( '#playlist' ).on('click', 'li', playPodcast);
});
