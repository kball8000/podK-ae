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

# Should probably add back in json dataType to ajax request, that's what I should be using.

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
		returnInfo = {}

		# Get podcast feed url
		podcast_json = self.request.body
		podcast_dict = json.loads(podcast_json)
		url = podcast_dict['podcastUrl']

		# Create the podcast constructor for datastore entity.
		podcast_feed_list = self.request.get('podcast_feed_list', DEFAULT_PODCAST_FEED_LIST)
		podcast = Podcast(parent=podcast_feed_key(podcast_feed_list))

		# Add a couple basic podcast parameters
		if users.get_current_user():
			podcast.author = users.get_current_user()
		podcast.feedUrl = url

		""" Get the rss feed and parse it to save information I want to keep."""
		# May want to do an if(getFeedInfo) and write something to the screen if it returns false.
		response = getFeedInfo(url)
		# parse xml response from rss feed URI
		root = ET.fromstring(response)

		podcast.title = root.find('channel').find('title').text

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
				
		returnInfo = { 'title' : 'myPodcastTitle', 'episodes': ['firstEp', 'secondEp'], }

		self.response.headers['Content-Type'] = 'application/json'
		self.response.out.write(json.dumps(returnInfo))

		# return True
		# self.redirect('/')

class RefreshFeed(webapp2.RequestHandler):
    def post(self):
		url = self.request.get('refreshFeed')
		feed_info = getFeedInfo(url)
		
		# Need to do something with feed_info, unless I just want to do a full page refresh.
		# If I want to do ajax, may need jQuery
		
		self.redirect('/')

class RemPodcast(webapp2.RequestHandler):
    def post(self):
		
		""" Get id from post request and delete that show from list. """
		# Should use key to delete instead of retrieving entire entity.
		# http://stackoverflow.com/questions/22052013/how-to-use-ajax-with-google-app-engine-python 

		logging.info('podcast url body in remove = %s' %self.request.body)
		feed_id = self.request.get('podcast')

		qry = Podcast.query(Podcast.feedUrl == feed_id)
		result = qry.fetch(1)

		result[0].key.delete()
				
		# self.redirect('/')

app = webapp2.WSGIApplication([
	('/', MainPage),
	('/addpodcast', AddPodcast),
	('/removepodcast', RemPodcast),
	('/refreshfeed', RefreshFeed),
], debug=True)
