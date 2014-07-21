// <html>
//	<head>
//  </head>
//	<body>
//         <input name="iTunesSearchValue" id="iTunesSearchValue" type="text" placeholder="Search iTunes Store"/>
//         <button id="iTunesSearchButton" name="iTunesSearchButton" onclick="sendITunesSearchRequest();">Go</button>
//         <div id="searchResultsHtml"></div>
// </body>
// <script>
		
var searchListener = document.getElementById('iTunesSearchValue');
searchListener.addEventListener("onkeypress", checkEnterKeyPress);

function checkEnterKeyPress(e){
	var key = e.which;
	if(key == 13){
		sendITunesSearchRequest();
		return false;
	}
}

function sendITunesSearchRequest(){
	var searchValue = document.getElementById('iTunesSearchValue').value;
	var newElem = document.createElement('script');
	var headId = document.getElementsByTagName('head')[0];
	var searchValueEnc = encodeURIComponent(searchValue);
	var url = 'https://itunes.apple.com/search?entity=podcast' + '&term=' + searchValueEnc +'&callback=showITunesSearchResults';

	newElem.src = url;
	console.log('url = ' + url);
	headId.appendChild(newElem);
}			

function showITunesSearchResults(arg){
	var results = arg.results;
	var resultsDiv = document.getElementById('searchResultsHtml');
	var html = '<ul>';
	html = '<li>First return placeholder<\/li>';
	for(var i=0; i<arg.resultCount; i++){
		html += '<li>' + results[i]['collectionName'] + '<\/li>';
	}
	html += '<\/ul>';
	resultsDiv.innerHTML = html;
}

// </script>
// </html>
