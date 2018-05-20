/**
@licence
    Copyright (c) 2016 Alan Chandler, all rights reserved

    Permission is hereby granted, free of charge, to any person obtaining
    a copy of this software and associated documentation files (the
    "Software"), to deal in the Software without restriction, including
    without limitation the rights to use, copy, modify, merge, publish,
    distribute, sublicense, and/or sell copies of the Software, and to
    permit persons to whom the Software is furnished to do so, subject to
    the following conditions:

    The above copyright notice and this permission notice shall be
    included in all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
    EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
    MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
    NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
    LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
    OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
    WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
/**
`akc-location`
A distributed router inspired by PolymerElements/app-route
Unfortunately There are design decisions that I am finding means it makes it too complicated
to use.  This is my attempt to provide equivalent functionality but in a slightly different way.

`akc-location` is the element that provides the interface with the browser address bar, converting
this to and from a `route` object that can be passed fown a chain of such object and consumed by
`akc-route`

@demo demo/index.html
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import { afterNextRender } from '@polymer/polymer/lib/utils/render-status.js';

export class AkcLocation extends PolymerElement {


  static get is() { return 'akc-location';}
  static get properties() {
    return {
      /**
      * the route property contains the following fields.
      *
      *  * `prefix` for `<akc-location>` this will always be the empty string, but further down
      *     the chain of `<akc-route>` elements it will show the amount of url consumed so far.
      *  * `path` shows the url path that has not yet been consumed
      *  * `active` a boolean that indicates whether the path so far has been matched. For
      *     `<akc-location>` this will be true once the first route has initialised
      *  * `params` further down the `<akc-route>` chain the `out-route.params`. property will
      *     contain an object of the matched parameters from the route. For this element it
      *     will always contain the empty object (ie {});
      *  * `query` will contain an object representation of the search parameters from the url.
      *
      *  Note - changes are atomic.  That is if the url changes, all of the above properties of
      *  the `route` object will set before any observer on the object or one of its properties
      *  sees a change.
      * @type(object)
      */
      route: {
        type: Object,
        value: function() {return { path: '', active: false, params: {}, query: {}};},
        notify: true
      },
      /**
      * In many scenarios, it is convenient to treat the `hash` as a stand-in
      * alternative to the `path`. For example, if deploying an app to a static
      * web server (e.g., Github Pages) - where one does not have control over
      * server-side routing - it is usually a better experience to use the hash
      * to represent paths through one's app.
      *
      * When this property is set to true, the `hash` will be used in place of

      * the `path` for generating a `route`.
      * @type(boolean)
      */
      useHashAsPath: {
        type: Boolean,
        value: false
      },
      /**
      * If the user was on a URL for less than `dwellTime` milliseconds, it
      * won't be added to the browser's history, but instead will be replaced
      * by the next entry.
      *
      * This is to prevent large numbers of entries from clogging up the user's
      * browser history. Disable by setting to a negative number.
      * @type(number)
      */
      dwellTime: {
        type: Number,
        value: 2000
      }

    };
  }
  static get observers() {
    return [
      '_routeChanged(route.path,route.query)'
    ];
  }
  connectedCallback() {
    super.connectedCallback();
    this._ensureAttribute('hidden', true);
    this.routeUpdateInProgress = false;
    this.urlUpdateInProgress = false;
    this._urlChanged = this._urlChanged.bind(this);
    window.addEventListener('hashchange', this._urlChanged);
    window.addEventListener('popstate', this._urlChanged);
    window.addEventListener('location-changed',this._urlChanged);
     afterNextRender(this, function() {
      this._urlChanged(); //set initial conditions. but after siblings are ready.
      this._lastChangedAt = window.performance.now() - (this.dwellTime - 200);
    });
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('location-changed',this._urlChanged);
    window.removeEventListener('popstate', this._urlChanged);
    window.removeEventListener('hashchange', this._urlChanged);
  }
  _urlChanged() {
    if (!this.urlUpdateInProgress) {
      var hash = window.decodeURIComponent(window.location.hash.substring(1));
      var path = window.decodeURIComponent(window.location.pathname);
      var query = this._decodeParams(window.location.search.substring(1));
      if (this.route &&
        this.route.path === (this.useHashAsPath ? hash : path) &&
        this.route.query === query) {
        return;
      }
      this._lastChangeAt = window.performance.now()
      this.routeUpdateInProgress = true
      this.route = {
        path: (this.useHashAsPath ? hash : path),
        params: {},
        query: query,
        active: true
      };
      this.routeUpdateInProgress = false;
    }
  }
  _routeChanged(path, query) {
    if (this.routeUpdateInProgress === undefined) {
      return; //don't want to do anything until we are established
    }
    if (!this.routeUpdateInProgress) {
      this.urlUpdateInProgress = true;
      var newUrl;
      if (this.useHashAsPath) {
        newUrl = window.location.pathname
      } else {
        newUrl = window.encodeURI(path).replace(/\#/g, '%23').replace(/\?/g, '%3F');
      }
      if (query && Object.keys(query).length > 0) {
        newUrl += '?' + this._encodeParams(query)
        .replace(/%3F/g, '?')
        .replace(/%2F/g, '/')
        .replace(/'/g, '%27')
        .replace(/\#/g, '%23')
        ;

      }
      if (this.useHashAsPath) {
        newUrl += '#' + window.encodeURI(path);
      } else {
        newUrl += window.location.hash
      }
      // Tidy up if base tag in header
      newUrl = new URL(newUrl, window.location.protocol + '//' + window.location.host).href
      if (newUrl !== window.location.href) { //has it changed?
        var now = window.performance.now();
        if (this._lastChangedAt + this.dwellTime > now) {
          window.history.replaceState({}, '', newUrl);
        } else {
          window.history.pushState({}, '', newUrl);
        }
        this._lastChangedAt = now;
      }
      this.urlUpdateInProgress = false;
    }
  }
  _encodeParams(params) {
    var encodedParams = [];

    for (var key in params) {
      var value = params[key];

      if (value === '') {
        encodedParams.push(encodeURIComponent(key));

      } else if (value) {
        encodedParams.push(
            encodeURIComponent(key) + '=' +
            encodeURIComponent(value.toString()));
      }
    }
    return encodedParams.join('&');
  }
  _decodeParams(paramString) {
    var params = {};
    // Work around a bug in decodeURIComponent where + is not
    // converted to spaces:
    paramString = (paramString || '').replace(/\+/g, '%20');
    var paramList = paramString.split('&');
    for (var i = 0; i < paramList.length; i++) {
      var param = paramList[i].split('=');
      if (param[0]) {
        params[decodeURIComponent(param[0])] =
            decodeURIComponent(param[1] || '');
      }
    }
    return params;
  }

}
customElements.define(AkcLocation.is, AkcLocation);
