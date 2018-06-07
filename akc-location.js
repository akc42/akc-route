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
import {LitElement, html} from '@polymer/lit-element';

export class AkcLocation extends LitElement {


  static get is() { return 'akc-location';}
  static get properties() {
    return {
      useHashAsPath: Boolean,
      dwellTime: Number,
    };
  }
  constructor() {
    super();
    this.useHashPath = false;
    this.dwellTime = 2000;
    this.routeUpdateInProgress = true;
    this.urlUpdateInProgress = false;
    this._urlChanged = this._urlChanged.bind(this);
    this._routeUpdated = this._routeUpdated.bind(this);
    window.addEventListener('hashchange', this._urlChanged);
    window.addEventListener('popstate', this._urlChanged);
    window.addEventListener('location-changed',this._urlChanged);
    window.addEventListener('route-updated', this._routeUpdated);
    this.renderComplete.then(() => {
      this._urlChanged(); //set initial conditions. but after siblings are ready.
      this._lastChangedAt = window.performance.now() - (this.dwellTime - 200);
    });
  }
  _render() {
    return html``;
  }

  _urlChanged() {
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
      segment: 0,
      params: {},
      query: query,
      active: true
    };
    this.dispatchEvent(new CustomEvent('route-changed',{detail: Object.assign({},this.route)}))
  }
  async _routeUpdated(e) {
    var detail = e.detail;
    await this.renderComplete;  //force a wait to prevent loop as a result of chnage
    var newPath = this.route.path;
    if(e.detail.path !== undefined) {
      if (Number.isInteger(e.detail.segment)) {
        var newPaths = e.detail.path.split('/');
        if (newPaths[0] === '') newPaths.shift(); //ignore blank if first char of path is '/'
        var segments = this.route.path.split('/');
        if(segments.length > e.detail.segment) segments.length = e.detail.segment + 1; //truncate to just before path
        segments = segments.concat(newPaths);
        newPath = segments.join('/');
      } else {
        throw new Error('Invalid segment info in route-updated event');
      }
    }
    var query = Object.assign({}, this.route.query);
    if (e.detail.query !== undefined) {
      query = e.detail.query;
    }
    var newUrl;
    if (this.useHashAsPath) {
      newUrl = window.location.pathname;
    } else {
      newUrl = window.encodeURI(newPath).replace(/\#/g, '%23').replace(/\?/g, '%3F');
    }
    if (Object.keys(query).length > 0) {
      newUrl += '?' + this._encodeParams(query)
      .replace(/%3F/g, '?')
      .replace(/%2F/g, '/')
      .replace(/'/g, '%27')
      .replace(/\#/g, '%23')
      ;

    }
    if (this.useHashAsPath) {
      newUrl += '#' + window.encodeURI(newPath);
    } else {
      newUrl += window.location.hash;
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
      this._urlChanged();
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
