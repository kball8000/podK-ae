"""Some general 'themes' throught coding. 
-url's are usually used as id values for querying
-title's are used more as the human readable version to return.
-On first load page is python/datastore/jinja
-Once running, page is more javascript instead of jinja, so it feels like
duplication, but some of the pages are written twice, once jinja, second in JS.
i.e. adding an episode to playlist requires updating the page before a reload
which would have used the code in jinja I'd already written.
-url routing tends to handled here in python.

Sample podcast feed: http://feeds.twit.tv/sn.xml
"""

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

JINJA_ENVIRONMENT = jinja2.Environment(
	# loader = jinja2.FileSystemLoader(os.path.dirname(__file__)),
	loader = jinja2.FileSystemLoader(os.path.join(os.path.dirname(__file__), 'templates')),
	extensions = ['jinja2.ext.autoescape'],
	autoescape = True)

DEFAULT_PODCAST_FEED_LIST = 'default_podcast_feed_list'

def podcast_feed_key(podcast_feed=DEFAULT_PODCAST_FEED_LIST):
    return ndb.Key('podcast_feed', podcast_feed)

class Episode(ndb.Model):
	title = ndb.StringProperty(indexed=False)
	url = ndb.StringProperty(indexed=False)
	listened = ndb.BooleanProperty()
	pubDate = ndb.StringProperty(indexed=False)
	dateAdded = ndb.DateTimeProperty(auto_now_add=True) # date added
	episodeLength_str = ndb.StringProperty(indexed=False) # string format, not date
	# episodeLength_int = ndb.ComputedProperty() # integer, seconds format of episode duration
	playbackPosition = ndb.IntegerProperty() # in milliseconds
	# percentListened = ndb.ComputedProperty() # integer of percent listened

class Podcast(ndb.Model):
	author = ndb.UserProperty()
	title = ndb.StringProperty(indexed=False)
	urlPodcast = ndb.StringProperty()
	urlImage = ndb.StringProperty(indexed=False)
	episode = ndb.StructuredProperty(Episode, repeated=True)
	date = ndb.DateTimeProperty(auto_now_add=True)

class Playlist(ndb.Model):
	author = ndb.UserProperty()
	listType = ndb.StringProperty() 				# playlist, new or currentPlaying
	playlist = ndb.JsonProperty(compressed=True) 	# misnamed as playlist, it is actually more generic
	
class PodcastPage(webapp2.RequestHandler):
    def get(self):
		user = users.get_current_user()

		# Have user log in and show their current subscriptions.
		if user:
			user_welcome_nickname = user.nickname()
			user_welcome_href = users.create_logout_url('/')
		else:
			user_welcome_nickname = None
			user_welcome_href = users.create_login_url(self.request.uri)

 		# Check to see if a playlist exists, if not, create one. Ideally, this will be done on the creation of a user account.
		# But it may just stay here, who knows, maybe first login screen. It is super quick and all.
		playlist_key_fromDS = Playlist.query(ancestor = podcast_feed_key()).fetch(1, keys_only=True)
		if(len(playlist_key_fromDS) == 0):
			playlist = Playlist(parent=podcast_feed_key())
			if users.get_current_user():
				playlist.author = users.get_current_user()
			playlist.playlist = []
			playlist.listType = 'playlist'
			playlist.put()
			
		podcast_feed_qry = Podcast.query(ancestor = podcast_feed_key()).order(-Podcast.date)
		podcast_feeds = podcast_feed_qry.fetch(50)
				
		template_values = {
			'navClass': {'home': 'ui-btn-active ui-state-persist' },
			'pageTitle': 'Home',
			'podcast_feeds': podcast_feeds,
			'user_welcome_nickname': user_welcome_nickname,
			'user_welcome_href': user_welcome_href
		}
		template = JINJA_ENVIRONMENT.get_template('index.html')
		self.response.write(template.render(template_values))

