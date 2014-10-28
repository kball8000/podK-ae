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
import time
# from operator import itemgetter, attrgetter
# from datetime import datetime, date, time
# import sys
# sys.path.insert(0, 'libs')
# from dateutil import parser

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
    url = ndb.StringProperty(indexed=False)         # RSS feed url
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

def get_active_podcasts(user):
    qry = Podcast.query(ancestor = podcast_feed_key())
    qry_1 = qry.filter(Podcast.author == user, Podcast.active == True).order(-Podcast.date)
    return qry_1.fetch(20)

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

    # logging.info('getlistdata, li after processing %s' % li)
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
    inactive_podcast_keys = qry_1.fetch(20, keys_only=True)

    if len(inactive_podcast_keys) > 0:
        playlist_keys = [item.podcast_key for item in playlist.list_item]

        for inactive in inactive_podcast_keys:
            if inactive not in playlist_keys:
                 inactive.delete()

class PodcastPage(webapp2.RequestHandler):
    def get(self):
        
        start = time.time()

        # Have user log in and show their current subscriptions.
        user = users.get_current_user()
        if user:
            user_welcome_nickname = user.nickname()
            user_welcome_href = users.create_logout_url('/')
        else:
            self.redirect('/signon?page=%2F')
            return

        # Get subscription list from datastore
        """ This is pretty fundamental to the program, passing key to webpage for 
        retrieving anything about the podcast or it's episodes, later."""
        podcasts = get_active_podcasts(user)
        for podcast in podcasts:
            podcast.urlsafe_key = podcast.key.urlsafe()

        # We keep podcasts, marked as inactive, if user wants to remove from 
        # subscription list, but there are still episodes in playlist. This removes 
        # the ones that no longer have the episodes in the playlist.
        playlist = get_playlist(user)
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
        logging.info('PodcastPage, total load time: %.2f s' % (time.time()-start))

class PlaylistPage(webapp2.RequestHandler):
    """ Get playlist from datastore and send playlist data to Jinja to render the page"""
    def get(self):

        start = time.time()

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
        
        tail = os.path.splitext(playlist.now_playing_url)
        # logging.info('playlist page, tail: %s' % tail)
        logging.info('playlist page, tail: %s' % tail[1])
        if(tail[1] == '.mp4'):
#             playlist.now_playing_audio_url  = '#'
            playlist.now_playing_audio_url  = False
            playlist.now_playing_video_url  = playlist.now_playing_url
        elif(tail[1] == '.mp3'):
#             playlist.now_playing_video_url  = '#'
            playlist.now_playing_audio_url  = playlist.now_playing_url
            playlist.now_playing_video_url  = False
        else:
            playlist.now_playing_audio_url  = False
            playlist.now_playing_video_url  = False
        
        # logging.info('playlistpage, playlist before serving jinja %s' % playlist)
        
        template_values = {
            'navClass': {'playlist': 'ui-btn-active ui-state-persist' },
            'pageTitle': 'Playlist',
            'pageId': 'PlaylistPage',
            'playlist': playlist
        }
        template = JINJA_ENVIRONMENT.get_template('playlist.html')
        self.response.write(template.render(template_values))
        logging.info('PlaylistPage, total load time: %.2f s' % (time.time()-start))

class NewPage(webapp2.RequestHandler):
    def get(self):
        
        start = time.time()

        user = users.get_current_user()
        if not user:
            self.redirect('/signon?page=%2Fnew')
            return
        

        # New list info is initially very barebones, get more data from
        # the source, the podcast entity.        
        new_list = get_new_list(user)
        new_list = get_list_data(new_list)
        new_list.urlsafe_key = new_list.key.urlsafe()
        playlist = get_playlist(user)
        new_list.playlist_urlsafe_key = playlist.key.urlsafe()
        new_list.list_item.reverse()

        template_values = {
            'navClass': {'new': 'ui-btn-active ui-state-persist' },
            'pageId': 'NewPage',
            'pageTitle': 'New',
            'newList': new_list
        }
        template = JINJA_ENVIRONMENT.get_template('new.html')
        self.response.write(template.render(template_values))
        logging.info('NewPage, total load time: %.2f s' % (time.time()-start))

