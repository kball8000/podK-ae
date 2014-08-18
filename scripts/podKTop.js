// Need a layer of functions. One for post from direct input of feed in input fiels and that calls
// the same function that the subscribe button does.
// The layer just teases out the variables from input / hidden fields.
// Subsribe from search field will be like delete, just an a element with javascript in href.

function addPodcastSubscription( podcast ){
/* Need some sort of global counter to increment div id */
	
	var html = '';
	var counter = 0;
	var podcastDecode;
	console.log('raw podcast from python in js' + podcast);
	podcastDecode = JSON.parse(podcast);
	console.log('decoded podcast from python in js' + podcastDecode);
	
	html += '<div data-role="collapsible" id="addedSubscriptionItem_' + counter + '">';
	html += '<h3>' + podcastDecode.title + '<\/h3>';
	html += '<ul data-role="listview">';
	html += '<li>Temporary list item<\/li>';
	var i = 0;
	while( i < podcastDecode.episodes.length ){
		html += '<li>' + podcastDecode.episodes[i] + '<\/li>';
		i += 1;
	}
	html += '<\/ul>';
	html += '<\/div>';
	$( '#iTunesSearchResultsHtml' ).empty();
	$( '#subscriptionList' ).append(html);
/* 						
							<li style='display:inline;'>
								<a href="javascript:removePodcast( '{{ feed.feedUrl }}', '{{ loop.index }}', '{{ feed.title }}' )" 
									class='ui-btn ui-icon-delete ui-btn-icon-notext ui-btn-inline' style='display:inline-block; padding:0.5em 2em;'></a>
								<a href="javascript:refreshPodcast('{{ feed.feedUrl }}')" class='ui-btn ui-icon-refresh ui-btn-icon-notext ui-btn-inline' 
									style='display:inline-block; padding:0.5em 2em;'></a>
							</li>
							{% for show in feed.show %}
							<li> <button class="ui-btn ui-btn-inline" onclick="myAudio.playSelectedEpisode('{{ show.episode_url }}');">
								Play</button> {{ show.episode_title }}
							</li>
							{% endfor %}
						</ul>
											</div>
*/
}

function addPodcast( podcastUrl ){
	$.ajax({
		url: "/addpodcast",
		type: "POST",
		data: { podcastUrl: podcastUrl }
	})
	.done(function(podcast){
		//$( '#podcastSubscriptionForm').remove();
		addPodcastSubscription(podcast);
	});
}

function addPodcastFromUrl( event ){
	/* Get parameter from add rss input field and send to add podcast, as opposed to subscribe button from iTunes search results. */
	event.preventDefault();
	var podcastUrl = $( '#podcastSubscriptionSearch' ).val();
	addPodcast(podcastUrl);
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
	for(var i=0; i<arg.resultCount; i++){
		/* Using jQuery mobile listiew with thumbnails to display iTunes search results. */
		html += '<li><a href="javascript:addPodcastITunesSearch(\'' + encodeURIComponent(results[i].feedUrl) + '\')">';
		html += '<img src="' + results[i].artworkUrl60 + '">';
		html += '<h2>' + results[i].collectionCensoredName + '</h2>';
		html += '<p>' + results[i].artistName + '</p>';
		html += '<\/a><\/li>';
	}
	html += '<\/ul>'; // close list of shows
	$('#iTunesSearchResultsHtml').html(html).trigger('create');
}

$( function(){
	//Search iTunes when user hits enter key on input field.
	$( "#iTunesSearchValue" ).keypress(function(e){
		var key = e.which;
		if(key === 13){
			sendITunesSearchRequest();
			return false;
		}
	});
				
	function removePreviousSearchResults(){
		// Finish this by removing old search queries to iTunes store in head. Otherwise, you've got all these request to iTunes, 
		//  but only showing reults from last search.
		var scriptVal = document.getElementsByTagName('head');

	}
		
	function sendITunesSearchRequest(){
		//Search iTunes API with a dynamically loaded script from user input

		removePreviousSearchResults();

		var searchValue = $('#iTunesSearchValue').val();
		var searchValueEnc = encodeURIComponent(searchValue);
		var url = 'https://itunes.apple.com/search?entity=podcast' + '&term=' + searchValueEnc +'&callback=showITunesSearchResults';
		var html = "<script src='" + url + "'><\/script>";
		$( "head" ).append(html);
	}

	//Event listener for search handlers
	$( '#iTunesSearchButton' ).click( sendITunesSearchRequest );
	$( '#podcastSubscriptionForm' ).submit( addPodcastFromUrl );
});

