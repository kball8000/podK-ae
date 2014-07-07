from google.appengine.api import users
from google.appengine.ext import ndb
import webapp2
import urllib
# import cgi

FORM_HTML = """\
podcast feed
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
        <audio controls id='myMusic1'>
            <source src='http://www.podtrac.com/pts/redirect.mp3/twit.cachefly.net/audio/sn/sn0461/sn0461.mp3'>
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

        if not user:
            self.response.write('<a href="%s">Sign In<br></a>' % users.create_login_url(self.request.uri))
        else:
            self.response.write('Welcome %s!<br>' % user.nickname())
            self.response.write('Welcome %s!<br>' % user.user_id())
            self.response.write('Welcome %s!<br>' % user.email())

        podcast_feed_list = self.request.get('podcast_feed', DEFAULT_PODCAST_FEED_LIST)

# Debug code
        self.response.write('podcast_feed_list = %s <br>' % podcast_feed_list)
        self.response.write('podcast_feed_key = %s <br>' % podcast_feed_key())

        podcast_feed_query = PodcastFeed.query(
            ancestor = podcast_feed_key(podcast_feed_list)).order(-PodcastFeed.date)
        podcast_feeds = podcast_feed_query.fetch(10)
        self.response.write('<br><br>**Info from datastore:<br>')
        for feed in podcast_feeds:
            if feed.author:
                self.response.write('%s added ' %feed.author.nickname())
                self.response.write(', with a feed key id %s ' % feed.key.id())
                self.response.write(', the parent is %s ' % feed.key.parent())
                self.response.write(', and the kind is %s ' % feed.key.kind())
                self.response.write('... Now we are deleting this one<br> ')
                feed.key.delete()
                
            else:
                self.response.write('Annonymous added ')
            self.response.write('%s on %s <br>' %(feed.content, feed.date))
        self.response.write('**End info from datastore:<br><br>')

        # How to write to the javascript console log in the browser
        # self.response.write('<script>console.log("Logging is working: %s")</script>' % podcast_feed_list)

# For revving so I know when I"ve got a new page
        self.response.write('<h1>HeaderC</h1>')
        self.response.write('<h2><a href="http://kball-test-tools.appspot.com/second">Second page</a></h2>')
        self.response.write('http://feeds.twit.tv/twit.xml<br>')
        self.response.write('http://feeds.twit.tv/sn.xml<br>')
        self.response.write(FORM_HTML)
        self.response.write('</body></html>')

class Podcasts(webapp2.RequestHandler):
    def post(self):
        podcast_feed_list = self.request.get('podcast_feed_list', DEFAULT_PODCAST_FEED_LIST)

        # Create the constructor
        podcast_feed = PodcastFeed(parent=podcast_feed_key(podcast_feed_list))

        # Add parameters
        if users.get_current_user():
            podcast_feed.author = users.get_current_user()
            
        podcast_feed.content = self.request.get('formContent')

# Debubbing code
        self.response.write('<html><body>You wrote<pre>')
        self.response.write('<a href="http://kball-test-tools.appspot.com/">Main page</a><br><br>')
        self.response.write('podcast feed content = %s <br>' % podcast_feed.content)
        self.response.write('podcast feed date = %s <br>' % podcast_feed.date)
        self.response.write('podcast feed author = %s <br>' % podcast_feed.author)
        self.response.write('podcast feed = %s <br>' % podcast_feed)
        self.response.write('podcast feed list = %s <br>' % podcast_feed_list)
        self.response.write('</pre></body></html>')

        podcast_feed.put()

        query_params = {'podcast_feed_list' : podcast_feed_list}
        self.redirect('/?' + urllib.urlencode(query_params))

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
        self.response.write(MUSIC_CONTROLS_HTML)
        self.response.write('<script src="/scripts/podK.js"></script>')
        self.response.write('</body></html>')

app = webapp2.WSGIApplication([
    ('/', MainPage),
    ('/addpodcast', Podcasts),
    # ('/sign', Guestbook),
    ('/second', SecondPage),
], debug=True)