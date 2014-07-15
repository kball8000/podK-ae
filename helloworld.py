from google.appengine.api import users
from google.appengine.ext import ndb
import webapp2
import urllib
import urllib2
import xml.etree.ElementTree as ET
# from xmldom import minidom
# import html
# import cgi

# TO DO:
# Ask what is going on with fancy redirects.
# Would like to make less queries, so all podcast feeds should be in a list
# After hitting stop, it turns into an undo button... for a while.
# Add keyboard shortcuts for controlling player. Probably need to add a click event to the body or html entity.
# then all episode information for each show could be in 1 entity
# Ask huber if how I"m handling controls is proper. Seems odd to have urls as 'controls', i.e. to remove feeds.
# Put an are you sure / undo / store removed shows somewhere / maybe even a remove forever button once it's on the removed list.

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
    	<button onclick='myAudio.playAudio()'>
    		Play / Pause
    	</button>
    	<button onclick='myAudio.stopAudio()'>
    		Stop
    	</button>
    	<button onclick='myAudio.displayTime()'>
    		Get Time
    	</button>
    	<button onclick='myAudio.rewind()'>
    		<
    	</button>
    	<button onclick='myAudio.fastForward()'>
    		>
    	</button>
    	<button onclick='myAudio.toggleSound()'>
        	<a id='speakerIcon'>&#128266</a>
    	</button>
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

class PodcastFeed(ndb.Model):
    author = ndb.UserProperty()
    content = ndb.StringProperty(indexed=False)
    date = ndb.DateTimeProperty(auto_now_add=True)

class MainPage(webapp2.RequestHandler):
    def get(self):
        
        user = users.get_current_user()

        self.response.headers['Content-Type'] = 'text/html'
        self.response.write('<html><body><head>')
        self.response.write('<link type="text/css" rel="stylesheet" href="/stylesheets/helloworld.css">')
        self.response.write('</head>')

        self.response.write('<h1>PodKatchor</h1>')
        self.response.write('<h2>Pretty much the best online podcast player</h2>')

        if user:
            self.response.write('Welcome %s! (<a href="%s">Logout</a>) <br>' % (user.nickname(), users.create_logout_url(self.request.uri)))
        else:
            self.response.write('<a href="%s">Sign In</a> with your Google account<br>' % users.create_login_url(self.request.uri))

        podcast_feed_list = self.request.get('podcast_feed', DEFAULT_PODCAST_FEED_LIST)
        
        podcast_feed_query = PodcastFeed.query(
            ancestor = podcast_feed_key(podcast_feed_list)).order(-PodcastFeed.date)
        podcast_feeds = podcast_feed_query.fetch(10)

        self.response.write('<br><br>**Current saved feeds from datastore:<br>')
        shows = xrange(3)

        playerName = 'myMusic1'
        defaultEp = 'http://www.podtrac.com/pts/redirect.mp3/twit.cachefly.net/audio/sn/sn0462/sn0462.mp3'
        selectedEp = 'http://www.podtrac.com/pts/redirect.mp3/twit.cachefly.net/audio/twig/twig0257/twig0257.mp3'

        for feed in podcast_feeds:
            self.response.write('<form action="/rempodcast" method="post"> %s <input type="hidden" name="delRecord" value="%s"><input type="submit" \
            value="x"></form>' % (feed.content, feed.key.id()))
            self.response.write('&nbsp&nbsp')
            self.response.write('<form action="/getfeed" method="post"><input type="hidden" name="getFeed" value="%s"><input type="submit" \
            value="&#8635"></form>' % feed.content)
            self.response.write('<div class="podcastFeedList"><ul>')
            for show in shows:
                self.response.write("""<li>Episode %s <a onclick="myAudio.playSelectedEpisode('%s')" class="playButton">&#9658</a> \
                </li>""" % (show, selectedEp))
            self.response.write('</ul></div>')
            
        self.response.write(MUSIC_CONTROLS_HTML % (playerName, defaultEp))

        self.response.write('<form method="post" action="/searchITunes"><input type="text" name="searchITunes"><input type="submit" value="Search"></form>')

        # How to write to the javascript console log in the browser
        # self.response.write('<script>console.log("Logging is working: %s")</script>' % podcast_feed_list)

# ****-----  For revving so I know when I"ve got a new page  ----****
        self.response.write('<h1>HeaderE</h1>')
        self.response.write('http://feeds.twit.tv/sn.xml ep 456 at 12 min<br>')
        self.response.write('Swap out the "sn" with "twig" / "twit" / "mbw" or any other twit show to try out other feeds<br>')
        self.response.write(FORM_HTML)
        self.response.write('<script src="/scripts/podK.js"></script>')
        self.response.write('</body></html>')

