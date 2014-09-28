"""Some general 'themes' throught coding. 
-Podcast refers to show, whereas episode refers to individual epsisodes. Pointing
this out to avoid confusion, as some refer to an individual show/episode as a podcast.
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
	loader = jinja2.FileSystemLoader(os.path.join(os.path.dirname(__file__), 'templates')),
	extensions = ['jinja2.ext.autoescape'],
	autoescape = True)

class Episode(ndb.Model):
	title = ndb.StringProperty(indexed=False)
	url = ndb.StringProperty(indexed=False)
	listened = ndb.BooleanProperty(indexed=False)
	pub_date = ndb.StringProperty(indexed=False)
	date_added = ndb.DateTimeProperty(auto_now_add=True) # date added
	length_str = ndb.StringProperty(indexed=False) # string format, not date
	current_time = ndb.IntegerProperty(indexed=False) # in milliseconds
	# percentListened = ndb.ComputedProperty() # integer of percent listened

class Podcast(ndb.Model):
	author = ndb.UserProperty()
	title = ndb.StringProperty(indexed=False)
	url = ndb.StringProperty(indexed=False)
	image_url = ndb.StringProperty(indexed=False)
	active = ndb.BooleanProperty(required=True, default=True)
	episode = ndb.StructuredProperty(Episode, repeated=True, indexed=False)
	date = ndb.DateTimeProperty(auto_now_add=True)

class ListItem(ndb.Model):
	episode_url = ndb.StringProperty(indexed=False)
	podcast_key = ndb.KeyProperty(indexed=False)
	date = ndb.DateTimeProperty(auto_now_add=True)

class Playlist(ndb.Model):
	author = ndb.UserProperty()
	list_item = ndb.StructuredProperty(ListItem, repeated=True)
	now_playing_url = ndb.StringProperty(indexed=False, required=True, default='')
	now_playing_key = ndb.KeyProperty(required=True, default=ndb.Key('podcast_feed', 'default_podcast_feed_list'))

def podcast_feed_key():
    return ndb.Key('podcast_feed', 'default_podcast_feed_list')

def create_playlist():
	"""This should only run once users first time using Podsy. Once lists are created, 
	this should be unnecessary. Currently there are 2 lists, playlist and now playing 'list'."""
	user = users.get_current_user()

	qry = Playlist.query(ancestor = podcast_feed_key())
	result = qry.filter(Playlist.author == user).fetch(1, keys_only=True)

	if(len(result) < 1):
		playlist = Playlist(parent=podcast_feed_key())
		playlist.author = user
		playlist.list_item = []
		playlist.now_playing_url = ''
		playlist.now_playing_key = podcast_feed_key()
		playlist.put()
	
class PodcastPage(webapp2.RequestHandler):
    def get(self):
		user = users.get_current_user()

		# Have user log in and show their current subscriptions.
		if user:
			user_welcome_nickname = user.nickname()
			user_welcome_href = users.create_logout_url('/')
		else:
			self.redirect('/signon?page=%2F')
			return

 		# On first use of Podsy, create playlist.
		create_playlist()

		# Get subscription list from datastore
		qry = Podcast.query(ancestor = podcast_feed_key())
		qry_1 = qry.filter(Podcast.author == user, Podcast.active == True).order(-Podcast.date)
		podcast_feeds = qry_1.fetch(20)

		# Get playlist from datastore in order to display key in data- on page and to see if any inactive
		# podcast subscriptions can be removed.
		qry_p = Playlist.query(ancestor=podcast_feed_key())
		playlist = qry_p.filter(Playlist.author == user).fetch(1)[0]
		
		""" This is pretty fundamental to the program, passing key to webpage for 
		retrieving anything about the podcast or it's episodes, later."""
		for podcast in podcast_feeds:
			podcast.urlsafe_key = podcast.key.urlsafe()
				
		# Get inactive subscription list from datastore and remove if not used in playlist, otherwise
		# leave so the playlist can still reference the individual episode for playing info.
		qry_in = Podcast.query(ancestor = podcast_feed_key())
		qry_in_1 = qry_in.filter(Podcast.author == user, Podcast.active == False)
		inactive_podcasts = qry_in_1.fetch(20, keys_only=True)
		
		if len(inactive_podcasts) > 0:
			li_item = []
			for item in playlist.list_item:
				li_item.append(podcast_key)
			for inactive in inactive_podcasts:
				if inactive not in li_item:
					inactive.delete()
		
		template_values = {
			'navClass': {'home': 'ui-btn-active ui-state-persist' },
			'pageTitle': 'Home',
			'pageId': 'PodcastPage',
			'playlist_urlsafe_key': playlist.key.urlsafe(),
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
		playlist = qry.filter(Playlist.author == users.get_current_user()).fetch(1)[0]

		playlist.urlsafe_key = playlist.key.urlsafe()
		playlist.list_item.reverse()
		
		logging.info('playlistpage, playlist: %s' % playlist)
		
		# Info for playlist items which will display in listview
		for item in playlist.list_item:
			podcast = item.podcast_key.get()
			item.podcast_title = podcast.title
			item.urlsafe_key = podcast.key.urlsafe()
			for episode in podcast.episode:
				if episode.url == item.episode_url:
					item.episode_title = episode.title
					item.current_time = episode.current_time
					break

		now_playing_podcast = playlist.now_playing_key.get()
		# now_playing_podcast = ''
		
		# Get info for the player to display
		if now_playing_podcast:
			playlist.now_playing_podcast_title = now_playing_podcast.title
			for episode in now_playing_podcast.episode:
				if episode.url == playlist.now_playing_url:
					playlist.now_playing_episode_title = episode.title
					playlist.now_playing_current_time = episode.current_time
					playlist.now_playing_urlsafe_key = now_playing_podcast.key.urlsafe()

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
			'pageTitle': 'New'
		}
		template = JINJA_ENVIRONMENT.get_template('new.html')
		self.response.write(template.render(template_values))

