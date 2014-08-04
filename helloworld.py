from google.appengine.api import users
from google.appengine.ext import ndb
import webapp2
import urllib
import urllib2
import xml.etree.ElementTree as ET
import json
import os
import jinja2

# TO DO:
# Redo buttons so jQuery adds an event listener.
# Add keyboard shortcuts for controlling player. Probably need to add a click event to the body or html entity.
# then all episode information for each show could be in 1 entity
# Ask huber if how I"m handling controls is proper. Seems odd to have urls as 'controls', i.e. to remove feeds.
# Put an are you sure / undo / store removed shows somewhere / maybe even a remove forever button once it's on the removed list.
# Create a current playing object. I'll write that to datastore often, but only update the episode object every so often.

# Additional features
# After hitting stop, it turns into an undo button... for a while.
# 


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

JINJA_ENVIRONMENT = jinja2.Environment(
    loader = jinja2.FileSystemLoader(os.path.dirname(__file__)),
    extensions = ['jinja2.ext.autoescape'],
    autoescape = True)

DEFAULT_PODCAST_FEED_LIST = 'default_podcast_feed_list'
# http://feeds.twit.tv/sn.xml

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

        #Have user log in and show their current subscriptions.

##        if user:
##            self.response.write('Welcome %s! (<a href="%s">Logout</a>) <br>' % (user.nickname(), users.create_logout_url(self.request.uri)))
##        else:
##            self.response.write('<a href="%s">Sign In</a> with your Google account<br>' % users.create_login_url(self.request.uri))

        podcast_feed_list = self.request.get('podcast_feed', DEFAULT_PODCAST_FEED_LIST)

        podcast_feed_query = Podcast.query(ancestor = podcast_feed_key(podcast_feed_list)).order(-Podcast.date)
        podcast_feeds = podcast_feed_query.fetch(10)

##        for feed in podcast_feeds:
##            self.response.write('<form action="/rempodcast" method="post"> %s <input type="hidden" name="delRecord" value="%s"><input type="submit" \
##            value="x" data-inline="true"></form>' % (feed.feedUrl, feed.key.id()))
##            self.response.write('<form action="/refreshfeed" method="post"><input type="hidden" name="refreshFeed" value="%s"><input type="submit" \
##            value="&#8635" data-inline="true"></form>' % feed.feedUrl)
##            self.response.write('<div class="podcastFeedList"><ul>')


## Write Page
        template_values = {
            'podcast_feeds': podcast_feeds,
        }
        template = JINJA_ENVIRONMENT.get_template('index.html')
        self.response.write(template.render(template_values))

class AddPodcast(webapp2.RequestHandler):
    def post(self):
        podcast_feed_list = self.request.get('podcast_feed_list', DEFAULT_PODCAST_FEED_LIST)

        # Create the constructor
        podcast = Podcast(parent=podcast_feed_key(podcast_feed_list))

        # Add parameters
        if users.get_current_user():
            podcast.author = users.get_current_user()

        podcast.feedUrl = self.request.get('podcastSubscription')
        li = []
        for x in range(4):
            li.append(Episode(title='year %s' % x, listened=False))
			
        podcast.show = li

        # podcast.show = [Episode(title='year', listened=False), Episode(title='year 1', listened=False)]
        podcast.put()

        self.redirect('/')


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

app = webapp2.WSGIApplication([
    ('/', MainPage),
    ('/addpodcast', AddPodcast),
    ('/rempodcast', RemPodcast),
    ('/refreshfeed', RefreshFeed),
], debug=True)