class AddPodcasts(webapp2.RequestHandler):
    def post(self):
        podcast_feed_list = self.request.get('podcast_feed_list', DEFAULT_PODCAST_FEED_LIST)

        # Create the constructor
        podcast_feed = PodcastFeed(parent=podcast_feed_key(podcast_feed_list))

        # Add parameters
        if users.get_current_user():
            podcast_feed.author = users.get_current_user()
            
        podcast_feed.content = self.request.get('formContent')

        podcast_feed.put()

        self.redirect('/')

class SearchITunes(webapp2.RequestHandler):
    def post(self):

        searchRequest = self.request.get('searchITunes')
        url = 'https://itunes.apple.com/search'
        queryArgs = {'term':searchRequest, 'media':'podcast', 'limit':10}
        searchRequestEnc = urllib.urlencode(queryArgs)
        request = urllib2.Request(url, searchRequestEnc)
        response = urllib2.urlopen(request)
        readResponse = response.read()

        self.response.headers['Content-Type'] = 'text/html'
        self.response.write('<html><body><head>')
        self.response.write('<link type="text/css" rel="stylesheet" href="/stylesheets/helloworld.css">')
        self.response.write('</head>')
        self.response.write('Search Request: %s<br>' % searchRequest)
        self.response.write('url: %s<br>' % url)
        self.response.write('queryArgs: %s<br>' % searchRequestEnc)
        self.response.write('Results:<br>')
        self.response.write(readResponse['artistName'])

        self.response.write('<br><br>Results:<br>')
        self.response.write(readResponse)

        self.response.write('</body></html>')

class GetFeed(webapp2.RequestHandler):
    def post(self):
        
        self.response.headers['Content-Type'] = 'text/html'
        self.response.write('<html><body><head>')
        self.response.write('<link type="text/css" rel="stylesheet" href="/stylesheets/helloworld.css">')
        self.response.write('</head>')

        url = self.request.get('getFeed')
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

class RemPodcastFeed(webapp2.RequestHandler):
    def post(self):
        
        # Get id from post request and delete that show from list. 
        # Also double checks with user,  by way of javascript that they really want to do this.
    
        feed_id = self.request.get('delRecord')
        
        podcast_feed = ndb.Key(PodcastFeed, int(feed_id), parent=ndb.Key('podcast_feed', 'default_podcast_feed_list'))
        podcast_feed.delete()
        
        self.redirect('/')
        
class Guestbook(webapp2.RequestHandler):
    def post(self):
        self.response.write('<html><body>You wrote<pre>')
        self.response.write(cgi.escape(self.request.get('content')))
        self.response.write('</pre></body></html>')

class SecondPage(webapp2.RequestHandler):
    def get(self):
        
        user = users.get_current_user()

        self.response.headers['Content-Type'] = 'text/html'
        self.response.write('<html><body><head>')
        self.response.write('<link type="text/css" rel="stylesheet" href="/stylesheets/helloworld.css">')
        # self.response.write('<link rel="stylesheet" href="https://dl.dropboxusercontent.com/u/4597121/podcatchor/styles/podK.css">')
        self.response.write('</head>')

        if user:
            self.response.write('<h1>Hello, %s, you are logged in!B</h1>' % user.nickname())
            # self.response.write('Hello, %s (<a href="%s">Sign out</a>)' % (user.nickname(), users.create_logout_url('/'))
        else:
            self.redirect(users.create_login_url(self.request.uri))
            # self.response.write('You are not logged in <a href="%s">Click here to login</a>' % users.create_login_url(self.request.uri)

        self.response.write('<a href="http://kball-test-tools.appspot.com/">Main page</a><br><br>')
        
        x1 = 'myMusic1'
        x2 = 'http://www.podtrac.com/pts/redirect.mp3/twit.cachefly.net/audio/sn/sn0461/sn0461.mp3'

        self.response.write(MUSIC_CONTROLS_HTML % (x1, x2))
        self.response.write('<script src="/scripts/podK.js"></script>')
        self.response.write('</body></html>')

app = webapp2.WSGIApplication([
    (r'/', MainPage),
    (r'/addpodcast', AddPodcasts),
    ('/rempodcast', RemPodcastFeed),
    ('/searchITunes', SearchITunes),
    # (r'/rempodcast/(\d+)', remPodcastFeed),
    ('/getfeed', GetFeed),
    # ('/sign', Guestbook),
    ('/second', SecondPage),
], debug=True)