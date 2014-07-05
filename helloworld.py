from google.appengine.api import users
from google.appengine.ext import ndb
import cgi
import webapp2
import urllib

FORM_HTML = """\
podcast feed
<form action="/sign?%s" method="post">
    <div><textarea name='content' rows="1" columns="60"></textarea></div>
    <div><input type="submit" value = "Sign Guestbook"></div>
</form>
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
        self.response.headers['Content-Type'] = 'text/html'
        self.response.write('<html><body><head>')
        self.response.write('<link rel="stylesheet" href="https://dl.dropboxusercontent.com/u/4597121/podcatchor/styles/podK.css">')
        self.response.write('</head>')

        podcast_feed_list = self.request.get('podcast_feed', DEFAULT_PODCAST_FEED_LIST)
        podcast_feed_query = PodcastFeed.query(
            ancestor = podcast_feed_key(podcast_feed_list)).order(-PodcastFeed.date)
        podcast_feeds = podcast_feed_query.fetch(10)
        
        for feed in podcast_feeds:
            self.response.write('%s added %s<br>' %(feed.content, feed.date))

        self.response.write('<h1><a href="http://kball-test-tools.appspot.com/second">Second page</a></h1>')
        self.response.write(FORM_HTML)
        self.response.write('</body></html>')

class Podcasts(webapp2.RequestHandler):
    def post(self):
        podcast_feed_list = self.request.get('podcast_feed_list', DEFAULT_PODCAST_FEED_LIST)
        podcast_feed = PodcastFeed(parent=podcast_feed_key(podcast_feed_list))
        podcast_feed.content = self.request.get('content')
        podcast_feed.put()

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
        self.response.write('<link rel="stylesheet" href="https://dl.dropboxusercontent.com/u/4597121/podcatchor/styles/podK.css">')
        self.response.write('</head>')
        if user:
            self.response.write('<h1>Hello, %s, you are logged in!A</h1>' % user.nickname())
            # self.response.write('Hello, %s (<a href="%s">Sign out</a>)' % (user.nickname(), users.create_logout_url('/'))
        else:
            self.redirect(users.create_login_url(self.request.uri))
            # self.response.write('You are not logged in <a href="%s">Click here to login</a>' % users.create_login_url(self.request.uri)
        self.response.write('<a href="http://kball-test-tools.appspot.com/">Main page</a><br>')
        self.response.write("<audio controls><source src='http://www.podtrac.com/pts/redirect.mp3/twit.cachefly.net/audio/sn/sn0461/sn0461.mp3'></audio>")
        self.response.write('</body></html>')

app = webapp2.WSGIApplication([
    ('/', MainPage),
    ('/sign', Guestbook),
    ('/second', SecondPage),
], debug=True)