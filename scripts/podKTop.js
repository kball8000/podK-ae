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
		// Finish this by removing old search queries.
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

	$('#iTunesSearchButton').click(function(){
		(sendITunesSearchRequest());
	});
});

function getBasePodcast(longName){
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
	var html = '<li>' +
		result.collectionCensoredName + 
		'<a href="' + result.feedUrl + '">Subscribe<\/a>' + 
		'<\/li>';

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


