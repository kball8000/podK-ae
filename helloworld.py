from google.appengine.api import users
from google.appengine.ext import ndb
import webapp2
import urllib
import urllib2
import xml.etree.ElementTree as ET
import json
# import html
# import cgi

# TO DO:
# Redo buttons so jQuery adds an event listener.
# Would like to make less queries, so all podcast feeds should be in a list
# Add keyboard shortcuts for controlling player. Probably need to add a click event to the body or html entity.
# then all episode information for each show could be in 1 entity
# Ask huber if how I"m handling controls is proper. Seems odd to have urls as 'controls', i.e. to remove feeds.
# Put an are you sure / undo / store removed shows somewhere / maybe even a remove forever button once it's on the removed list.
# Create a current playing object. I'll write that to datastore often, but only update the episode object every so often.
# Keeps adding add podcast after I submit. Refreshes to just one on page reload

# Additional features
# After hitting stop, it turns into an undo button... for a while.


# **-- Need to store:  --**
# 
# podcast rss feeds in array (i'm not clear why i'm storing them separately, will probably move to show object
#   (maybe there will be a speed advantage, but at the moment, I can't think of one.)
# 
# object of each show including (on average probably 5 - 10 of these) - This is what we will store in datastore
#   rss feed
#   show name
#   show hosts???
#   episode object (1 - 100)
#     episode name
#     episode url
#     listened boolean
#     last listened location
#     episode length???

FORM_HTML = """\
<form action="/addpodcast" method="post">
    <div><input type='text' name='formContent' style='width:50em'></input></div>
    <div><input type="submit" value = "Add podcast"></div>
</form>
<div id='searchResultHtml'></div>
"""

# In order to use guestbook example, this is a cross reference list
# Greeting          = PodcastFeed
# guestbook_name    = podcast_feed_list = default_podcast_feed_list
# 'Guestbook'       = 'podcast_feed_list' for nbd
# greetings         = podcast_feeds
# greeting          = podcast_feed

MUSIC_CONTROLS_HTML = """\
    <div>
        <audio controls id='%s'>
            <source src='%s'>
        </audio>
    </div>
    <div>
     	<button class="ui-btn ui-btn-inline" onclick="myAudio.playAudio();">&#9654 / &#8214 A</button>
    	<button class="ui-btn ui-btn-inline" onclick="myAudio.stopAudio();">&#11035</button>
    	<button class="ui-btn ui-btn-inline" onclick="myAudio.displayTime();">Get Time</button>
    	<button class="ui-btn ui-btn-inline" onclick="myAudio.rewind();"><</button>
    	<button class="ui-btn ui-btn-inline" onclick="myAudio.fastForward();">></button>
    	<button class="ui-btn ui-btn-inline" onclick='myAudio.toggleSound()' id='speakerIcon'>&#128266</button>
    </div>
    <div>
    	Current time is <span id='currentGibTime' style='height:2em;'></span><br>
    	Total time is <span id='durationGibTIme' style='height:2em;'></span><br>
    </div>
"""

DEFAULT_PODCAST_FEED_LIST = 'default_podcast_feed_list'
# http://feeds.twit.tv/twit.xml
# http://feeds.twit.tv/sn.xml
# http://feeds.twit.tv/hn.xml

def podcast_feed_key(podcast_feed=DEFAULT_PODCAST_FEED_LIST):
    return ndb.Key('podcast_feed', podcast_feed)

class Episode(ndb.Model):
    title = ndb.StringProperty()
    listened = ndb.BooleanProperty()
    episodeLength = ndb.IntegerProperty() # in milliseconds
    playbackPosition = ndb.IntegerProperty() # in milliseconds

class Podcast(ndb.Model):
    author = ndb.UserProperty()
    title = ndb.StringProperty(indexed=False)
    feedUrl = ndb.StringProperty(indexed=False)
    show = ndb.StructuredProperty(Episode, repeated=True)
    date = ndb.DateTimeProperty(auto_now_add=True)

