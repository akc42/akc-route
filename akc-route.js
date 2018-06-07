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

import {LitElement, html} from '@polymer/lit-element';

export class AkcRoute extends LitElement { 

  static get is() {return 'akc-route';}
  static get properties() { 
    return {
      route: Object,
      ifMatched: String,
      match: String
    };
  }
  constructor() {
    super();
    this.ifMatched = '';
    this.match = '';
    this.route = {
      active: false,
      path: '',
      segment: 0,
      params: {},
      query: {}
    }
    this.outRoute = {
      active: false,
      path: '',
      segment: 0,
      params: {},
      query: []
    }
  }
  _render (props) {
    if (props.route.active && this._ifMatches(props.ifMatched) && props.route.path.length > 0) {
      if (props.match.length > 0) {
        var completed = false;
        if (props.match.slice(-1)  === '/') {
          completed = true;  //Special meaning
          if (props.match.length > 1) {
            props.match = props.match.slice(0,-1);
          }
        }
        var matchedPieces = props.match.split('/');
        if (matchedPieces[0] === '') {
          matchedPieces.shift();  //not interested in blank front
        }
        var urlPieces = props.route.path.split('/');
        if (urlPieces.length < 2 || urlPieces[0] !== '') {
          //something is wrong with path as it should have started with a '/'
          this.route.active = false;
          throw new Error('akc-route: Invalid path (should start with /) in route');
        }

        urlPieces.shift();
        var j = urlPieces.length
        var newRoute = {
          segment: props.route.segment + matchedPieces.length,
          params: {},
          active: true,
          query: props.route.query
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
                throw new Error('akc-route: Match pattern missing parameter name');
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
        if (completed || props.route.path === '/' ) {
          newRoute.path = ''
        } else if (j == 0) {
          newRoute.path = '/';
        } else {
          newRoute.path = '/' + urlPieces.join('/');
        }
        if (!this.outRoute || !this.outRoute.active ||
          JSON.stringify(this.outRoute.params) !== JSON.stringify(newRoute.params) ||
          JSON.stringify(this.outRoute.query) !== JSON.stringify(newRoute.query) ||
          this.outRoute.path !== newRoute.path || this.outRoute.segment !== newRoute.segment) {
          this.outRoute =  newRoute;
          this.dispatchEvent(new CustomEvent('route-changed', {detail:this.outRoute}));
        }     
      } else {
        throw new Error('akc-route: Match string required');
      }
    } else {
      this._clearOutActive();
    }
  }
  set params(value) {
    if (this.outRoute.active) {
      var match = this.match;
      if (this.match.slice(-1)  === '/' && this.match.length > 1) match = this.match.slice(0,-1);
      var matchedPieces = match.split('/');
      if (matchedPieces[0] === '') {
        matchedPieces.shift();  //not interested in blank front
      }
      var urlPieces = this.route.path.split('/');
      urlPieces.shift();  //loose blank front
      for (var i = 0; i < matchedPieces.length; i++) {
        if (urlPieces.length < i) urlPieces.push(''); //ensure there is a url segment for this match
        if (matchedPieces[i].length !== 0) {
          if (matchedPieces[i].substring(0,1) === ':') {
            var key = matchedPieces[i].substring(1);
            if (value[key] !== undefined) {
              if (Number.isInteger(value[key])) {
                urlPieces[i] = value[key].toString();
              } else if (typeof value[key] === 'string') {
                if (value[key].length > 0) {
                  urlPieces[i] = value[key];
                } else {
                  //terminate url here
                  urlPieces.length = i;
                  break;
                }
              } else if (value[key] === null) {
                //terminate url here
                urlPieces.length = i;
                break;                
              } else {
                throw new Error('akc: Invalid params.' + key + ' provided (should be a String or an Integer)');
              }
            }
          }
        }
      }
      window.dispatchEvent(new CustomEvent('route-updated',{ 
        detail: {
          segment: this.route.segment,
          path: '/' + urlPieces.join('/')
        }
      }));
    }
  }
  set query(value) {
    if (this.outRoute.active) {
      window.dispatchEvent(new CustomEvent('route-updated',{
        detail: {
          query: value
        }
      }));
    }
  }
  _ifMatches (ifString) {
    if (ifString.length === 0) {
      return true;  //Empty String always matches
    }
    var matcher = ifString.split(':');
    if (matcher.length !== 2) {
      throw new Error('Invalid ifMatched String');
    } else {
      if (this.route.params[matcher[0]] !== undefined &&
        this.route.params[matcher[0]] === matcher[1]) {
        return true;
      }
      return false;
    }
  }
  _clearOutActive () {
    if (this.outRoute.active) {
      this.outRoute.active = false;
      this.dispatchEvent(new CustomEvent('route-changed',{detail: this.outRoute}));
    }
  }
}

customElements.define(AkcRoute.is,AkcRoute);
