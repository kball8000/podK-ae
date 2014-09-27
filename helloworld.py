"""Some general 'themes' throught coding. 
-Podcast refers to show, whereas episode refers to individual epsisodes. Pointing
this out to avoid confusion, as some refer to an individual show/episode as a podcast.
-url's are usually used as id values for querying
-title's are used more as the human readable version to return.
-On first load page is python/datastore/jinja
-Once running, page is more javascript instead of jinja, so it feels like
duplication, but some of the pages are written twice, once jinja, second in JS.
i.e. adding an episode to playlist requires updating the page before a reload
which would have used the code in jinja I'd already written.
-url routing is handled here in python.

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

def podcast_feed_key():
    return ndb.Key('podcast_feed', 'default_podcast_feed_list')

""" create_now_playing function Marked for removal """
def create_now_playing():
	user = users.get_current_user()
	if(not user):
		logging.info('user is not logged in to create the list.')
		return
	now_playing_key_fromDS = NowPlaying.query(ancestor = podcast_feed_key()).fetch(5, keys_only=True)
	# logging.info('length of list = %s ' %len(playlist_key_fromDS))
	logging.info('list = %s ' % now_playing_key_fromDS)
	if(len(now_playing_key_fromDS) < 1):
		now_playing = NowPlaying(parent=podcast_feed_key())
		now_playing.author = user
		now_playing.url_episode = ''
		now_playing.storage_id = ''
		now_playing.put()

def create_playlist():
	"""This should only run once users first time using Podsy. Once lists are created, 
	this should be unnecessary. Currently there are 2 lists, playlist and now playing 'list'."""
	user = users.get_current_user()
	# if(not user):
	#	logging.info('user is not logged in to create the list.')
	#	return

	qry = Playlist.query(ancestor = podcast_feed_key())
	result = qry.filter(Playlist.author == user).fetch(1, keys_only=True)

	if(len(result) < 1):
		playlist = Playlist(parent=podcast_feed_key())
		playlist.author = user
		playlist.list_item = []
		playlist.now_playing_url = ''
		playlist.now_playing_key = podcast_feed_key()
		playlist.put()

class Episode(ndb.Model):
	title = ndb.StringProperty(indexed=False)
	# title = ndb.StringProperty(indexed=True)
	url = ndb.StringProperty(indexed=False)
	# listened = ndb.BooleanProperty(indexed=True)
	listened = ndb.BooleanProperty(indexed=False)
	pubDate = ndb.StringProperty(indexed=False)
	dateAdded = ndb.DateTimeProperty(auto_now_add=True) # date added
	episodeLength_str = ndb.StringProperty(indexed=False) # string format, not date
	# episodeLength_int = ndb.ComputedProperty() # integer, seconds format of episode duration
	# now_playing = ndb.BooleanProperty()
	playbackPosition = ndb.IntegerProperty(indexed=False) # in milliseconds
	# percentListened = ndb.ComputedProperty() # integer of percent listened

""" Class Now Playing marked for removal """
class NowPlaying(ndb.Model):
	author = ndb.UserProperty()
	url_episode = ndb.StringProperty(indexed=False)
	storage_id = ndb.StringProperty(indexed=False)

class Podcast(ndb.Model):
	author = ndb.UserProperty()
	title = ndb.StringProperty(indexed=False)
	urlPodcast = ndb.StringProperty()
	urlImage = ndb.StringProperty(indexed=False)
	active = ndb.BooleanProperty()
	episode = ndb.StructuredProperty(Episode, repeated=True, indexed=False)
	date = ndb.DateTimeProperty(auto_now_add=True)

class ListItem(ndb.Model):
	url_episode = ndb.StringProperty(indexed=False)
	storage_id = ndb.StringProperty(indexed=False)
	date = ndb.DateTimeProperty(auto_now_add=True)

class Playlist(ndb.Model):
	author = ndb.UserProperty()
	list_item = ndb.StructuredProperty(ListItem, repeated=True)
	now_playing_url = ndb.StringProperty(indexed=False)
	now_playing_key = ndb.KeyProperty()

class PodcastPage(webapp2.RequestHandler):
    def get(self):
		user = users.get_current_user()

		# Have user log in and show their current subscriptions.
		if user:
			user_welcome_nickname = user.nickname()
			user_welcome_href = users.create_logout_url('/')
		else:
			# user_welcome_nickname = None
			# user_welcome_href = users.create_login_url('self.request.uri')
			self.redirect('/signon?page=%2F')
			return

 		# On first use of Podsy, create playlist and Now Playing.
		
		create_playlist()
		# create_now_playing()

		# Get subscription list from datastore
		qry = Podcast.query(ancestor = podcast_feed_key())
		qry_1 = qry.filter(Podcast.author == user, Podcast.active == True).order(-Podcast.date)
		podcast_feeds = qry_1.fetch(20)

		# Get playlist from datastore in order to display key in data- on page and to see if any inactive
		# podcast subscriptions can be removed.
		qry_p = Playlist.query(ancestor=podcast_feed_key())
		qry_p_1 = qry_p.filter(Playlist.author == user)
		playlist = qry_p_1.fetch(1)[0]
		playlist_id = playlist.key.urlsafe()
		
		""" This is pretty fundamental to the program, passing key to webpage for 
		retrieving anything about the podcast or it's episodes, later."""
		for podcast in podcast_feeds:
			podcast.storage_id = podcast.key.urlsafe()
				
		# Get inactive subscription list from datastore and remove if not used in playlist, otherwise
		# leave so the playlist can still reference the individual episode for playing info.
		qry_in = Podcast.query(ancestor = podcast_feed_key())
		qry_in_1 = qry_in.filter(Podcast.author == user, Podcast.active == False)
		inactive_podcasts = qry_in_1.fetch(20, keys_only=True)
		logging.info('podcastpage, inactive_podcasts: %s' % inactive_podcasts)
		
		if len(inactive_podcasts) > 0:
			li_item = []
			for item in playlist.list_item:
				li_item.append(ndb.Key(urlsafe=item.storage_id).id())
			logging.info('podcastpage list of playlist storage ids %s' % li_item)
			for inactive in inactive_podcasts:
				logging.info('podcastpage inactive.id() %s' % inactive.id())
				if inactive.id() not in li_item:
					inactive.delete()
		
		template_values = {
			'navClass': {'home': 'ui-btn-active ui-state-persist' },
			'pageTitle': 'Home',
			'pageId': 'PodcastPage',
			'playlist_id': playlist_id,
			'podcast_feeds': podcast_feeds,
			'user_welcome_nickname': user_welcome_nickname,
			'user_welcome_href': user_welcome_href
		}
		template = JINJA_ENVIRONMENT.get_template('index.html')
		self.response.write(template.render(template_values))

