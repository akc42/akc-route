# \<akc-route\>

**NOTE AS OF June 2020, this package is no longer in user. and is not being maintained.  There are now critical security vunerability is wct-browser-legacy package which is used in testing.  I have removed it, but not replaced it with anything

**NOTE This version of the router is designed to work with LitElement,  Since the previous version using Polymer 3 is still very much in use and has been published to npm as @AKC42/akc-route a formal release and publishing is unlikely to happen for a while if at all (as this version will be integrated directly into my application as though the two elements were bespoke for the application).  I provide it here so it may be forked and used by anyone interested.** 

A distributed router inspired by PolymerElements/app-route

## Introduction

I am partway through a large project using Polymer to redevelop a Microsoft Access application to run as a Single Page web application.  I want to expose
URLs to the user, so that they can represent points in the application which can be handed to other users.  This requires a client side router.

I had several attempts at this, starting with two centralised solutions.  But eventually I started to use the Polymer teams `<app-route>` element (coupled with `<app-location>`) to provide routing.  The distributed nature of this was absolutely the right approach, and I continued to work with it.

However, the more I have worked with it in detail the more it has exposed what I initially regarded as bugs. In particular, relying on a transition of a variable to cause an action after a url change is essential - but when it happens and some of the related variables in the application have not yet changed this sophisticated routing starts to break down. I have been working through each of these cases and supplying a fix back to the `<app-route>` team.

However the last of these made me question the fundementals of how 
`<app-route>` works.  What is really needed is that all changes to routing take place as one atomic action.  By separately exposing properties `route`, `data`, `active` and `query-params`  this is impossible.

So `<akc-route>` and its accompanying `<akc-location>` is a rewrite of this `<app-route>` components to provide a single object property which will describe completely the distributed route at the point it is used in the application and to guarentee that any change to the property will be made in such a way that all related changes will be made at the same time.

This version has been updated to use the lighter weight `lit-element` with its unidirectional data flow principals - this results in some changes to the interface, noteably that the previous `outRoute` property is now expressed as an custom event `route-changed` with a `route` object as the `detail` parameter of the event, and the `inRoute` property is now just expressed as a `route` property. The idea is that a containing element will listen to this event and use it to update its own property that it is feeding into the next `<akc-route>` down the chain.

The other change is that it was possible in the previous version for the application to change the `outRoute` property and that provided that `outRoute` was active for the change to propagate up the chain to eventually change the address bar. To maintain the principals of unidirectional dataflow, the `route` object will contain a `segment` parameter which defines how many segments have been consumed up to, but not including the `path` parameter. The `<akc route>` class will have a two public setters for virtual instance properties `params` and `query` which can be set by the application. Internally this will be mapped to a `route-updated` event on the windows object.  
 The`<akc-location>` object will listen for this event and update the url and re-propagate the route object derived from it.

## `<akc-location>` element

The top of the routing chain is an element which is responsible for interacting with the address bar in the brower.  This provides a two way linkage between the address bar and  `detail` property of a `route-changed` custom event.


the `route` property contains the following fields.

* `path` shows the url path that has not yet been consumed.  For this element it will always be the entire url (excluding query and )
* `segment` is a numeric value that defines how many url segments have been consumed before the passed in path. For this element the value will always be 0.
* `active` a boolean that indicates whether the path so far has been matched. For `<akc-location>` this always will be true after the app has fully initialised.
* `params` further down the `<akc-route>` chain the `params`. property will contain an object of the matched parameters from the route. For this element the custom events `detail.params` it will always contain the empty object (ie `{}`);
* `query` will contain an object representation of the search parameters from the url.

Note - changes are atomic.  That is if the url changes, all of the above properties of a new `route` object will set before the `route-change` event is dispatched containing it.

`<akc-location>` will respond to an `location-changed` event and re-read the url. It will also respond to a `route-updated` event generated by one of the `<akc-route>` object and from that reconstruct the url. This is then added to the `windows.history` using the `pushState` function, and a `location-changed` event simulated.

Two properties can be optionally provided to `akc-location`.  These are:-
* `useHashAsPath` if present this property signifies that `<akc-location` should only use hash paths part of the url
* `dwellTime` a millisecond timer which if the url changes within that time from the previous change this change is replaced on the history stack rather than pushing a new entry. If not provided a 2000 millisecond (ie 2 seconds) time is used  

## `<akc-route>` element