class PlaylistPage(webapp2.RequestHandler):
	def get(self):
		
		# Get playlist from datastore
		qry = Playlist.query(ancestor = podcast_feed_key())
		temp_fetch = qry.fetch()
		logging.info('qry = %s' % qry)
		logging.info('qry = %s' % temp_fetch)
		qry_1 = qry.filter(Playlist.listType == 'playlist', Playlist.author == users.get_current_user())
		qry_2 = qry.filter(Playlist.listType == 'nowPlaying', Playlist.author == users.get_current_user())
  		result_1 = qry_1.fetch(1)[0];
  		result_2 = qry_2.fetch(1)[0] if len(qry_2.fetch(1)) > 0 else None

		playlist = result_1.playlist
		playlist.reverse()
		logging.info('playlist reversed: %s' % playlist)
		
		nowPlaying = result_2.playlist if result_2 else 'nada'

		template_values = {
			'navClass': {'playlist': 'ui-btn-active ui-state-persist' },
			'pageTitle': 'Playlist',
			'playlist': playlist,
			'nowPlaying': nowPlaying
		}
		template = JINJA_ENVIRONMENT.get_template('playlist.html')
		self.response.write(template.render(template_values))

class SearchPage(webapp2.RequestHandler):
	def get(self):

		template_values = {
			'navClass': {'search': 'ui-btn-active ui-state-persist' },
			'pageTitle': 'Search'
		}
		template = JINJA_ENVIRONMENT.get_template('search.html')
		self.response.write(template.render(template_values))

class NewPage(webapp2.RequestHandler):
	def get(self):

		template_values = {
			'navClass': {'new': 'ui-btn-active ui-state-persist' },
			# 'dataUrl': '/new',
			'pageTitle': 'New'
		}
		template = JINJA_ENVIRONMENT.get_template('new.html')
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

		# Get podcast feed url form post request
		url = self.request.get('url')
		logging.info('url: %s' % url)

		# Create the podcast constructor for datastore entity.
		podcast = Podcast(parent=podcast_feed_key())

		# Add a couple basic podcast parameters
		if users.get_current_user():
			podcast.author = users.get_current_user()
		podcast.urlPodcast = url

		""" Get the rss feed and parse it to save information I want to keep."""
		# May want to do an if(getFeedInfo) and write something to the screen if it returns false.
		response = getFeedInfo(url)
		# parse xml response from rss feed URI
		root = ET.fromstring(response)
		#Should try printing less, maybe something builtin to python that prints first XX lines.
		logging.info(ET.tostring(root))

		podcast.title = root.find('channel').find('title').text
 		podcast.urlImage = root.find('channel').find('image').find('url').text

		"""Need a bunch of error checking in this region, if any of these things
		don't exist, it will not even add to podcast subscription list.
		test_img_url_1 = root.find('channel').find('image').find('url').text
		test_img_url_2 = root.find('channel').find('{http://www.itunes.com/dtds/podcast-1.0.dtd}duration').text,
		podcast.urlImage = test_img_1 if test_img_1 else
		"""

		for item in root.find('channel').findall('item'):
			title_episode = item.find('title').text
			url_episode = item.find('link').text
			episode = {'title': title_episode, 'url': url_episode }
			episode_list_return.append(episode)

			episode_list.append(Episode( title = title_episode,
										url = url_episode,
										listened = False,
										pubDate = item.find('pubDate').text,
		# I'm able to hardcode in the namespace for itunes:, using xmlns:media, not sure how I'd do that programmatically
										episodeLength_str = item.find('{http://www.itunes.com/dtds/podcast-1.0.dtd}duration').text,
										playbackPosition = 0))
			
		# Save file to App Engine datastore
		podcast.episode = episode_list
		podcast.put()
				
		# Write information out to webpage
		returnInfo = { 'title': podcast.title, 'urlImage': podcast.urlImage, 'urlPodcast': podcast.urlPodcast, 'episodes': episode_list_return }
		self.response.headers['Content-Type'] = 'application/json'
		self.response.out.write(json.dumps(returnInfo))

class RefreshFeed(webapp2.RequestHandler):
    def post(self):
		url = self.request.get('refreshFeed')
		feed_info = getFeedInfo(url)
		
		# Need to do something with feed_info, unless I just want to do a full page refresh.
		# If I want to do ajax, may need jQuery
		
	