class MainPage(webapp2.RequestHandler):
    def get(self):
        
        user = users.get_current_user()

        self.response.headers['Content-Type'] = 'text/html'
        self.response.write('<html><body><head>')

        # HTML header 
        self.response.write('<link rel="stylesheet" href="//ajax.googleapis.com/ajax/libs/jquerymobile/1.4.3/jquery.mobile.min.css" />')
        self.response.write('<script src="//ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js"></script>')
        self.response.write('<script src="//ajax.googleapis.com/ajax/libs/jquerymobile/1.4.3/jquery.mobile.min.js"></script>')
        self.response.write('<link type="text/css" rel="stylesheet" href="/stylesheets/helloworld.css">')
        self.response.write('<script src="/scripts/podKTop.js"></script>')
        self.response.write('</head>')

        # Heading 1
        self.response.write('<h1>PodKatchor</h1>')
        self.response.write('<h2>Pretty much the best online podcast player **** <b>B</b> **** </h2>')

        #Have user log in and show their current subscriptions.
        if user:
            self.response.write('Welcome %s! (<a href="%s">Logout</a>) <br>' % (user.nickname(), users.create_logout_url(self.request.uri)))
        else:
            self.response.write('<a href="%s">Sign In</a> with your Google account<br>' % users.create_login_url(self.request.uri))

        podcast_feed_list = self.request.get('podcast_feed', DEFAULT_PODCAST_FEED_LIST)
        
        podcast_feed_query = Podcast.query(ancestor = podcast_feed_key(podcast_feed_list)).order(-Podcast.date)
        podcast_feeds = podcast_feed_query.fetch(10)

        self.response.write('<br><a href="/testpagelink">Run test link page</a><br>')
        self.response.write('<br><a href="/second">Go to page to for testing datastore</a><br>')

        self.response.write('<br><br>**Current saved feeds from datastore:<br>')
        shows = xrange(3)

        playerName = 'myMusic1'
        defaultEp = 'http://www.podtrac.com/pts/redirect.mp3/twit.cachefly.net/audio/sn/sn0462/sn0462.mp3'
        selectedEp = 'http://www.podtrac.com/pts/redirect.mp3/twit.cachefly.net/audio/twig/twig0257/twig0257.mp3'

        for feed in podcast_feeds:
            self.response.write('<form action="/rempodcast" method="post"> %s <input type="hidden" name="delRecord" value="%s"><input type="submit" \
            value="x" data-inline="true"></form>' % (feed.feedUrl, feed.key.id()))
            self.response.write('<form action="/refreshfeed" method="post"><input type="hidden" name="refreshFeed" value="%s"><input type="submit" \
            value="&#8635" data-inline="true"></form>' % feed.feedUrl)
            self.response.write('<div class="podcastFeedList"><ul>')
            for show in shows:
                self.response.write("""<li>Episode %s <a onclick="myAudio.playSelectedEpisode('%s')" class="playButton">&#9658</a> \
                </li>""" % (feed.title, selectedEp))
            self.response.write('</ul></div>')
            
        # Music player, move player vars down once I have above feed for loop not requiring it.
        self.response.write(MUSIC_CONTROLS_HTML % (playerName, defaultEp))

        # Search iTunes for podcast
        self.response.write('<input id="iTunesSearchValue" type="text" placeholder="Search iTunes Store" data-inline="true"/>')
        self.response.write('<button id="iTunesSearchButton" data-inline="true">Go</button>')
        self.response.write('<div id="iTunesSearchResultsHtml"></div>')
        # self.response.write('<form method="post" action="/searchITunes"><input type="text" name="searchITunes"><input type="submit" value="Search"></form>')
        # self.response.write('<form method="get" name="itunesSearchForm" action="#"><input type="text" name="iTunesSearchValue"><input type="submit" onclick="sendITunesSearchRequest()" value="Search"></form>')

        # How to write to the javascript console log in the browser
        # self.response.write('<script>console.log("Logging is working: %s")</script>' % podcast_feed_list)

        self.response.write('http://feeds.twit.tv/sn.xml ep 456 at 12 min<br>')
        self.response.write('Swap out the "sn" with "twig" / "twit" / "mbw" or any other twit show to try out other feeds<br>')
        self.response.write(FORM_HTML)
        self.response.write('<script src="/scripts/podK.js"></script>')
        self.response.write('</body></html>')

