import webapp2

class MainPage(webapp2.RequestHandler):
    def get(self):
        self.response.headers['Content-Type'] = 'text/plain'
        self.response.write('Hello, World!<br>')
        self.response.write('Two!')

class SecondPage(webapp2.RequestHandler):
    def get(self):
        self.response.headers['Content-Type'] = 'text/plain'
        self.response.write('Hello, World!')
        self.response.write('Page 2!<br>')
        self.response.write('any errors')

application = webapp2.WSGIApplication([
    ('/', MainPage),
    ('/second', SecondPage),
], debug=True)