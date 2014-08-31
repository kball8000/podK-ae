// **--   Home - Pocast page script   --** 

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

// **--   Search page script   --** 

function displayAddedNotification(title){
	var html = 'Added ' + title + '<br>See results in <a href="/">Podcasts</a> tab';
	$( '#searchNotification' ).html(html).fadeIn(300).delay(3000).fadeOut(800);
}

function addPodcastToDatastore( url, title ){
	var htmlAdding = 'Adding ' + title;
	var htmlAdded = 'Added ' + title + '<br>See results in <a href="/">Podcasts</a>';
	var htmlFailed = 'Failed to add ' + title;
	
	console.log('url and title are = ' + url + ', ' + title );
	
	var request = $.ajax({
		url: "/addpodcast",
		type: "POST",
		dataType: "json",
		data: JSON.stringify({ url: url})
	});
	$('#searchNotification').html(htmlAdding).fadeIn(300);
	$('#iTunesSearchResultsHtml').empty();		// Really only applies when searching iTunes, not adding by RSS.
	request.done(function(podcast){
		$( '#searchNotification' ).fadeOut( 800 );
		/* You can create another function to run in 1000 ms, but no delay to stop changhing background or html content. */
		setTimeout( function(){
			console.log('in timeout');
			$( '#searchNotification' ).html(htmlAdded).fadeIn(300).delay(2000); //.fadeOut(800);
		}, 1500 ); 
	});

	request.fail(function(){
		console.log('did not work');
//		$('#searchNotification').fadeOut(800);
//		$('#searchNotification').html(htmlFailed).fadeIn(800).delay(2000).fadeOut(800);
		$('#searchNotification').html(htmlFailed);
		$('#searchNotification').delay(5000).fadeOut(800);
	});

}

//function addPodcastITunesSearch(encPodcastUrl){
function addPodcastFromITunesSearch(e){
	var elem = $( this ).get(0);
//	var podcastUrl = decodeURIComponent(encPodcastUrl);
	var title = $( elem ).data('podcast-title');
	var url = $( elem ).data('podcast-url');
	event.preventDefault();
	$( '#iTunesSearchButton' ).focus();  // Closes keyboard on mobile devices.
	console.log('elem = ' + elem);
	console.dir(e);
	addPodcastToDatastore(url, title);	
}

function addPodcastFromRssUrl( event ){
	/* Get parameter from add rss input field and send to add podcast, as opposed to subscribe button from iTunes search results. */
	event.preventDefault();
	$( '#rssSubscribeButton' ).focus();  // Closes keyboard on mobile devices.
	var podcastUrl = $( '#rssSubscribeUrl' ).val();
	addPodcastToDatastore(podcastUrl);
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
		return true;
	}
	html += '<ul data-role="listview" data-inset="true">';
	for(var i=0; i<arg.resultCount; i++){
		/* Using jQuery mobile listiew with thumbnails to display iTunes search results. */
//		podcastFeed = encodeURIComponent(results[i].feedUrl);
		podcastFeed = results[i].feedUrl;
		title = results[i].collectionCensoredName;
//	<div id='subscriptionItem_{{ loop.index }}' data-podcast-title='{{ feed.title }}' data-podcast-url='{{feed.feedUrl}}' class='subscriptionItem'>

		html += '<li data-podcast-title="' + title + '" data-podcast-url=' + podcastFeed +'><a href="#">';
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


$( document ).ready( function(){
	//Event listener for search handlers
	$( '#iTunesSearchForm' ).on( 'submit', sendITunesSearchRequest );
	$( '#rssSubscribeForm' ).on( 'submit', addPodcastFromRssUrl );
	$( '#iTunesSearchResultsHtml' ).on( 'click', 'li', addPodcastFromITunesSearch );
	$( '.subscriptionFunctions' ).on( 'click', '.deleteBtn', deletePodcast );
	$( '.subscriptionFunctions' ).on( 'click', '.refreshBtn', refreshPodcast );
	
});