class PlaylistPage(webapp2.RequestHandler):
	""" Get playlist from datastore and send playlist data to Jinja to render the page"""
	def get(self):

		user = users.get_current_user()
		if not user:
			self.redirect('/signon?page=%2Fplaylist')
			return

		# Get playlist from datastore and sort from newest to oldest.
		qry = Playlist.query(ancestor=podcast_feed_key())
		qry_1 = qry.filter(Playlist.author == users.get_current_user())
		playlist = qry_1.fetch(1)[0]
		playlist.list_item.reverse()

		for item in playlist.list_item:
			podcast = ndb.Key(urlsafe=item.storage_id).get()
			item.title_podcast = podcast.title
			for episode in podcast.episode:
				if episode.url == item.url_episode:
					item.title_episode = episode.title
					item.current_playback_time = episode.playbackPosition
					break
			logging.info('playlistpage, playlist item %s ' % item)
			
		logging.info('playlistpage, playlist %s' % playlist)
		logging.info('playlistpage, playlist.now_playing_key %s ' % playlist.now_playing_key)
		now_playing_podcast = playlist.now_playing_key.get()
		logging.info('playlistpage, now_playing_podcast %s ' % now_playing_podcast)
		
		if now_playing_podcast:
			playlist.now_playing_title_podcast = now_playing_podcast.title
			for episode in now_playing_podcast.episode:
				if episode.url == playlist.now_playing_url:
					playlist.now_playing_title_episode = episode.title
					playlist.now_playing_playback_time = episode.playbackPosition
					playlist.storage_id = now_playing_podcast.key.urlsafe()

		template_values = {
			'navClass': {'playlist': 'ui-btn-active ui-state-persist' },
			'pageTitle': 'Playlist',
			'pageId': 'PlaylistPage',
			'playlist': playlist
		}
		template = JINJA_ENVIRONMENT.get_template('playlist.html')
		self.response.write(template.render(template_values))