class SearchPage(webapp2.RequestHandler):
    def get(self):
        
        start = time.time()

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
        logging.info('SearcgPage, total load time: %.2f s' % (time.time()-start))

class SignOnPage(webapp2.RequestHandler):
    def get(self):
        """ Pretty much the fanciest log in page ever :) """
        
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
def retrieve_feed_info(url):

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
    info = {}         # Overall podcast info
    episode_list = []

    response = retrieve_feed_info(rss_url)
    root = ET.fromstring(response)
    
    """ May need some error checking here. """

    info['title'] = root.find('channel').find('title').text
    info['image_url'] = root.find('channel').find('image').find('url').text
    info['rss_url'] = rss_url
    
    for item in root.find('channel').findall('item'):
        length_obj  = item.find('{http://www.itunes.com/dtds/podcast-1.0.dtd}duration')
        pub_obj     = item.find('pubDate')
        
        length_str = length_obj.text if length_obj else ''
        pub_date = pub_obj.text if pub_obj else ''
        
        episode = {
            'title': item.find('title').text or '',
            'url': item.find('enclosure').get('url'),       # Required
            'pub_date': pub_date,
            'length_str': length_str,
            'current_time': 0
        }
        episode_list.append(episode)

    info['episode'] = episode_list
    
    return info

def episode_info(podcast, url, info):
    for episode in podcast.episode:
        if episode.url == url:
            return getattr(episode, info)

def dict_from_episode(podcast, episode):
    """ Returns a dictionary from an episode entity. """
    dict = {
        'podcast_title': podcast.title,
        'urlsafe_key': podcast.key.urlsafe(),
        'episode_title': episode.title,
        'episode_url': episode.url,
        'listened': episode.listened,
        'pub_date': episode.pub_date,
        # 'date_added': episode.date_added,  # returns an object not a string.
        'length_str': episode.length_str,
        'current_time': episode.current_time
    }
    
    return dict

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
        
        podcasts    = get_active_podcasts(users.get_current_user())
        urls        = [podcast.url for podcast in podcasts]
        logging.info('addpodcast, urls: %s ' % urls)
        if rss_url not in urls:
            podcast_info = get_info_from_rss(rss_url)         # to display on page
            if podcast_info:
                podcast = create_podcast_entity(podcast_info) 
                podcast_key = podcast.put()
                podcast_info['urlsafe_key'] = podcast_key.urlsafe()
            else:
                podcast_info = False
        else:
            podcast_info = False

        dump_json(self, podcast_info)                     # send info to page

# Podcast / Main page functions
def update_new_list(add):
    """ This will be displayed on New Page of Podsy. Verify it is not already in 
    the list, then create an entity and store in datastore. """
    new_list = get_new_list(users.get_current_user())
    new_episodes = [item.episode_url for item in new_list.list_item]
    
    add.reverse()       # after op: oldest to newest
    for item in add:
        logging.info('update_new_list, item %s'% item)
        # logging.info('updatenewlist, item[episode_url]: %s' % item['url'])
        # logging.info('update_new_list, new_episodes: %s', new_episodes)
        """Temp just so loop will work, remove once functionality is verified."""
        # if item['episode_url'] not in new_episodes:
        if item['episode_url'] not in new_episodes:
            # logging.info('updatenewlist, in if loop, which I should not be')
            episode = ListItem()
            episode.episode_url = item['episode_url']
            episode.podcast_key = ndb.Key(urlsafe=item['urlsafe_key'])
            new_list.list_item.append(episode)

    # logging.info('update_new_list: new_list to save to ds %s' % new_list)
    new_list.put()