This element provides a matcher to segments of a url.  It is designed to exist in a chain with other `<akc-route>` elements, each one taking in a `route` object on its `route` property consuming part of the url and exposing a different `route` object in a non-bubbling `route-change` event which it dispatches on itself. Two other properties define how this transformation is to take place:-
* `ifMatched` is a optional preview switch which is a string consisting of a pair of strings seperated by a `':'`.  If `ifMatched` is present then the string to the left of the colon represents a parameter name and the string to the right a value.  If that parameter is present in incoming route **and** has the value given, that matching can proceed (see the `match` property).  If it doesn't match then no matching will take place and the `active` property of the the `route` object in a will be set to `false`. If that means the value o this `route` object is different to the value it had the last time it was notified, then a new `route-change` event is generated. If `ifMatched` is not present or an empty string, then this element will act as though `ifMatched` matched.
* `match` is a string property which consists of a `'/'` seperated list of `segments` matching eqivalent `'/'` seperated segments of a url.  The initial `'/'` is manditory and will cause a warning to be given if not present since an initial `'/'` in the path that this `<akc-route>` is trying to match will nearly always be present (**even** if the previous `<akc-route>` in the chain consumed the remainder of the url and only **unless** the previous `<akc-route>`'s' `match` parameter contains a trailing `'/'`).  A trailing `'/'` in the `match` property means **only** match if the entire url is consumed by this element. If the property is missing all together then it is assumed to contain a single '/'.  See below for how that is interpreted

When the `route` property changes an `<akc-route>` element processes the changes by looking at the `path` portion of the route and seeing if it can match it with the `match` property. Subject to `route`'s `active` property being `true`  and subject to possible the pre-check defined by a `ifMatched` property, if this match succeeds the `route-changed` event is fired which contain an adjusted copy of `route` as its `detail`. The **only** change to the `detail` if the match doesn't succeed is its `active` property will be set `false`. However the `route-change` event will only be fired if the previous time it was fired the `detail` object contained an `active` propert of `true`.

The `match` consumes part of the url based on the number of segments it has and how may segments are provided in the `path` property of `route`. Each segment of the `match` string can either be a literal string that is being matched in the url, or if it starts with a ':' character means it is a parameters which will be extracted from the url and placed within the `params` property of the `route-changed` events `detail`.  An empty literal segment will only match an empty segment, a parameterised segment will match any string of characters up to the next '/' (or end of string) including the empty string. 

Each matched segment where the `match` property defines a parameter will be added to the `params` property of the `route-changed` events `detail` object with the key defined by the `match` property name. If the matched portion of the url consists solely of the digits "0" to "9" with an optional leading "-" (they will be in string form) the paramater will be converted to an integer before being placed in the `params` property.  

As a route matches as described above the part of the url matched is removed from the `path` part of the url in the events `detail`. The main point to be made is that the removed part is  **before** a slash. **If** the last match was the end of the url, **and** `route.path` was not already just a '/' **and** the `match` property did not end in a traling slash (or was a single '/' all on its own) then the `detail.path` becomes a single '/'

This element has two additional 'properties' which are write only.  Writes will only happen if the `route.active` property is true, the `ifMatched` check had previously suceeded on the `route` and any literal parameters in the `match` string had matched. Subject to those conditions the writes to each property cause the actions described below to occur:-
* `params` will check for corresponding segments in the parameters section of the `match` string to the keys in new `params` value.  Provided all of the keys in `params` has a corresponding parameter in the `match` string then a `route-updated` event will be dispatched on the windows object which the `<akc-location>` element can listen for.  The event `detail` will contain the `segment` index and a revised `path`. 
* `query` will perform the samve validity check as `params` above and generate a `route-updated` event with the `detail` containing this `query` object.

## Rationale for this approach

As defined in the introduction this pair of elements was inspired by the work done by the Polymer team to produce the `<app-route>` and associated elements.  However, I felt that this approach was too locked in to the legacy interface to be able to deal with the issues as I saw the in relation to having all the values of a `route` in place at the next state after a url change before any observers on that `route` can fire.  The remainder of the differences are related to lessons learned along the way.

Consider the following set of urls

```
/
/appointments
/appointents/5/0
/appointments/5/-1
/appointments/5/3456/20161001
/reports
/reports/bydate/20160101/20160630
```

and an application structure at the top level somthing like the following

```
<akc-location on-route-changed="${(e) => this.route = e.detail}"></akc-location>
<akc-route
  route="${route}"
  match="/:page"
  on-route-changed="${(e) => this.subRoute = e.detail}"></akc-route>
<iron-pages selected="${page}" attr-for-selected="name">
  <main-menu name="menu"></main-menu>
  <appointment-management name="appointments" route="${subRoute}"></appointment-management>
  <my-reports name="reports" route="${subRoute}"></my-reports>
</iron-pages>
```

The first objective is to use different url's to switch pages. In the above scenario we need an observer on the combination of `subRoute.active` and `subRoute.params.page`. we can check for `subRoute.active` being `true` and  `subRoute.params.page` being `''` in order to set `page` to `'menu'`. At the top level this structure is fine, but at levels down (for instance in the `<my-reports>` element the exact same structure will be needed to match a menu at url /reports and a date reporting element at /reports/bydate ).  This is the reason for propagating one time a trailing `'/'`).

The reason for `ifMatched` is to provide support for the case where an `<akc-route>` element inside one of the two elements above (`appointment-management` and `my-reports`) can differenciate between a change meant for them or a change meant for the other url.  For instance the change from 0 to -1 in the third segment of the url could be related to change related to reports or a change related to appointments.  By using `ifMached` on the `<akc-route>` element inside either `<appointment-management>` or inside `<my-reports>`  It can be sure its meant for them.