class RemPodcast(webapp2.RequestHandler):
    def post(self):
		
		""" Remove podcast subscription from the datastore.  """
		# Should use key to delete instead of retrieving entire entity.
		# http://stackoverflow.com/questions/22052013/how-to-use-ajax-with-google-app-engine-python 

		feed_id = self.request.get('podcast')

		qry = Podcast.query(ancestor=podcast_feed_key())
		qry_2 = qry.filter(Podcast.urlPodcast == feed_id, Podcast.author == users.get_current_user())
		result = qry_2.fetch(1, keys_only=True)[0]
		
		result.delete()

class AddToPlaylist(webapp2.RequestHandler):
	def post(self):

		# Get values from ajax / post request
#		titlePodcast = self.request.get('titlePodcast')
#		titleEpisode = self.request.get('titleEpisode')
		url_episode = self.request.get('urlEpisode')
		url_podcast = self.request.get('urlPodcast')

		# Get playlist from datastore
		qry_playlist = Playlist.query(ancestor=podcast_feed_key())
		qry_playlist_2 = qry_playlist.filter(Playlist.listType == 'playlist', Playlist.author == users.get_current_user())
	  	playlist = qry_playlist_2.fetch(1)[0];
		logging.info('playlist: %s' % playlist)
		for x in playlist.playlist:
			logging.info('playlist - x : %s' % x)


		# Retrieve podcast entity and playlist entity, 
		# -use feed url to find items in datastore
		# -use url (episode) to get all the information about the episode to append to playlist.
		qry_podcast = Podcast.query(ancestor=podcast_feed_key())
		qry_podcast_2 = qry_podcast.filter(Podcast.urlPodcast == url_podcast, Podcast.author == users.get_current_user())
  		podcast = qry_podcast_2.fetch(1)[0];
		logging.info('podcast: %s' % podcast)

		for episode in podcast.episode:
			if episode.url == url_episode:
				title_episode = episode.title
# 		for x in podcast:
# 			logging.info('playlist - x : %s' % x)
		
		# Save a generic blob - list of dicts - to App Engine datastore
#  		playlist.playlist.append({'titlePodcast': titlePodcast , 'titleEpisode': titleEpisode, 'url': url })
 		playlist.playlist.append({'title_podcast': podcast.title ,
# 								  'title_episode': podcast.episode.title, 
 								  'title_episode': title_episode, 
								  #'duration': podcast.episodeLength_str,
								  #'percent_listened': podcast.percentListened,
								  'url_episode': url_episode,
 								  'url_image': podcast.urlImage
								 })
		playlist.put()
		

		return_info = {'titlePodcast': podcast.title, 'titleEpisode': title_episode}
		self.response.headers['Content-Type'] = 'application/json'
# 		self.response.out.write(json.dumps(return_info))
		self.response.write(json.dumps(return_info))
		
		

class RemoveFromPlaylist(webapp2.RequestHandler):
	""" Removes entry from datastore using episode's url and returns that episodes 
	title to web page."""
	def post(self):
		url = self.request.get('url')
		
		# qry = Playlist.query(ancestor=podcast_feed_key(), Playlist.author == users.get_current_user())
		qry = Playlist.query(Playlist.author == users.get_current_user())
		playlist = qry.fetch(1)[0];
		
		for episode in playlist.playlist:
			if (episode['url_episode'] == url):
				playlist.playlist.removee(episode)
				episode_removed = episode['title_episode']
		playlist.put()
		
		self.response.write(episode_removed)

app = webapp2.WSGIApplication([
		('/', PodcastPage),
		# list of functions / actions /methods, not sure proper term
		('/addpodcast', AddPodcast),
		('/removepodcast', RemPodcast),
		('/removefromplaylist', RemoveFromPlaylist),
		('/addtoplaylist', AddToPlaylist),
		('/refreshfeed', RefreshFeed),
		# list of pages for web app
		('/new', NewPage),
		('/playlist', PlaylistPage),
		('/search', SearchPage),
		# ('/settings', SettingsPage),
		
], debug=True)
