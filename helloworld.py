from google.appengine.api import users
import webapp2

class MainPage(webapp2.RequestHandler):
    def get(self):
        self.response.headers['Content-Type'] = 'text/html'
        self.response.write('<html><body><head>')
        self.response.write('<link rel="stylesheet" href="https://dl.dropboxusercontent.com/u/4597121/podcatchor/styles/podK.css">')
        self.response.write('</head>')
        self.response.write('<h1>Header should be blue</h1>')
        self.response.write('<a href="http://kball-test-tools.appspot.com/second">Second page</a>')
        self.response.write('</body></html>')

class SecondPage(webapp2.RequestHandler):
    def get(self):
        # user = users.get_current_user()
        self.response.headers['Content-Type'] = 'text/html'
        # if user:
            # self.response.write('Hello, ' + (user.nickname())
            # self.response.write('Hello, %s (<a href="%s">Sign out</a>)' % (user.get_nickname(), users.create_logout_url('/'))
        # else:
            # self.response.write('User is not logged in to google')
            # self.response.write('<a href="%s">Click here to login</a>' %s users.create_login_url(self.request.uri)
        self.response.write('Page 2!<br>')
        self.response.write('<p>any errors</p>')
        self.response.write('<a href="http://kball-test-tools.appspot.com/">Main page</a><br>')

app = webapp2.WSGIApplication([
    (r'/', MainPage),
    (r'/second', SecondPage),
], debug=True)