class NewPage(webapp2.RequestHandler):
	def get(self):
		user = users.get_current_user()
		if not user:
			self.redirect('/signon?page=%2Fnew')
			return
		
		template_values = {
			'navClass': {'new': 'ui-btn-active ui-state-persist' },
			'pageId': 'NewPage',
			# 'dataUrl': '/new',
			'pageTitle': 'New'
		}
		template = JINJA_ENVIRONMENT.get_template('new.html')
		self.response.write(template.render(template_values))

class SearchPage(webapp2.RequestHandler):
	def get(self):
		user = users.get_current_user()
		logging.info('searchpage, user = %s' % user)
		if not user:
			self.redirect('/signon?page=%2Fsearch')
			return

		template_values = {
			'navClass': {'search': 'ui-btn-active ui-state-persist' },
			'pageId': 'SearchPage',
			'pageTitle': 'Search'
		}
		template = JINJA_ENVIRONMENT.get_template('search.html')
		self.response.write(template.render(template_values))

class SignOnPage(webapp2.RequestHandler):
	def get(self):
		
		page = self.request.get('page')
		user_welcome_href = users.create_login_url(page)

		template_values = {
			'navClass': {'': 'ui-btn-active ui-state-persist' },
			'pageId': 'SignOnPage',
			'pageTitle': 'Sign On',
			'user_welcome_href': user_welcome_href
		}
		template = JINJA_ENVIRONMENT.get_template('signon.html')
		self.response.write(template.render(template_values))

def getFeedInfo(url):

	request = urllib2.Request(url)
	try:
		response = urllib2.urlopen(request).read()
	except urllib2.URLError, e:
		return False
	
	return response

# Search page functions
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
		podcast.active = True

		""" Get the rss feed and parse it to save information I want to keep."""
		# May want to do an if(getFeedInfo) and write something to the screen if it returns false.
		response = getFeedInfo(url)
		# parse xml response from rss feed URI
		root = ET.fromstring(response)
		#Should try printing less, maybe something builtin to python that prints first XX lines.
		# logging.info(ET.tostring(root))

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
			url_episode = item.find('enclosure').get('url')
			episode = {'title': title_episode, 'url': url_episode }
			episode_list_return.append(episode)

			episode_list.append(Episode( title = title_episode,
										url = url_episode,
										listened = False,
										pubDate = item.find('pubDate').text,
		# I'm able to hardcode in the namespace for itunes:, using xmlns:media, not sure how I'd do that programmatically
										# now_playing = False,
										episodeLength_str = item.find('{http://www.itunes.com/dtds/podcast-1.0.dtd}duration').text,
										playbackPosition = 0))
			
		# Save file to App Engine datastore
		podcast.episode = episode_list
		key = podcast.put()
		urlsafe_key = key.urlsafe()
		logging.info('urlsafe = %s' % urlsafe_key)
				
		# Write information out to webpage
		returnInfo = { 'title': podcast.title, 
					  'urlImage': podcast.urlImage, 
					  'urlPodcast': podcast.urlPodcast, 
					  'episodes': episode_list_return,
					  'storageId': urlsafe_key
					 }
		logging.info('addpodcast, returninfo: %s' % returnInfo)
		self.response.headers['Content-Type'] = 'application/json'
		self.response.out.write(json.dumps(returnInfo))

