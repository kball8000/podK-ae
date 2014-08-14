from google.appengine.api import users
from google.appengine.ext import ndb
import webapp2
import urllib
import urllib2
import xml.etree.ElementTree as ET
import json
import os
import jinja2
import logging

# Working on refresh function and refresh class. Want function so that I can call it from multiple classes.

JINJA_ENVIRONMENT = jinja2.Environment(
    loader = jinja2.FileSystemLoader(os.path.dirname(__file__)),
    extensions = ['jinja2.ext.autoescape'],
    autoescape = True)

DEFAULT_PODCAST_FEED_LIST = 'default_podcast_feed_list'
# http://feeds.twit.tv/sn.xml

def podcast_feed_key(podcast_feed=DEFAULT_PODCAST_FEED_LIST):
    return ndb.Key('podcast_feed', podcast_feed)

class Episode(ndb.Model):
	# ADD: save in datastore or link to image url
	episode_title = ndb.StringProperty(indexed=False)
	episode_url = ndb.StringProperty(indexed=False)
	listened = ndb.BooleanProperty()
	pubDate = ndb.StringProperty(indexed=False)
	dateAdded = ndb.DateTimeProperty(auto_now_add=True) # date added
	episodeLength = ndb.StringProperty(indexed=False) # string format, not date
	playbackPosition = ndb.IntegerProperty() # in milliseconds

class Podcast(ndb.Model):
	author = ndb.UserProperty()
	title = ndb.StringProperty(indexed=False)
	feedUrl = ndb.StringProperty()
	show = ndb.StructuredProperty(Episode, repeated=True)
	date = ndb.DateTimeProperty(auto_now_add=True)

class MainPage(webapp2.RequestHandler):
    def get(self):
		user = users.get_current_user()

		# Have user log in and show their current subscriptions.
		if user:
			user_welcome_nickname = user.nickname()
			user_welcome_href = users.create_logout_url('/')
			
		else:
			user_welcome_nickname = None
			user_welcome_href = users.create_login_url(self.request.uri)
				
		podcast_feed_list = self.request.get('podcast_feed', DEFAULT_PODCAST_FEED_LIST)
		podcast_feed_query = Podcast.query(ancestor = podcast_feed_key(podcast_feed_list)).order(-Podcast.date)
		podcast_feeds = podcast_feed_query.fetch(10)
		
		template_values = {
			'podcast_feeds': podcast_feeds,
			'user_welcome_nickname': user_welcome_nickname,
			'user_welcome_href': user_welcome_href
		}
		template = JINJA_ENVIRONMENT.get_template('index.html')
		self.response.write(template.render(template_values))

def getFeedInfo(url):

	request = urllib2.Request(url)
	try:
		response = urllib2.urlopen(request).read()
	except urllib2.URLError, e:
		return False
	
	return response

class AddPodcast(webapp2.RequestHandler):
	def post(self):
		episode_list = []
		
		# Create the constructor
		podcast_feed_list = self.request.get('podcast_feed_list', DEFAULT_PODCAST_FEED_LIST)
		podcast = Podcast(parent=podcast_feed_key(podcast_feed_list))

		# Add parameters
		if users.get_current_user():
			podcast.author = users.get_current_user()

		url = self.request.get('podcastSubscription')
		
		# May want to do an if(getFeedInfo) and write something to the screen if it returns false.
		response = getFeedInfo(url)
		
		# parse xml response from rss feed URI
		root = ET.fromstring(response)

		podcast.title = root.find('channel').find('title').text
		podcast.feedUrl = url

		for item in root.find('channel').findall('item'):
			episode_list.append(Episode( episode_title = item.find('title').text,
										episode_url = item.find('link').text,
										listened = False,
										pubDate = item.find('pubDate').text,
		# I'm able to hardcode in the namespace for itunes:, using xmlns:media, not sure how I'd do that programmatically
		#								episodeLength = item.find('{http://search.yahoo.com/mrss/}duration').text,
										playbackPosition = 0))

		podcast.show = episode_list
			
		podcast.put()

		self.redirect('/')

class RefreshFeed(webapp2.RequestHandler):
    def post(self):
		url = self.request.get('refreshFeed')
		feed_info = getFeedInfo(url)
		
		# Need to do something with feed_info, unless I just want to do a full page refresh.
		# If I want to do ajax, may need jQuery
		
		self.redirect('/')

class RemPodcast(webapp2.RequestHandler):
    def post(self):
		
		# Get id from post request and delete that show from list.
		# Also double checks with user,  by way of javascript that they really want to do this.
		# Should use key to delete instead of retrieving entire entity.
		# http://stackoverflow.com/questions/22052013/how-to-use-ajax-with-google-app-engine-python 
		
		logging.info('self - request - body: %s' % self.request.body )
		# feed_id = self.request.get('delRecord')
		data = json.loads(self.request.body)
		feed_id = data['podcast']

		qry = Podcast.query(Podcast.feedUrl == feed_id)
		result = qry.fetch(1)
		# self.response.write('<html><body>')
		# self.response.write('feed_id = <b>%s</b>' % feed_id)
		# self.response.write('<br>qry = <b>%s</b>' % qry)
		# self.response.write('<br>result = <b>%s</b>' % result)
		# self.response.write('</body></html>')
		
		# logging.info('result = adklfjasjflkajfldkajf;ajd;adfj')

		result[0].key.delete()
		
		# podcast_feed = ndb.Key(Podcast, parent=ndb.Key('podcast_feed', 'default_podcast_feed_list'))
		# podcast_feed.delete()
		
		self.redirect('/')

app = webapp2.WSGIApplication([
	('/', MainPage),
	('/addpodcast', AddPodcast),
	('/removepodcast', RemPodcast),
	('/refreshfeed', RefreshFeed),
], debug=True)