def remove_episodes_from_rss(podcast, playlist, removed_episodes):
    """ Remove episodes from datastore no longer in rss feed and not in playlist."""
    delete_flag = True      # for check agains playlist
    for removed in removed_episodes:
        for episode in podcast.episode:
            if episode.url == removed['url']:
                """ Check against playlist here """
                for item in playlist.list_item:
                    if item.episode_url == removed['url']:
                        delete_flag = False
                        break
                if delete_flag:
                    podcast.episode.remove(episode)

def add_episodes_from_rss(podcast, rss_info, added_episodes):
    """ Add episodes to datastore if rss has new episodes not stored."""
    return_info = []
    
    logging.info('addepisodesfromrss, podcast.episode %s' % podcast.episode)
    logging.info('addepisodesfromrss, added_episodes %s' % added_episodes)
    
    podcast.episode.reverse()       # after op oldest to newest
    added_episodes.reverse()        # after op oldest to newest
    for added in added_episodes:
        for rss_episode in rss_info['episode']:
            if rss_episode['url'] == added['url']:
                new_episode = create_episode_entity(rss_episode)
                podcast.episode.append(new_episode)
                return_info.append(dict_from_episode(podcast, new_episode))
    # after op, these are both sorted newest to oldest
    podcast.episode.reverse()
    return_info.reverse()
    
    key = podcast.put()
    logging.info('addepisodesfromrss, key from podcast.put op: %s' % key)

    return return_info

def update_podcast_episodes(podcast, rss_info, changes):
    playlist = get_playlist(users.get_current_user())
    
    # Add and remove episodes from stored entities in datastore.
    remove_episodes_from_rss(podcast, playlist, changes['remove'])
    changes['add'] = add_episodes_from_rss(podcast, rss_info, changes['add'])

    # Update list for new page stored in datastore.
    # logging.info("updatepodcastepisode, changes['add'] %s" % changes['add'])
    update_new_list(changes['add'])
    
    # logging.info('updatepodcastepisodes, changes %s' % changes)
    return changes

def get_podcast_changes(podcast):
    
    feed_info = get_info_from_rss(podcast.url)

    add_list = []
    remove_list = []
    changes = {'add': add_list, 'remove': remove_list}

    current_episode_list = [episode.url for episode in podcast.episode]
    new_rss_episode_list = [episode['url'] for episode in feed_info['episode']]

    logging.info('refreshfeed, current episode list %s' % current_episode_list)
    logging.info('refreshfeed, new rss [] episode list %s' % new_rss_episode_list)

    for episode_url in new_rss_episode_list:        # Comparing urls to mp3 file.
        if episode_url not in current_episode_list:
            changes['add'].append({'url': episode_url})
    logging.info('getpodcastchanges, changes["add"]: %s' % changes['add'])
    # changes['add'] as is: newest to oldest
    # changes['add'].reverse();       # after op: newest to oldest

    for episode_url in current_episode_list:        # Comparing urls to mp3 file.
        if episode_url not in new_rss_episode_list:
            changes['remove'].append({'url': episode_url})

    logging.info('refreshpodcast, changes: %s' % changes)

    # Updte datastore based on changes from rss feed.
    info = update_podcast_episodes(podcast, feed_info, changes)

    return info

# Podcast / Main page classes
class RemovePodcast(webapp2.RequestHandler):
    def post(self):
        """ Remove podcast subscription from the datastore.  """
        # http://stackoverflow.com/questions/22052013/how-to-use-ajax-with-google-app-engine-python 

        # Check playlist to see if the podcast the user wants to remove is in there, if so, set inactive
        # and do not remove it. On startup of app, then check to see if any inactives are still being used
        # in playlist, if not remove podcast permanently, if still used do nothing.
        
        delete_flag = True

        urlsafe_key = self.request.get('urlsafe_key')
        key = ndb.Key(urlsafe=urlsafe_key)

        playlist = get_playlist(users.get_current_user())

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

