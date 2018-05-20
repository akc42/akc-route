/**
@license
    Copyright (c) 2016-2017 Alan Chandler, all rights reserved

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
`akc-route`
A distributed router inspired by PolymerElements/app-route
Unfortunately There are design decisions that I am finding means it makes it too complicated
to use.  This is my attempt to provide equivalent functionality but in a slightly different way.

@demo demo/index.html
*/

//import '../@polymer/polymer/polymer-legacy.js';

import { PolymerElement } from '@polymer/polymer/polymer-element.js';
export class AkcRoute extends PolymerElement { 

  static get is() {return 'akc-route';}
  static get properties() { 
    return {
     /*
      * `inRoute` is a receiving route from either `akc-location` or the `outRoute` of another
      * `akc-route` element. I contains all the data that is needed to be conveyed about the
      *  route.  It has been chosen to be a single object because it can be assigned as a whole
      */
      inRoute: {
        type: Object,
        notify:true
      },
     /**
      * `ifMatched` is a string which should be composed of two parts separated by a ':'
      *  The first part is the name of a property in `inRoute.params` which should be checked
      *  and the second part is a string it should be matched against (note a string which is
      *  all digits will be considered numeric).  Unless the string marches this route will not
      *  match.  If this `ifMatched` string is of zero length then it acts as though it had
      *  matched a parameter
      */
      ifMatched: {
        type: String,
        value: ''
      },
     /*
      * `match` is a pattern that is used as match against incoming route.  It will be only
      * attempted if the incoming `irRoute` is active.
      *
      * It consists of a
      * string which '/' separated segments which define how a portion of the url that has been
      * passed down by the `irRoute` parameter may be matched.  The leading '/' is optional, a
      * final '/' is significant in that it means this matcher only matches if the entire
      * pattern consumes the remainder of the url
      *
      * Each segment consists of either a string to match directly, or a string starting with
      * ':' (which means a named parameter - which then maps whatever the url segment at this
      * point).
      */
      match: {
        type: String,
        value: ''
      },
     /*
      * `outRoute` takes an `inRoute` ant attempts to apply the matcher.  If the matcher matches
      * and any of the matcher segments are parameters, thes will be added to the outroute under
      * the `params`.  Provided the `inRoute` has its `active flag set and regardless of if
      * there are any parameters, if the matcher matched, out-route will have a boolean `active`
      * flag set to true.
      */
      outRoute: {
        type: Object,
        value: function() {return {path: '', active: false, params: {}, query: {}};},
        notify: true
      }
    }
  }
  static get observers() {
    return [
      '_inRouteChanged(ifMatched, match, inRoute.*)',
      '_outRouteChanged(outRoute.*)'
    ];
  }
  constructor() {
    super()
  }
  connectedCallback() {
    super.connectedCallback();
    this.outRouteUpdateInProgress = false;
  }
  _inRouteChanged (ifMatched, match, changes) {
    if (changes.base === undefined) return;
    if (changes.base.active && this._ifMatches(ifMatched) && changes.base.path.length > 0) {
      var completed = false;
      if (match.slice(-1)  === '/') {
        completed = true;  //Special meaning
        if (match.length > 1) {
          match = match.slice(0,-1);
        }
      }
      var matchedPieces = match.split('/');
      if (matchedPieces[0] === '') {
        matchedPieces.shift();  //not interested in blank front
      }
      var urlPieces = changes.base.path.split('/');
      if (urlPieces.length < 2 || urlPieces[0] !== '') {
        //something is wrong with path as it should have started with a '/'
        console.warn('akc-route invalid path in inRoute');
        this.set('inRoute.active', false); //make invalid
        return;
      }

      urlPieces.shift();
      var j = urlPieces.length
      var newRoute = {
        params: {},
        active: true,
        query: changes.base.query
      };
      for(var i = 0; i < matchedPieces.length; i++) {
        if (j <= 0)  {
          this._clearOutActive();
          return;
        }
        var segment = urlPieces.shift();
        j--;
        if (matchedPieces[i].length !== 0) {
          if (matchedPieces[i].substring(0,1) === ':') {
            var key = matchedPieces[i].substring(1);
            if (key.length > 0) {
              if (/^-?\d+$/.test(segment)) {
                segment = parseInt(segment,10);
              }
              newRoute.params[key] = segment;
            } else {
              console.warn('akc-route match pattern missing parameter name');
            }
          } else if (matchedPieces[i] !== segment) {
            this._clearOutActive();
            return;
          }
        } else if (segment.length > 0 ){
          this._clearOutActive();
          return
        }
      }
      if (completed || changes.base.path === '/' ) {
        newRoute.path = ''
      } else if (j == 0) {
        newRoute.path = '/';
      } else {
        newRoute.path = '/' + urlPieces.join('/');
      }
      if (!this.outRoute || !this.outRoute.active ||
        JSON.stringify(this.outRoute.params) !== JSON.stringify(newRoute.params) ||
        JSON.stringify(this.outRoute.query) !== JSON.stringify(newRoute.query)) {

        this.set('outRoute', newRoute);
      } else if (this.outRoute.path !== newRoute.path) {
        this.set('outRoute.path', newRoute.path);
      }
    } else {
      this._clearOutActive();
    }

  }
  _outRouteChanged (changes) {
    if (this.inRoute === undefined || changes.base === undefined) return;
    if (this._ifMatches(this.ifMatched)) {
      var path = '' ;//calculate what path should be
      var matchedPieces = this.match.split('/');
      if (matchedPieces[0] === '') {
        matchedPieces.shift();  //not interested in blank front
      }
      for(var i = 0; i < matchedPieces.length; i++) {
        if (matchedPieces[i].length !== 0) {
          if (matchedPieces[i].substring(0,1) === ':') {
            var key = matchedPieces[i].substring(1);
            if (changes.base.params[key] != null && changes.base.params[key] !== '') {
              path += '/' + changes.base.params[key].toString();
            } else {
              if (!changes.base.active) {
                return;  //We can't update a none active route if its not going to become active'
              }
              break;
            }
          } else {
            if (!changes.base.active) {
              return;  //Unless we matched before, or we are forcing a new route we can't continue (by forcing active)'
            }
            path += '/' + matchedPieces[i];
          }
        }
      }
      if (path.length > 1 && changes.base.active && changes.base.path.length > 1 ) {
        path += changes.base.path; //only do this if the outpath was really there
      }
      if (path.length === 0) {
        path = '/'
      }
      //don't update upwards if we are not changing anything.
      if (path !== this.inRoute.path || (changes.base.active && changes.base.query !== this.inRoute.query)) {
        if (changes.base.active && changes.base.query !== this.inRoute.query) {
          //query changed and we are active so propagate it
          var newRoute = {
            path: path,
            active: true,
            params: this.inRoute.params,
            query: changes.base.query
          };
          this.set('inRoute', newRoute);
        } else {
          this.set('inRoute.path', path); //This should go back and setup outRoute query
        }
      }
    }
  }
  _ifMatches (ifString) {
    if (ifString.length === 0) {
      return true;  //Empty String always matches
    }
    var matcher = ifString.split(':');
    if (matcher.length !== 2) {
      console.warn('Invalid ifMatched String');
      return true
    } else {
      if (this.inRoute.params[matcher[0]] !== undefined &&
        this.inRoute.params[matcher[0]] === matcher[1]) {
        return true;
      }
      return false;
    }
  }
  _clearOutActive () {
    this.set('outRoute.active', false);
  }
}

customElements.define(AkcRoute.is,AkcRoute);