class TestPageLink(webapp2.RequestHandler):
    def get(self):
        podcast_feed_list = self.request.get('podcast_feed', DEFAULT_PODCAST_FEED_LIST)
        podcast_feed_query = Podcast.query(ancestor = podcast_feed_key(podcast_feed_list)).order(-Podcast.date)
        podcast_feeds = podcast_feed_query.fetch(10)

        # shows = xrange(3)

        selectedEp = 'http://www.podtrac.com/pts/redirect.mp3/twit.cachefly.net/audio/twig/twig0257/twig0257.mp3'

        for feed in podcast_feeds:
            feed.title = 'junk'
            feed.show.listened = True
            feed.show.episodeLength = 134
            feed.put()
        
        self.redirect('/')

class AddPodcast(webapp2.RequestHandler):
    def post(self):
        podcast_feed_list = self.request.get('podcast_feed_list', DEFAULT_PODCAST_FEED_LIST)

        # Create the constructor
        podcast = Podcast(parent=podcast_feed_key(podcast_feed_list))

        # Add parameters
        if users.get_current_user():
            podcast.author = users.get_current_user()
            
        podcast.feedUrl = self.request.get('formContent')
        # showsLi = []
        # for x in range(3):
        #     showsLi.append(Episode(title='year %s', listened=False) % x)
        #     self.response.write('%s' % li)
            
        # podcast.show = showsLi

        podcast.show = [Episode(title='year', listened=False), Episode(title='year 1', listened=False)]
        podcast.put()

        # self.redirect('/')

        return self.redirect('/')

class SearchITunes(webapp2.RequestHandler):
    def post(self):

        searchRequest = self.request.get('searchITunes')
        url = 'https://itunes.apple.com/search'
        queryArgs = {'term':searchRequest, 'media':'podcast', 'limit':10}
        queryArgsEnc = urllib.urlencode(queryArgs)
        request = urllib2.Request(url, queryArgsEnc)
        response = urllib2.urlopen(request)
        data = json.loads(response.read())
        for i in xrange(data['resultCount']):
            self.response.write('<br>artist name: %s, collection name: %s' % (data['results'][i]['artistName'], data['results'][i]['collectionName']))
            self.response.write('<form action="/addpodcast" method="post"><input type="submit" value="add" name = "%s"></form>' % data['results'][i]['collectionName']) 

        self.response.headers['Content-Type'] = 'text/html'
        self.response.write('<html><body><head>')
        self.response.write('<link type="text/css" rel="stylesheet" href="/stylesheets/helloworld.css">')
        self.response.write('</head>')
        self.response.write('Search Request: %s<br>' % searchRequest)
        self.response.write('url: %s<br>' % url)
        self.response.write('queryArgs: %s<br>' % searchRequestEnc)
        self.response.write('Results:<br>')
        # self.response.write(readResponse['results'][0]['artistName'])
        self.response.write(readResponse['results'])
        self.response.write('<br><br>Results:<br>')
        self.response.write(readResponse)

        self.response.write('</body></html>')

class RefreshFeed(webapp2.RequestHandler):
    def post(self):
        
        self.response.headers['Content-Type'] = 'text/html'
        self.response.write('<html><body><head>')
        self.response.write('<link type="text/css" rel="stylesheet" href="/stylesheets/helloworld.css">')
        self.response.write('</head>')

        url = self.request.get('refreshFeed')
        request = urllib2.Request(url)
        try:
            response = urllib2.urlopen(request).read()
        except urllib2.URLError, e:
            self.response.write('could not refresh feed')
            
        root = ET.fromstring(response)
        self.response.write('Show title: <h2>%s</h2><br><br>' %(root.find('channel').find('title').text))
        for item in root.find('channel').findall('item'):
            self.response.write('Episode title: <h3>%s</h3>, published on: %s<br>' %(item.find('title').text, item.find('pubDate').text))

        self.response.write('</body></html>')

        # self.redirect('/')

