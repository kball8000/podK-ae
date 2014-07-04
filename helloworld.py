import webapp2

class MainPage(webapp2.RequestHandler):
    def get(self):
        self.response.headers['Content-Type'] = 'text/html'
        self.response.write('Hello, World!<br>')
        self.response.write('Two!')

class SecondPage(webapp2.RequestHandler):
    def get(self):
        self.response.headers['Content-Type'] = 'text/html'
        self.response.write('Hello, World!')
        self.response.write('Page 2!<br>')
        self.response.write('<p>any errors</p>')

app = webapp2.WSGIApplication([
    (r'/', MainPage),
    (r'/second', SecondPage),
], debug=True)