# Podcast / Main page functions
class RemPodcast(webapp2.RequestHandler):
    def post(self):
		""" Remove podcast subscription from the datastore.  """
		# http://stackoverflow.com/questions/22052013/how-to-use-ajax-with-google-app-engine-python 

		# Check playlist to see if the podcast the user wants to remove is in there, if so, set inactive
		# and do not remove it. On startup of app, then check to see if any inactives are still being used
		# in playlist, if not remove podcast permanently, if still used do nothing.
		user = users.get_current_user()
		storage_id = self.request.get('storage_id')
		delete_flag = True

		key = ndb.Key(urlsafe=storage_id)
		qry = Playlist.query(ancestor=podcast_feed_key())
		qry_1 = qry.filter(Playlist.author==user)
		playlist = qry_1.fetch(1)[0] 

		logging.info('rempodcast, playlist = %s and storage id = %s' %(playlist, storage_id))
		for item in playlist.list_item:
			if item.storage_id == storage_id:
				podcast = ndb.Key(urlsafe=storage_id).get()
				podcast.active = False
				podcast.put()
				delete_flag = False
				break

		if delete_flag:
			key.delete()

class RefreshFeed(webapp2.RequestHandler):
    def post(self):
		url = self.request.get('refreshFeed')
		feed_info = getFeedInfo(url)
		
		# Need to do something with feed_info, unless I just want to do a full page refresh.
		# If I want to do ajax, may need jQuery

class AddToPlaylist(webapp2.RequestHandler):
	def post(self):
		logging.info('\n\nIn add to playlist ***---***')
		
		""" Add check to see if podcast already exists """

		# Get values from ajax / post request
		url_episode = self.request.get('url_episode')
		storage_id = self.request.get('storage_id')
		playlist_id = self.request.get('playlist_id')
		
		# Get playlist from datastore using key stored in data- on webpage
		playlist = ndb.Key(urlsafe=playlist_id).get()
		
		# Save updated playlist to datastore
		list_item = ListItem(url_episode=url_episode, storage_id=storage_id)
		playlist.list_item.append(list_item)
		playlist.put()
		
		podcast = ndb.Key(urlsafe=storage_id).get()
		for episode in podcast.episode:
			if episode.url == url_episode:
				title_episode = episode.title
				break
				
		return_info = {
			'urlPodcast': podcast.urlPodcast,
			'urlEpisode': url_episode,
			'titlePodcast': podcast.title,
			'titleEpisode': title_episode
		}
		logging.info('addtoplaylist, return info: %s' % return_info)
		self.response.headers['Content-Type'] = 'application/json'
		self.response.write(json.dumps(return_info))

# Playlist page functions
class RemoveFromPlaylist(webapp2.RequestHandler):
	""" Removes entry from datastore using episode's url and returns that episodes 
	title to web page."""
	def post(self):
		url = self.request.get('url')
		user = users.get_current_user()
		qry = Playlist.query(ancestor=podcast_feed_key())
		qry_1 = qry.filter(Playlist.author == user)
		playlist = qry_1.fetch(1)[0];
		logging.info('\n\nplaylist entity = %s' % playlist)
		
		for episode in playlist.list_item:
			logging.info('episode = %s' % episode)
			# if (episode['url_episode'] == url):
			if (episode.url_episode == url):
				playlist.list_item.remove(episode)
				# episode_removed = episode['title_episode']
		playlist.put()
		
		""" I would need to get the podcast first to get this info and not sure it's really necessary
		Might consider and undo button. I guess it would be another active / inactive situation and
		delete with a javascript settimeout and also check on app load that there are no inactive 
		items in playlist."""
		# self.response.write(episode_removed)

