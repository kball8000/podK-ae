$( function(){
	//Search iTunes when user hits enter key on input field.
	$( "#iTunesSearchValue" ).keypress(function(e){
		console.log('in enter key mode.');
		var key = e.which;
		if(key === 13){
			console.log('in enter key mode.2');
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

function showITunesSearchResults(arg){
	//This callback function of the dynamically loaded script display the restults from iTunes store.
	var results = arg.results;
	var html = '<ul>';
	html = '';
	for(var i=0; i<arg.resultCount; i++){
		html += '<li>' +
			'<img src="' + results[i].artworkUrl60 + '"\/>' +		
			results[i].collectionCensoredName + 
			'<a href="' + results[i].feedUrl + '">Subscribe<\/a>' + 
			'<\/li>';
	}
	html += '<\/ul>';
	$('#iTunesSearchResultsHtml').html(html);
}


