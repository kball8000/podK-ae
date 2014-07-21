$( function(){
	$( "#iTunesSearchValue" ).keypress(function(e){
		console.log('in enter key mode.');
		var key = e.which;
		if(key == 13){
			console.log('in enter key mode.2');
			sendITunesSearchRequest();
			return false;
		}
	});
				
	function sendITunesSearchRequest(){
		var searchValue = $('#iTunesSearchValue').val();
		console.log('search value: ' + searchValue);
		var searchValueEnc = encodeURIComponent(searchValue);
		console.log('search value encoded: ' + searchValueEnc);
		var url = 'https://itunes.apple.com/search?entity=podcast' + '&term=' + searchValueEnc +'&callback=showITunesSearchResults';
		var html = "<script src='" + url + "'><\/script>";
		console.log('html script is now: ' + html);
		$( "head" ).append(html);
	}

	$('#iTunesSearchButton').click(function(){
		(sendITunesSearchRequest());
	});
})

function showITunesSearchResults(arg){
	var results = arg.results;
	console.log('results: ' + arg.results);
	var html = '<ul>';
	html = '<li>First return placeholder<\/li>';
	for(var i=0; i<arg.resultCount; i++){
		html += '<li>' + results[i]['collectionName'] + '<\/li>';
	}
	html += '<\/ul>';
	$('#iTunesSearchResultsHtml').html(html);
}