class RefreshPodcast(webapp2.RequestHandler):
    def post(self):
        urlsafe_key = self.request.get('urlsafe_key')   # podcast key
        podcast = ndb.Key(urlsafe=urlsafe_key).get()

        info = get_podcast_changes(podcast)

        return dump_json(self, info)

class AddToPlaylist(webapp2.RequestHandler):
    def post(self):
        return_info = {};
        
        """ Add check to see if episoode is already in playlist """

        # Get values from ajax / post request
        data = self.request.params
        episode_url = data['episode_url']
        podcast_key = ndb.Key(urlsafe = data['podcast_urlsafe_key'])
        playlist_key = ndb.Key(urlsafe = data['playlist_urlsafe_key'])

        # Add item to playlist and save updated playlist to datastore
        playlist = playlist_key.get()
        
        playlist_urls = [item.episode_url for item in playlist.list_item ]
        logging.info('addtoplaylist, playlisturls: %s' % playlist_urls)
        logging.info('addtoplaylist, episode_url: %s' % episode_url)
        if episode_url not in playlist_urls:
            list_item = ListItem(episode_url=episode_url, podcast_key=podcast_key)
            playlist.list_item.append(list_item)
            playlist.put()
        
        # Since json.dumps can not serialize a datastore model, I create a custom
        # dictionary to send to the page
            podcast = podcast_key.get()
            for episode in podcast.episode:
                if episode.url == episode_url:
                    return_info = dict_from_episode(podcast, episode)
                    break
                
            logging.info('addtoplaylist, return_info: %s' % return_info)
        else:
            return_info['alreadyInList'] = True
            logging.info('episode is already in the playlist')
        dump_json(self, return_info)

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

        t = time.ctime(time.time())
        logging.info('removefromplaylist, %s,  before 5s sleep: %s' %(url, t))
        time.sleep(5)
        t = time.ctime(time.time())
        logging.info('removefromplaylist, after sleep: %s' % t)

class SavePlaybackTime(webapp2.RequestHandler):
    """ Saves current playback position to datastore. Used to retrieve on startup to resume where user stopped listening. """
    def post(self):
        
        episode_url = self.request.get('episode_url')
        urlsafe_key = self.request.get('urlsafe_key')    # podcast key
        current_time = self.request.get('current_time')
        
        logging.info('saveplaybacktime, %s, %s, %s' %(current_time, episode_url, urlsafe_key))
        
        podcast = ndb.Key(urlsafe=urlsafe_key).get()
        for episode in podcast.episode:
            if episode.url == episode_url:
                episode.current_time = int(current_time)
        
        podcast.put()
        logging.info('saveplaybacktime, podcast: %s' %(podcast))

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

# New page classes
class RefreshAllPodcasts(webapp2.RequestHandler):
    def post(self):
        
        start = time.time()
        
        logging.info('refreshallfeeds')
        podcasts = get_active_podcasts(users.get_current_user())
        all_podcasts_info = []
        
        # rss_url_list = [podcast.url for podcast in podcasts]
        # logging.info('refreshallfeeds, rss_url_list: %s' % rss_url_list )
        
        # for url in rss_url_list:
        last = start
        for podcast in podcasts:
            # changes = compare stored in datastore to rss feeds.
            info = get_podcast_changes(podcast)
            all_podcasts_info.append(info)
            # logging.info('refreshallpodcasts, infoadd: %s' % info['add'])
            update_new_list(info['add'])
            logging.info('refreshallfeeds, updatenewlist: %s' % all_podcasts_info)
            now = time.time()
            logging.info('refreshallfeeds, time since last: %s' % (now-last))
            last = now

        
        logging.info('refreshallfeeds, updatenewlist: %s' % all_podcasts_info)
        
        dump_json(self, all_podcasts_info)
        logging.info('RefreshAllFeeds, total load time: %.2f s' % (time.time()-start))

        # Get all podcasts.
        # for podcast in podcasts call refresh feed

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
