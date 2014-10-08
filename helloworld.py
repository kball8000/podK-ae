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
from operator import itemgetter, attrgetter

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

class NewList(ndb.Model):
    author = ndb.UserProperty()
    list_item = ndb.StructuredProperty(ListItem, repeated=True)

def podcast_feed_key():
    return ndb.Key('podcast_feed', 'default_podcast_feed_list')

def get_playlist(user):
    """This should only run once users first time using Podsy. Once lists are created, 
    this should be unnecessary. Currently there are 2 lists, playlist and now playing 'list'."""

    qry = Playlist.query(ancestor = podcast_feed_key())
    result = qry.filter(Playlist.author == user).fetch(1)

    if(len(result) < 1):
        playlist = Playlist(parent=podcast_feed_key())
        playlist.author = user
        playlist.list_item = []
        playlist.now_playing_url = ''
        playlist.now_playing_key = podcast_feed_key()
        playlist.put()
    else:
        playlist = result[0]
    
    return playlist

def get_new_list(user):
    """This should only run once users first time using Podsy. Once lists are created, 
    this should be unnecessary. Currently there are 2 lists, playlist and now playing 'list'."""

    qry = NewList.query(ancestor = podcast_feed_key())
    result = qry.filter(NewList.author == user).fetch(1)

    if(len(result) < 1):
        new_list = NewList(parent=podcast_feed_key())
        new_list.author = user
        new_list.list_item = []
        new_list.put()
    else:
        new_list = result[0]

    return new_list

def get_list_data(li):
    
    for item in li.list_item:
        podcast = item.podcast_key.get()
        item.podcast_title = podcast.title
        item.urlsafe_key = podcast.key.urlsafe()
        for episode in podcast.episode:
            if episode.url == item.episode_url:
                item.episode_title = episode.title
                item.current_time = episode.current_time
                break
    
    return li

def get_now_playing_data(playlist):
    
    now_playing_podcast = playlist.now_playing_key.get()

    # Get info for the player to display
    if now_playing_podcast:
        playlist.now_playing_podcast_title = now_playing_podcast.title
        for episode in now_playing_podcast.episode:
            if episode.url == playlist.now_playing_url:
                playlist.now_playing_episode_title = episode.title
                playlist.now_playing_current_time = episode.current_time
                playlist.now_playing_urlsafe_key = now_playing_podcast.key.urlsafe()
        
    return playlist

