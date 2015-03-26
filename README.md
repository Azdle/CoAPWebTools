# CoAP Webtools

This is a collection of web-based tools (and the required servers) for doing
development with the Constrained Application Protocol.

# Configuration

You'll need to add the domain name (or the ip) and port number, in the form of a
regular expression, of the server you'd like to proxy to into the whitelist
before it will let you proxy to that server.

You'll also want to then update the webdatagram.js file with the uri of your
websocet server.

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