class SearchPage(webapp2.RequestHandler):
	def get(self):
		
		user = users.get_current_user()
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

		# Get podcast feed url from post request
		url = self.request.get('url')

		# Create the podcast constructor for datastore entity.
		podcast = Podcast(parent=podcast_feed_key())
		podcast.author = users.get_current_user()
		podcast.url = url

		""" Get the rss feed and parse it to save information I want to keep."""
		# May want to do an if(getFeedInfo) and write something to the screen if it returns false.
		response = getFeedInfo(url)
		# parse xml response from rss feed URI
		root = ET.fromstring(response)
		#Should try printing less, maybe something builtin to python that prints first XX lines.
		# logging.info(ET.tostring(root))

		podcast.title = root.find('channel').find('title').text
 		podcast.image_url = root.find('channel').find('image').find('url').text

		"""Need a bunch of error checking in this region, if any of these things
		don't exist, it will not even add to podcast subscription list.
		test_img_url_1 = root.find('channel').find('image').find('url').text
		test_img_url_2 = root.find('channel').find('{http://www.itunes.com/dtds/podcast-1.0.dtd}duration').text,
		podcast.image_url = test_img_1 if test_img_1 else
		"""

		for item in root.find('channel').findall('item'):
			episode_title = item.find('title').text
			episode_url = item.find('enclosure').get('url')
			
			#Info to return to web page
			episode = {'title': episode_title, 'url': episode_url, 'current_time': 0}
			episode_list_return.append(episode)

			#Info to return to save to datastore
			episode_list.append(Episode( title = episode_title,
										url = episode_url,
										listened = False,
										pub_date = item.find('pubDate').text,
										length_str = item.find('{http://www.itunes.com/dtds/podcast-1.0.dtd}duration').text,
										current_time = 0))
			
		# Save file to App Engine datastore
		podcast.episode = episode_list
		key = podcast.put()
				
		# Since json.dumps can not serialize a datastore model, I create a custom
		# dictionary to send to the page.
		returnInfo = { 'title': podcast.title, 
					  'image_url': podcast.image_url, 
					  'episode': episode_list_return,
					  'urlsafe_key': key.urlsafe()
					 }
		self.response.headers['Content-Type'] = 'application/json'
		self.response.out.write(json.dumps(returnInfo))