def remove_inactive_podcasts(user, playlist):
    # Get inactive subscription list from datastore and remove if not used in playlist, otherwise
    # leave so the playlist can still reference the individual episode for playing info.
    qry = Podcast.query(ancestor = podcast_feed_key())
    qry_1 = qry.filter(Podcast.author == user, Podcast.active == False)
    inactive_podcasts = qry_1.fetch(20, keys_only=True)

    if len(inactive_podcasts) > 0:
        li_item = [item.podcast_key for item in playlist.list_item]

        for inactive in inactive_podcasts:
            if inactive not in li_item:
                 inactive.delete()

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

         # On first use of Podsy, create playlist and new_list
        playlist = get_playlist(user)

        # Get subscription list from datastore
        qry = Podcast.query(ancestor = podcast_feed_key())
        qry_1 = qry.filter(Podcast.author == user, Podcast.active == True).order(-Podcast.date)
        podcasts = qry_1.fetch(20)
        
        """ This is pretty fundamental to the program, passing key to webpage for 
        retrieving anything about the podcast or it's episodes, later."""
        for podcast in podcasts:
            podcast.urlsafe_key = podcast.key.urlsafe()

        # Get playlist from datastore in order to display key in data- on page and to see if any inactive
        # podcast subscriptions can be removed.

        remove_inactive_podcasts(user, playlist)

        template_values = {
            'navClass': {'home': 'ui-btn-active ui-state-persist' },
            'pageTitle': 'Home',
            'pageId': 'PodcastPage',
            'playlist_urlsafe_key': playlist.key.urlsafe(),
            'podcasts': podcasts,
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
        playlist = get_playlist(user)

        playlist.urlsafe_key = playlist.key.urlsafe()
        playlist.list_item.reverse()
        
        # Playlist info is initially very barebones, get more data from
        # the source, the podcast entity.
        playlist = get_list_data(playlist)
        playlist = get_now_playing_data(playlist)
        
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
        
        new_list = get_new_list(user)

        # New list info is initially very barebones, get more data from
        # the source, the podcast entity.        
        new_list = get_list_data(new_list)
        new_list.urlsafe_key = new_list.key.urlsafe()
         # new_list.list_item.reverse()

        template_values = {
            'navClass': {'new': 'ui-btn-active ui-state-persist' },
            'pageId': 'NewPage',
            'pageTitle': 'New',
            'newList': new_list
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

# General methods
def getFeedInfo(url):

    request = urllib2.Request(url)
    try:
        response = urllib2.urlopen(request).read()
    except urllib2.URLError, e:
        return False
    
    return response

def dump_json(self, data):
    """ Writes out json data, generally a return for ajax requests."""

    self.response.headers['Content-Type'] = 'application/json'
    self.response.out.write(json.dumps(data))

def get_info_from_rss(rss_url):
    logging.info('getting podcast rss feed')
    info = {}         # Overall podcast info
    episode_list = []

    response = getFeedInfo(rss_url)
    # parse xml response from rss feed URI
    root = ET.fromstring(response)
    
    """ May need some error checking here. """

    info['title'] = root.find('channel').find('title').text
    info['image_url'] = root.find('channel').find('image').find('url').text
    info['rss_url'] = rss_url
    
    for item in root.find('channel').findall('item'):
        episode = {
            'title': item.find('title').text,
            'url': item.find('enclosure').get('url'),
            'pub_date': item.find('pubDate').text,
            'length_str': item.find('{http://www.itunes.com/dtds/podcast-1.0.dtd}duration').text,
            'current_time': 0
        }
        episode_list.append(episode)

    info['episode'] = episode_list
    
    return info

# Search page methods
def create_episode_entity(info):
    episode = (Episode(title = info['title'],
                       url = info['url'],
                       listened = False,
                       pub_date = info['pub_date'],
                       length_str = info['length_str'],
                       current_time = info['current_time'])
              )
    
    return episode

def create_podcast_entity(info):
    logging.info('getting podcast rss feed')
    logging.info('createpodcastentity, info: %s ' % info)
    episode_list = []

    podcast = Podcast(parent=podcast_feed_key())

    podcast.author = users.get_current_user()
    podcast.url = info['rss_url']
    podcast.title = info['title']
    podcast.image_url = info['image_url']
    
    for episode in info['episode']:
        episode_list.append(create_episode_entity(episode))

    podcast.episode = episode_list
    
    return podcast

# Search page classes
class AddPodcast(webapp2.RequestHandler):
    def post(self):
        rss_url = self.request.get('url')
        
        """Add check to see if podcast already exists"""

        podcast_info = get_info_from_rss(rss_url)         # to display on page
        podcast = create_podcast_entity(podcast_info)     # for datastore
        podcast_key = podcast.put()                     # save to datastore
        
        podcast_info['urlsafe_key'] = podcast_key.urlsafe()

        dump_json(self, podcast_info)                     # send info to page

# Podcast / Main page functions
def remove_episode(podcast):
    podcast.episode.pop()
    podcast.episode.pop()
    podcast.put()

def update_podcast_episodes(podcast, add, remove, info):
    add_info = remove_info = []
    playlist = get_playlist(users.get_current_user())

    for old_url in remove:
        for episode in podcast.episode:
            if episode.url == old_url:
                for item in playlist.list_item:
                    if item.episode_url == old_url:
                        break
                    else:
                        logging.info('podcast.episode: %s' % podcast.episode)
                        logging.info('episode: %s' % episode)
                        
                        podcast.episode.remove(episode)
                        remove_info.append({'url': episode.url})
                        break
    """ Check against playlist here """

    podcast.episode.reverse()       # after op, sorted oldest to newest
    add.reverse()   # after op oldest to newest
    for new in add:
        for episode in info['episode']:
            if episode['url'] == new:
                new_episode = create_episode_entity(episode)
                podcast.episode.append(new_episode)
                add_info.append(episode)
    add_info.reverse()
                
    podcast.episode.reverse()       # after op, sorted newest to oldest
    # logging.info('updatepodcastepisode, podcast %s' % podcast.episode)
    
    podcast.put()
    
    return_info = {'add': add_info, 'remove': remove_info}
    return return_info

# Podcast / Main page classes
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

        # qry = Playlist.query(ancestor=podcast_feed_key())
        # playlist = qry.filter(Playlist.author==user).fetch(1)[0]
        playlist = get_playlist(user)

        # If a playlist item references a podcast, only mark inactive and leave for deletion
        # when all dependancies are gone. Checks on podcast page load.
        for item in playlist.list_item:
            if item.podcast_key == key:
                podcast = key.get()
                podcast.active = False
                podcast.put()
                delete_flag = False
                break     # stop if even one playlist item references a podcast subscription

        if delete_flag:
            key.delete()

class RefreshAllPodcasts(webapp2.RequestHandler):
    def post(self):
        logging.info('refreshallfeeds')
        # Get all podcasts.
        # for podcast in podcasts call refresh feed

class RefreshPodcast(webapp2.RequestHandler):
    def post(self):
        urlsafe_key = self.request.get('urlsafe_key')   # podcast key
        # logging.info('refreshpodcast, key: %s ' % urlsafe_key)
        podcast = ndb.Key(urlsafe=urlsafe_key).get()
        feed_info = get_info_from_rss(podcast.url)
        
        # logging.info('refreshpodcast, info-episodes: %s' % feed_info['episode'])
        # logging.info('refreshpodcast, podcast-episodes: %s' % podcast.episode)
        
        episodes_to_add = []
        episodes_to_remove = []

        # remove_episode(podcast)

        current_episode_list = [episode.url for episode in podcast.episode]
        logging.info('refreshfeed, current episode list %s' % current_episode_list)
        new_rss_episode_list = [episode['url'] for episode in feed_info['episode']]
        logging.info('refreshfeed, new rss [] episode list %s' % new_rss_episode_list)
                
        for episode_url in new_rss_episode_list:        # Comparing urls to mp3 file.
            if episode_url not in current_episode_list:
                episodes_to_add.append(episode_url)
        logging.info('refreshpodcast, listepisodestoadd: %s' % episodes_to_add)
                
        for episode_url in current_episode_list:        # Comparing urls to mp3 file.
            if episode_url not in new_rss_episode_list:
                episodes_to_remove.append(episode_url)
        logging.info('refreshpodcast, listepisodestoremove: %s' % episodes_to_remove)
        
        info = update_podcast_episodes(podcast, episodes_to_add, episodes_to_remove, feed_info)
        return dump_json(self, info)
        
        # Need to do something with feed_info, unless I just want to do a full page refresh.
        # If I want to do ajax, may need jQuery

class AddToPlaylist(webapp2.RequestHandler):
    def post(self):
        page_list_item = {};
        
        """ Add check to see if episoode is already in playlist """

        # Get values from ajax / post request
        episode_url = self.request.get('episode_url')
        podcast_key = ndb.Key(urlsafe = self.request.get('urlsafe_key'))
        playlist_key = ndb.Key(urlsafe = self.request.get('playlist_urlsafe_key'))
                
        # Add item to playlist and save updated playlist to datastore
        playlist = playlist_key.get()
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
        # self.response.headers['Content-Type'] = 'application/json'
        # self.response.write(json.dumps(page_list_item))
        dump_json(self, page_list_item)

# Playlist page functions

def episode_info(podcast, url, info):
    for episode in podcast.episode:
        if episode.url == url:
            return getattr(episode, info)

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

class SavePlaybackTime(webapp2.RequestHandler):
    """ Saves current playback position to datastore. Used to retrieve on startup to resume where user stopped listening. """
    def post(self):
        
        episode_url = self.request.get('episode_url')
        urlsafe_key = self.request.get('urlsafe_key')    # podcast key
        current_time = self.request.get('current_time')
        
        podcast = ndb.Key(urlsafe=urlsafe_key).get()
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
        
        returnInfo = {}
                
        url = self.request.get('url')
        playlist_urlsafe_key = self.request.get('playlist_urlsafe_key')
        podcast_urlsafe_key = self.request.get('podcast_urlsafe_key')
        
        # Save playlist with nowplaying pointers to actual podcast 
        # and get details of episode from podcast entity.
        playlist = ndb.Key(urlsafe=playlist_urlsafe_key).get()        
        podcast = ndb.Key(urlsafe=podcast_urlsafe_key).get()

        returnInfo['podcast_title'] = podcast.title
        returnInfo['episode_title'] = episode_info(podcast, url, 'title')
        returnInfo['current_time'] = episode_info(podcast, url, 'current_time')
        
        playlist.now_playing_key = ndb.Key(urlsafe=podcast_urlsafe_key)
        playlist.now_playing_url = url
        playlist.put()
        
        dump_json(self, returnInfo)

app = webapp2.WSGIApplication([
        # list of functions / actions /methods, not sure proper term
        ('/addpodcast', AddPodcast),
        ('/removepodcast', RemovePodcast),
        ('/addtoplaylist', AddToPlaylist),
        ('/refreshallpodcasts', RefreshAllPodcasts),
        ('/refreshpodcast', RefreshPodcast),
        ('/removefromplaylist', RemoveFromPlaylist),
        ('/savenowplaying', SaveNowPlaying),
        ('/saveplaybacktime', SavePlaybackTime),

        # list of pages for web app
        ('/', PodcastPage),
        ('/new', NewPage),
        ('/playlist', PlaylistPage),
        ('/search', SearchPage),
        ('/signon', SignOnPage)
        # ('/settings', SettingsPage),
        
], debug=True)
