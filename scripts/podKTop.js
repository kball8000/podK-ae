// **--   Home - Pocast page script   --** 
//function deletePodcast(podcast, loopIndex, title){
function deletePodcast(e){
	/* -Acts on the 'X' button next to each podcast. It removes the subscription to that podcast.
	 -Would like to maintain a history of inactive subscriptions. */
	// Really nice yes / no pop up in http://demos.jquerymobile.com/1.4.3/popup/ -- dialog, but way more complicated than the standard confirm
	// May want to change this to an undo / dismiss notifcation thing that doesn't disappear until you do something else???
	
	e.preventDefault();
	e.stopPropagation();
	var elem = $( this ).parents().eq(1).get(0);
	var title = $( elem ).data('podcast-title');		// podcast title
	var podcast = $( elem ).data('podcast-url');		// podcast feed url
	var divToRemove = elem.id;						// element on page to remove
	if (confirm('Delete ' + title + '?') === true){
		$.ajax({
			url: "/removepodcast",
			type: "POST",
			data: { podcast : podcast }
		})
		.done(function(){
			console.log('getting to done');
			$( '#'+divToRemove ).remove();
			console.log('getting to end of done');
		});
	}
	else{
		return true;
	}

}

function refreshPodcast(e){
	e.preventDefault();
	e.stopPropagation();
	console.dir(e);
	console.log('refresh podcast');
}

// **--   Search page script   --** 
function displayAddedNotification(title){
	var html = 'Added ' + title + '<br>See results in <a href="/">Podcasts</a> tab';
	$( '#subscribeNotification' ).html(html).fadeIn(300).delay(3000).fadeOut(800);
}

function addPodcastToDatastore( podcastUrl ){
	var test = JSON.stringify({ podcastUrl: podcastUrl });
	$.ajax({
		url: "/addpodcast",
		type: "POST",
		dataType: "json",
		data: JSON.stringify({ podcastUrl: podcastUrl})
	})
	.done(function(podcast){
		displayAddedNotification(podcast.title);
		$('#iTunesSearchResultsHtml').empty();		// Really only applies when searching iTunes, not adding by RSS.
	});
}

function addPodcastITunesSearch(encPodcastUrl){
	var podcastUrl = decodeURIComponent(encPodcastUrl);
	addPodcastToDatastore(podcastUrl);	
}

function showITunesSearchResults(arg){
	//This callback function of the dynamically loaded script display the restults from iTunes store.
	var results = arg.results;
	var podcastFeed;
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
		return true;
	}
	html += '<ul data-role="listview" data-inset="true">';
	for(var i=0; i<arg.resultCount; i++){
		/* Using jQuery mobile listiew with thumbnails to display iTunes search results. */
		podcastFeed = encodeURIComponent(results[i].feedUrl);
		html += '<li><a href="javascript:addPodcastITunesSearch(\'' + podcastFeed + '\')">';
		html += '<img src="' + results[i].artworkUrl100 + '">';
		html += '<h2>' + results[i].collectionCensoredName + '</h2>';
		html += '<p>' + results[i].artistName + '</p>';
		html += '<\/a><\/li>';
	}
	html += '<\/ul>'; // close list of shows
	$('#iTunesSearchResultsHtml').html(html).trigger('create');
}

function sendITunesSearchRequest(event){
	//Search iTunes API with a dynamically loaded script from user input

	event.preventDefault();

	var searchValue = $('#iTunesSearchValue').val();
	var url = 'https://itunes.apple.com/search?entity=podcast' + '&term=' + 
		encodeURIComponent(searchValue) + '&callback=showITunesSearchResults';
	var html = "<script src='" + url + "'><\/script>";
	$( '#itunesScript' ).empty(); 		// Remove any searches between page reloads.
	$( '#itunesScript' ).append(html); 	// Appending script runs it and gets result from Apple store.
	$( '#iTunesSearchValue').blur(); 	// Makes the go keyboard disappear on mobile.

	// Next display search results.
	
	return false;
}

function addPodcastFromRssUrl( event ){
	/* Get parameter from add rss input field and send to add podcast, as opposed to subscribe button from iTunes search results. */
	event.preventDefault();
	$( '#rssSubscribeButton' ).focus();  // Closes keyboard on mobile devices.
	var podcastUrl = $( '#rssSubscribeUrl' ).val();
	addPodcastToDatastore(podcastUrl);
}

$( document ).ready( function(){
	//Event listener for search handlers
	$( '#iTunesSearchForm' ).on( 'submit', sendITunesSearchRequest );
	$( '#rssSubscribeForm' ).on( 'submit', addPodcastFromRssUrl );
	$( '.subscriptionFunctions' ).on( 'click', '.deleteBtn', deletePodcast );
	$( '.subscriptionFunctions' ).on( 'click', '.refreshBtn', refreshPodcast );
//	$( '.subscriptionFunctions' ).on( 'click', '.deleteBtn', testFunc2 );
//	$( '.subscriptionFunctions' ).on( 'click', '.refreshBtn', testFunc2 );
	
});
