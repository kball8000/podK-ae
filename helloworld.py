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
	# loader = jinja2.FileSystemLoader(os.path.dirname(__file__)),
	loader = jinja2.FileSystemLoader(os.path.join(os.path.dirname(__file__), 'templates')),
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
	imageUrl = ndb.StringProperty(indexed=False)
	show = ndb.StructuredProperty(Episode, repeated=True)
	date = ndb.DateTimeProperty(auto_now_add=True)

class EpisodeSubscription:
	# This will get returned to ajax request to website as opposed to datatore for reg Podcast class.
	def __init__(self, title, url):
		self.title = title
		self.url = url
		# listened = False
		# percent listened = 0

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

		podcast_feed_query = Podcast.query(ancestor = podcast_feed_key()).order(-Podcast.date)
		podcast_feeds = podcast_feed_query.fetch(10)
		
		template_values = {
			'navClass': {'home': 'ui-btn-active ui-state-persist' },
			'dataUrl': '/',
			'pageTitle': 'Home',
			'podcast_feeds': podcast_feeds,
			'user_welcome_nickname': user_welcome_nickname,
			'user_welcome_href': user_welcome_href
		}
		template = JINJA_ENVIRONMENT.get_template('index.html')
		self.response.write(template.render(template_values))

class PlaylistPage(webapp2.RequestHandler):
	def get(self):
		
		dsRequest = Podcast.query(ancestor=podcast_feed_key('DEFAULT_PODCAST_LIST')).order(-Podcast.date)
		dsResults = dsRequest.fetch(10)
		
		playlist = [{'title': 'SN 469: Big Routing Tables', 'url': 'http://www.podtrac.com/pts/redirect.mp3/twit.cachefly.net/audio/sn/sn0469/sn0469.mp3' },
					{'title': "SN 468: Your Questions, Steve's Answers 194", 'url': 'http://www.podtrac.com/pts/redirect.mp3/twit.cachefly.net/audio/sn/sn0468/sn0468.mp3' }
				   ]

		template_values = {
			'navClass': {'playlist': 'ui-btn-active ui-state-persist' },
			'pageTitle': 'Playlist',
			'dataUrl': '/playlist',
			'playlist': playlist
		}
		template = JINJA_ENVIRONMENT.get_template('playlist.html')
		self.response.write(template.render(template_values))

class SearchPage(webapp2.RequestHandler):
	def get(self):

		template_values = {
			'navClass': {'search': 'ui-btn-active ui-state-persist' },
			'pageTitle': 'Search',
			'dataUrl': '/search'
		}
		# template = JINJA_ENVIRONMENT.get_template('/templates/search.html')
		template = JINJA_ENVIRONMENT.get_template('search.html')
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
		episode_list_return = []
		episode = {}
		returnInfo = {}

		# Get podcast feed url
		podcast_json = self.request.body
		podcast_dict = json.loads(podcast_json)
		url = podcast_dict['url']

		# Create the podcast constructor for datastore entity.
		podcast = Podcast(parent=podcast_feed_key())

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
		podcast.imageUrl = root.find('channel').find('image').find('url').text

		for item in root.find('channel').findall('item'):
			ep_title = item.find('title').text
			ep_url = item.find('link').text
			episode = {'title': ep_title, 'url': ep_url }
			logging.info( 'ep_url = %s, ep_title= %s, episode= %s, ' %(ep_url, ep_title, episode) )
			episode_list_return.append(episode)

			episode_list.append(Episode( episode_title = ep_title,
										episode_url = ep_url,
										listened = False,
										pubDate = item.find('pubDate').text,
		# I'm able to hardcode in the namespace for itunes:, using xmlns:media, not sure how I'd do that programmatically
		#								episodeLength = item.find('{http://search.yahoo.com/mrss/}duration').text,
										playbackPosition = 0))
			
		podcast.show = episode_list
		podcast.put()
				
		returnInfo = { 'title': podcast.title, 'imageUrl': podcast.imageUrl, 'feedUrl': podcast.feedUrl, 'episodes': episode_list_return }

		self.response.headers['Content-Type'] = 'application/json'
		self.response.out.write(json.dumps(returnInfo))

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

		feed_id = self.request.get('podcast')

		qry = Podcast.query(Podcast.feedUrl == feed_id)
		result = qry.fetch(1)

		result[0].key.delete()
		
		# return True

app = webapp2.WSGIApplication([
		('/', MainPage),
		# list of functions / actions /methods, not sure proper term
		('/addpodcast', AddPodcast),
		('/removepodcast', RemPodcast),
		('/refreshfeed', RefreshFeed),
		# list of pages for web app
		# ('/new', NewPage),
		('/playlist', PlaylistPage),
		('/search', SearchPage),
		# ('/settings', SettingsPage),
		
	
], debug=True)
