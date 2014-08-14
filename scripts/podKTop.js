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

	//Event listener for iTunes search handler
	$('#iTunesSearchButton').click(function(){
		(sendITunesSearchRequest());
	});
});

function removePodcast(podcast, loopIndex){
	// Acts on the 'X' button next to each podcast. It removes the subscription to that podcast.
	// Would like to maintain a history of inactive subscriptions.
	// Would like an 'are you sure button', maybe stop asking if they do more than 2 in a row.

	$.ajax({
		type: "POST",
		url: "/removepodcast",
		datatype: "JSON",
		data: JSON.stringify({ "podcast" : podcast })
	})
	.done(function(data){
		// Incomplete, want to select ID that is passed to the function, i.e. data.
		// $( '#listItem_' + podcast ).remove();
		$( '#listItem_'+loopIndex).remove();
	});
}



function getBasePodcast(longName){
// Used this to avoid showing same picture again and again in search results when the only difference is the media
// format, i.e. mp3 / video-hi / video-low... etc.
	var shortName = '';
	var nameLength = longName.length;
	var i = 0;
	while(i < nameLength){
		if(longName[i] !== '('){
			shortName += longName[i];
			i += 1;
		}
		else{
			break;
		}
	}
	return shortName;
}

function createPodcastListItem (result){
	var html = '<li> \
		<form action="/addpodcast" method="post" data-ajax="false"> \
		<input type="hidden" name="podcastSubscription" value = "' + result.feedUrl + '"> \
		<input type="Submit" class="ui-btn ui-input-btn" value="Subscribe"\/>' +
		result.collectionCensoredName + 
		'<\/form> \
		<\/li>';

	return html;
}


function showITunesSearchResults(arg){
	//This callback function of the dynamically loaded script display the restults from iTunes store.
	var results = arg.results;
	var html = '';
	var basePodcast = '';
	var nextBasePodcast = '';
	var isGridOpen = false;
	var isNextPodcastSameTitle = false;
	
	// Sort results based on the 'collection name', iTunes term, in genral the title of the show.	
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
	
	// Display the results with image on the LHS and info on 80% RHS, attempted to remove repeating images
	html = '<div class="podcastSearchResults">';
	
	if (arg.resultCount === 0) {
		html = 'No results found';
		$('#iTunesSearchResultsHtml').html(html);	
		return true;
	}
	
	for(var i=0; i<arg.resultCount; i++){
		if(!isGridOpen){
			html += '<div class="ui-grid-a">';
			isGridOpen = true;
			html += '<div class="ui-block-a">';
			html += '<img src="' + results[i].artworkUrl60 + '"\/>';
			html += '<\/div>'; // close block a
			html += '<div class="ui-block-b">';
			html += '<ul>';
		}
		html += createPodcastListItem(results[i]);
		basePodcast = getBasePodcast(results[i].collectionCensoredName);
		if (i < arg.resultCount - 1){
			nextBasePodcast = getBasePodcast(results[ i+1 ].collectionCensoredName);
			if (basePodcast === nextBasePodcast){
				continue;
			}	
		}

		if(isGridOpen){
			html += '<\/ul>'; // close list of shows
			html += '<\/div>'; // close block b
			html += '<\/div>'; // close grid a
			isGridOpen = false;
		}
	}
	html += '<\/div>'; // Closes podcast search results 
	$('#iTunesSearchResultsHtml').html(html);
}


