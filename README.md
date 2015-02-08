# WebDatagramProtocol

This is a simple node.js server that will proxy binary websocket requests
straight through to UDP.

# Configuration

You'll need to add the domain name (or the ip) and port number, in the form of a
regular expression, of the server you'd like to proxy to into the whitelist
before it will let you proxy to that server.

# Running Locally

``` bash
npm install
npm start
```

# Running on Heroku

``` bash
heroku create
git push heroku master
heroku open
```
