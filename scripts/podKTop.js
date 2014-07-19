function sendITunesSearchRequest(){
	var url = 'https://itunes.apple.com/search?entity=podcast';
	var a = document.getElementById('iTunesSearchForm');
	var b = document.forms['iTUnesSearchForm']['iTunesSearchValue'].value
	a.action = url + '&term=' + b +'&callback=showITunesSearchResults';
	a.submit();
}

function showITunesSearchResults(arg){
	var results = arg.results;
	var myDiv = document.getElementById('searchResultHtml');
	var myHtml = '<ul>';
	for(var i=0; i<arg.resultCount; i++){
		myHtml += '<li>' + results[i]['collectionName'] + '</li>';
	}
	myHtml += '</ul>'
	myDiv.innerHTML = myHtml;
}