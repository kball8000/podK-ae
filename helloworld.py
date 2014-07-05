from google.appengine.api import users
import cgi
import webapp2

FORM_HTML = """\
<form action="/sign" method="post">
    <div><textarea name='content' rows="3" columns="60"></textarea></div>
    <div><input type="submit" value = "Sign Guestbook"></div>
</form>
"""

class MainPage(webapp2.RequestHandler):
    def get(self):
        self.response.headers['Content-Type'] = 'text/html'
        self.response.write('<html><body><head>')
        self.response.write('<link rel="stylesheet" href="https://dl.dropboxusercontent.com/u/4597121/podcatchor/styles/podK.css">')
        self.response.write('</head>')
        self.response.write('<h1><a href="http://kball-test-tools.appspot.com/second">Second page</a></h1>')
        self.response.write(FORM_HTML)
        self.response.write('</body></html>')

class Guestbook(webapp2.RequestHandler):
    def post(self):
        self.response.write('<html><body>You wrote<pre>')
        self.response.write(cgi.escape(self.request.get('content')))
        self.response.write('</pre></body></html>')

class SecondPage(webapp2.RequestHandler):
    def get(self):
        user = users.get_current_user()
        self.response.headers['Content-Type'] = 'text/html'
        self.response.write('<html><body><head>')
        self.response.write('<link rel="stylesheet" href="https://dl.dropboxusercontent.com/u/4597121/podcatchor/styles/podK.css">')
        self.response.write('</head>')
        if user:
            self.response.write('<h1>Hello, %s, you are logged in!</h1>' % user.nickname())
            # self.response.write('Hello, %s (<a href="%s">Sign out</a>)' % (user.nickname(), users.create_logout_url('/'))
        else:
            self.redirect(users.create_login_url(self.request.uri))
            # self.response.write('You are not logged in <a href="%s">Click here to login</a>' % users.create_login_url(self.request.uri)
        self.response.write('<a href="http://kball-test-tools.appspot.com/">Main page</a><br>')
        self.response.write('</body></html>')

app = webapp2.WSGIApplication([
    ('/', MainPage),
    ('/sign', Guestbook),
    ('/second', SecondPage),
], debug=True)