class RemPodcast(webapp2.RequestHandler):
    def post(self):
        
        # Get id from post request and delete that show from list. 
        # Also double checks with user,  by way of javascript that they really want to do this.
    
        feed_id = self.request.get('delRecord')
        
        podcast_feed = ndb.Key(Podcast, int(feed_id), parent=ndb.Key('podcast_feed', 'default_podcast_feed_list'))
        podcast_feed.delete()
        
        self.redirect('/')
        
class SecondPage(webapp2.RequestHandler):
    def get(self):
        
        # user = users.get_current_user()

        self.response.headers['Content-Type'] = 'text/html'
        self.response.write('<html><body><head>')
        self.response.write('<link type="text/css" rel="stylesheet" href="/stylesheets/helloworld.css">')
        # self.response.write('<link rel="stylesheet" href="https://dl.dropboxusercontent.com/u/4597121/podcatchor/styles/podK.css">')
        self.response.write('</head>')
        self.response.write('<a href="http://kball-test-tools.appspot.com/">Main page</a><br><br>')


# def podcast_feed_key(podcast_feed=DEFAULT_PODCAST_FEED_LIST):
#     return ndb.Key('podcast_feed', podcast_feed)

        # podcast_feed_list = self.request.get('podcast_feed', DEFAULT_PODCAST_FEED_LIST)
        podcast_feed_list = 'default_podcast_feed_list'
        self.response.write('podcast feed list var = %s <br><br>' % podcast_feed_list)
        # podcast_feed_list = {'podcastA', 'podcastVar'}
 
        # podcast_feed_query = Podcast.query(ancestor = podcast_feed_key(podcast_feed_list)).order(-Podcast.date)
        podcast_feed_query = Podcast.query(ancestor = ndb.Key('podcast_feed', podcast_feed_list)).order(-Podcast.date)
        # podcast_feed_query = Podcast.query()
        podcast_feeds = podcast_feed_query.fetch()

        self.response.write('<br><br>**Current saved feeds from datastore *** A *** :<br>')
        # shows = xrange(3)

        for feed in podcast_feeds:
            self.response.write('feed url: %s and feed id: %s and number of items = <b>%s</b><br>' % (feed.feedUrl, feed.key.id(), len(podcast_feeds)))
            for show in feed.show:
                self.response.write('show: %s, title <b>%s</b> and number of episodes = %s <br>' % (show.listened, show.title, len(feed.show)))
            # self.response.write('show listened: %s <br>' % (feed.show.listened))

        # if user:
        #     self.response.write('<h1>Hello, %s, you are logged in!B</h1>' % user.nickname())
        #     # self.response.write('Hello, %s (<a href="%s">Sign out</a>)' % (user.nickname(), users.create_logout_url('/'))
        # else:
        #     self.redirect(users.create_login_url(self.request.uri))
        #     # self.response.write('You are not logged in <a href="%s">Click here to login</a>' % users.create_login_url(self.request.uri)

        # x1 = 'myMusic1'
        # x2 = 'http://www.podtrac.com/pts/redirect.mp3/twit.cachefly.net/audio/sn/sn0462/sn0462.mp3'
        # self.response.write(MUSIC_CONTROLS_HTML % (x1, x2))

        self.response.write('<script src="/scripts/podK.js"></script>')
        self.response.write('</body></html>')

app = webapp2.WSGIApplication([
    ('/', MainPage),
    ('/addpodcast', AddPodcast),
    ('/rempodcast', RemPodcast),
    ('/searchITunes', SearchITunes),
    # (r'/rempodcast/(\d+)', remPodcastFeed),
    ('/refreshfeed', RefreshFeed),
    ('/second', SecondPage),
    ('/testpagelink', TestPageLink),
], debug=True)