class SavePlaybackPosition(webapp2.RequestHandler):
	""" Saves current playback position to datastore. Used to retrieve on startup to resume where user stopped listening. """
	def post(self):
		user = users.get_current_user();
		
		qry = Playlist.query(ancestor=podcast_feed_key())
		qry_1 = qry.filter(Playlist.author == user)
		playlist = qry_1.fetch(1)[0]

		storage_id = self.request.get('storage_id')
		playlist.now_playing_key = ndb.Key(urlsafe=storage_id)
		podcast = playlist.now_playing_key.get()
		
		url_episode = self.request.get('url_episode')
		current_playback_time = self.request.get('current_playback_time')
		for episode in podcast.episode:
			if episode.url == url_episode:
				episode.playbackPosition = int(current_playback_time)
				
		podcast.put()

class SetNowPlaying(webapp2.RequestHandler):
	""" Initializes player with last played episode and last playback time.
	Episode url's for querying datastore are data on html page and check datastore
	for latest details.
	"""
	def post(self):
		
		user = users.get_current_user()
		url_episode = self.request.get('url_episode')
		storage_id = self.request.get('storage_id')
		logging.info('url = %s, storage_id = %s' %(url_episode, storage_id) )
		# url_podcast = self.request.get('url_podcast')
		
		# Retrieve nowplaying entity from App Engine datastore so we can set info and save back.
		# qry_p = Playlist.query(ancestor=podcast_feed_key())
		# qry_p_1 = qry_p.filter(Playlist.listType == 'nowPlaying', Playlist.author == user)
		# nowPlaying = qry_p_1.fetch(1)[0]
		# logging.info('nowPlaying as retrieved in set now playing = %s' % (nowPlaying))
		
		# Retrieve episode from datastore to get current playback time
		qry = Playlist.query(ancestor=podcast_feed_key())
		qry_1 = qry.filter(Playlist.author == user)
 		playlist = qry_1.fetch(1)[0]

		# Retrieve episode from datastore to get current playback time
		# qry_podcast = Podcast.query(ancestor=podcast_feed_key())
		# qry_podcast_1 = qry_podcast.filter(Podcast.urlPodcast == url_podcast, Podcast.author == user)
 		# podcast = qry_podcast_1.fetch(1)[0]
		
		# if now_playing.storage_id:
		#	podcast = ndb.Key(urlsafe = now_playing.storage_id).get()
		
		# title_podcast = podcast.title
		playlist.now_playing_key = ndb.Key(urlsafe=storage_id)
		playlist.now_playing_url = url_episode
		# logging.info('episode = %s, id = %s' %(now_playing.url_episode, now_playing.storage_id))
		
		# logging.info('nowPlaying as we are saving in set now playing = %s' % (now_playing))
		# logging.info('nowPlaying as we are saving in set now playing = %s' % (nowPlaying))
		# nowPlaying.playlist = [{
		#		'url_podcast': url_podcast,
		#		'url_episode': url_episode,
		#		'title_podcast': podcast.title,
		#		'title_episode': title_episode,
		#		'current_playback_time': current_playback_time
		#	}]
		
		# nowPlaying.put()
		# now_playing.put()
		playlist.put()

app = webapp2.WSGIApplication([
		# list of functions / actions /methods, not sure proper term
		('/addpodcast', AddPodcast),
		('/removepodcast', RemPodcast),
		('/removefromplaylist', RemoveFromPlaylist),
		('/addtoplaylist', AddToPlaylist),
		('/setnowplaying', SetNowPlaying),
		('/saveplaybackposition', SavePlaybackPosition),
		('/refreshfeed', RefreshFeed),
		# list of pages for web app
		('/', PodcastPage),
		('/new', NewPage),
		('/playlist', PlaylistPage),
		('/search', SearchPage),
		('/signon', SignOnPage)
		# ('/settings', SettingsPage),
		
], debug=True)