# Podcast / Main page functions
class RemovePodcast(webapp2.RequestHandler):
    def post(self):
		""" Remove podcast subscription from the datastore.  """
		# http://stackoverflow.com/questions/22052013/how-to-use-ajax-with-google-app-engine-python 

		# Check playlist to see if the podcast the user wants to remove is in there, if so, set inactive
		# and do not remove it. On startup of app, then check to see if any inactives are still being used
		# in playlist, if not remove podcast permanently, if still used do nothing.
		user = users.get_current_user()
		delete_flag = True

		urlsafe_key = self.request.get('urlsafe_key')
		key = ndb.Key(urlsafe=urlsafe_key)

		qry = Playlist.query(ancestor=podcast_feed_key())
		playlist = qry.filter(Playlist.author==user).fetch(1)[0]

		# If a playlist item references a podcast, only mark inactive and leave for deletion
		# when all dependancies are gone. Checks on podcast page load.
		for item in playlist.list_item:
			if item.podcast_key == key:
				podcast = key.get()
				podcast.active = False
				podcast.put()
				delete_flag = False
				break 	# stop if even one playlist item references a podcast subscription

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
		page_list_item = {};
		logging.info('\n\nIn add to playlist ***---***')
		
		""" Add check to see if episoode is already in playlist """

		# Get values from ajax / post request
		episode_url = self.request.get('episode_url')
		podcast_key = ndb.Key(urlsafe = self.request.get('urlsafe_key'))
		playlist_key = ndb.Key(urlsafe = self.request.get('playlist_urlsafe_key'))
		
		# Get playlist from datastore using key stored in data- on webpage
		playlist = playlist_key.get()
		
		# Save updated playlist to datastore
		list_item = ListItem(episode_url=episode_url, podcast_key=podcast_key)
		playlist.list_item.append(list_item)
		playlist.put()
		
		# Since json.dumps can not serialize a datastore model, I create a custom
		# dictionary to send to the page
		podcast = podcast_key.get()
		page_list_item['podcast_title'] = podcast.title
		page_list_item['urlsafe_key'] = podcast.key.urlsafe()
		
		for episode in podcast.episode:
			if episode.url == episode_url:
				page_list_item['episode_title'] = episode.title
				page_list_item['episode_url'] = episode.url
				page_list_item['current_time'] = 0
				break
				
		logging.info('addtoplaylist %s' % page_list_item)
		self.response.headers['Content-Type'] = 'application/json'
		self.response.write(json.dumps(page_list_item))

# Playlist page functions
class RemoveFromPlaylist(webapp2.RequestHandler):
	""" Removes entry from datastore using episode's url and returns that episodes 
	title to web page."""
	def post(self):
		
		url = self.request.get('url')
		urlsafe_key = self.request.get('playlist_key')
		
		playlist = ndb.Key(urlsafe=urlsafe_key).get()
		
		for item in playlist.list_item:
			if (item.episode_url == url):
				playlist.list_item.remove(item)
		playlist.put()

class SavePlaybackPosition(webapp2.RequestHandler):
	""" Saves current playback position to datastore. Used to retrieve on startup to resume where user stopped listening. """
	def post(self):
		user = users.get_current_user();
		
		qry = Playlist.query(ancestor=podcast_feed_key())
		playlist = qry.filter(Playlist.author == user).fetch(1)[0]

		urlsafe_key = self.request.get('urlsafe_key')
		logging.info('saveplaybackposition, urlsafe_key: %s' % urlsafe_key )
		playlist.now_playing_key = ndb.Key(urlsafe=urlsafe_key)
		podcast = playlist.now_playing_key.get()
		
		episode_url = self.request.get('episode_url')
		current_time = self.request.get('current_time')
		for episode in podcast.episode:
			if episode.url == episode_url:
				episode.current_time = int(current_time)
				
		podcast.put()

class SaveNowPlaying(webapp2.RequestHandler):
	""" Initializes player with last played episode and last playback time.
	Episode url's for querying datastore are data on html page and check datastore
	for latest details.
	"""
	def post(self):
		
		# user = users.get_current_user()
		returnInfo = {}
		
		logging.info('\n\nsavenowplaying: in ---****')
		
		episode_url = self.request.get('url')
		playlist_urlsafe_key = self.request.get('playlist_urlsafe_key')
		podcast_urlsafe_key = self.request.get('podcast_urlsafe_key')
		
		# Save playlist with nowplaying pointers to actual podcast 
		# and get details of episode from podcast entity.
		playlist = ndb.Key(urlsafe=playlist_urlsafe_key).get()
		
		podcast = ndb.Key(urlsafe=podcast_urlsafe_key).get()
		returnInfo['podcast_title'] = podcast.title
		for episode in podcast.episode:
			if episode.url == episode_url:
				returnInfo['episode_title'] = episode.title

		playlist.now_playing_key = ndb.Key(urlsafe=podcast_urlsafe_key)
		playlist.now_playing_url = episode_url

		playlist.put()

		self.response.headers['Content-Type'] = 'application/json'
		self.response.out.write(json.dumps(returnInfo))

app = webapp2.WSGIApplication([
		# list of functions / actions /methods, not sure proper term
		('/addpodcast', AddPodcast),
		('/removepodcast', RemovePodcast),
		('/removefromplaylist', RemoveFromPlaylist),
		('/addtoplaylist', AddToPlaylist),
		('/savenowplaying', SaveNowPlaying),
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
