// Get image from xml feed, not itunes store, or backup from xml, as direct input of xml will not have an iTunes image to show.
// Figure out why screen is unresponsive in chrome. something is bogging things down.

function addPodcastSubscription( podcast ){
/* Need some sort of global counter to increment div id */
	
	var html = '';
	var counter = 0;

	html += '<div style="position:relative;" id="addedSubscriptionItem_' + counter + '">';
	html += '<div style="position:absolute; top:0.3em; right:0.5em; z-index:1;">';
	html += '<a href="javascript:removePodcast( \'' + podcast.feedUrl + ', ' + counter + ', ' + podcast.title + '\' )" ';
	html += 'class="ui-btn ui-icon-delete ui-btn-icon-notext ui-btn-inline" style="display:inline-block; padding:0.2em 1em;"></a>';
	html += '<a href="javascript:refreshPodcast(\'' + podcast.title + '\')" class="ui-btn ui-icon-refresh ui-btn-icon-notext ui-btn-inline"';
	html += 'style="display:inline-block; padding:0.2em 1em;"></a>';
	html += '</div>';

	html += '<div data-role="collapsible">';
		
	html += '<h3><img src="'+ podcast.imageUrl +'" alt="podcast logo" height="45" width="45" style="border-radius:0.3em;';
	html += 'margin:0 0.7em 0 0.5em; vertical-align:middle;">' + podcast.title + '<\/h3>';
	html += '<ul data-role="listview">';
	var i = 0;
	while( i < podcast.episodes.length ){
		html += '<li><button class="ui-btn ui-btn-inline" onclick="myAudio.playSelectedEpisode(\'';
		html += podcast.episodes[i].url + '\')">Play</button>' + podcast.episodes[i].title + '<\/li>';
		i += 1;
	}
	html += '<\/ul>';
	html += '<\/div>';
	$( '#iTunesSearchResultsHtml' ).empty();
	$( '#subscriptionList' ).prepend(html).trigger('create');
}

function addPodcast( podcastUrl ){
	// Send data to python app to add podcast to datastore.
	var test = JSON.stringify({ podcastUrl: podcastUrl });
	$.ajax({
		url: "/addpodcast",
		type: "POST",
		dataType: "json",
		data: JSON.stringify({ podcastUrl: podcastUrl})
	})
	.done(function(podcast){
		addPodcastSubscription(podcast);
	});
}

function displayAddedNotification(title){
	$( '#subscribeNotification' ).html('Added ' + title).fadeIn(300).delay(2000).fadeOut(800);
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
		console.dir(podcast);
		displayAddedNotification(podcast.title);
	});
}

function addPodcastFromRssUrl( event ){
	/* Get parameter from add rss input field and send to add podcast, as opposed to subscribe button from iTunes search results. */
	event.preventDefault();
	$( '#rssSubscribeButton' ).focus();
	var podcastUrl = $( '#rssSubscribeUrl' ).val();
	addPodcastToDatastore(podcastUrl);
}

function addPodcastITunesSearch(encPodcastUrl){
	var podcastUrl = decodeURIComponent(encPodcastUrl);
	addPodcast(podcastUrl);	
}

function removePodcast(podcast, loopIndex, title){
	/* -Acts on the 'X' button next to each podcast. It removes the subscription to that podcast.
	 -Would like to maintain a history of inactive subscriptions. */
	// Really nice yes / no pop up in http://demos.jquerymobile.com/1.4.3/popup/ -- dialog, but way more complicated than the standard confirm
	
	if (confirm('Delete ' + title + '?') === true){
		$.ajax({
			url: "/removepodcast",
			type: "POST",
			data: { podcast : podcast }
		})
		.done(function(){
			$( '#subscriptionItem_'+loopIndex).remove();
		});
	}
	else{
		return true;
	}
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

	
// 	Get string of collection name without the '(' for comparing, figure out how to handle if last one in list
// 	is the same as previous and therefore not closed out.
		
	if (arg.resultCount === 0) {
		html = 'No results found';
		$('#iTunesSearchResultsHtml').html(html);	
		return true;
	}
	html += '<ul data-role="listview" data-inset="true">';
	var myFeed;
	var myImage;
	for(var i=0; i<arg.resultCount; i++){
		/* Using jQuery mobile listiew with thumbnails to display iTunes search results. */
		myFeed = encodeURIComponent(results[i].feedUrl);
		html += '<li><a href="javascript:addPodcastITunesSearch(\'' + myFeed + '\')">';
		html += '<img src="' + results[i].artworkUrl100 + '">';
		html += '<h2>' + results[i].collectionCensoredName + '</h2>';
		html += '<p>' + results[i].artistName + '</p>';
		html += '<\/a><\/li>';
	}
	html += '<\/ul>'; // close list of shows
	$('#iTunesSearchResultsHtml').html(html).trigger('create');
}

function sendITunesSearchRequest(){
	//Search iTunes API with a dynamically loaded script from user input

//	removePreviousSearchResults();
	
	var searchValue = $('#iTunesSearchValue').val();
	var searchValueEnc = encodeURIComponent(searchValue);
	var url = 'https://itunes.apple.com/search?entity=podcast' + '&term=' + searchValueEnc + '&callback=showITunesSearchResults';
	var html = "<script src='" + url + "'><\/script>";
	$( "head" ).append(html);

	$( '#iTunesSearchButton' ).focus();

	return false;
}

function removePreviousSearchResults(){
	// Finish this by removing old search queries to iTunes store in head. Otherwise, you've got all these request to iTunes, 
	//  but only showing reults from last search.
	var scriptVal = document.getElementsByTagName('head');

}


$( function(){
	//Event listener for search handlers
//	$( '#iTunesSearchButton' ).on( 'click', sendITunesSearchRequest );
	$( '#iTunesSearchForm' ).on( 'submit', sendITunesSearchRequest );
	$( '#rssSubscribeForm' ).on('submit', addPodcastFromRssUrl );
});

