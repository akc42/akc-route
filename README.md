# \<akc-route\>

A distributed router inspired by PolymerElements/app-route

## Introduction

I am partway through a large project using Polymer to redevelop a Microsoft Access application to run as a Single Page web application.  I want to expose
URLs to the user, so that they can represent points in the application which can be handed to other users.  This requires a client side router.

I had several attempts at this, starting with two centralised solutions.  But eventually I started to use the Polymer teams `<app-route>` element (coupled with `<app-location>`) to provide routing.  The distributed nature of this was absolutely the right approach, and I continued to work with it.

However, the more I have worked with it in detail the more it has exposed what I initially regarded as bugs. In particular, relying on a transition of a variable to cause an action after a url change is essential - but when it happens and some of the related variables in the application have not yet changed this sophisticated routing starts to break down. I have been working through each of these cases and supplying a fix back to the `<app-route>` team.

However the last of these made me question the fundementals of how 
`<app-route>` works.  What is really needed is that all changes to routing take place as one atomic action.  By separately exposing properties `route`, `data`, `active` and `query-params`  this is impossible.

So `akc-route` and its accompanying `akc-location` is a rewrite of this `<app-route>` components to provide a single object property which will describe completely the distributed route at the point it is used in the application and to guarentee that any change to the property will be made in such a way that all related changes will be made at the same time.

## `<akc-location>` element

The top of the routing chain is an element which is responsible for interacting with thr address bar in the brower.  This provides a two way linkage between the address bar and a `route` property which it exposes.

the route property contains the following fields.

* `path` shows the url path that has not yet been consumed
* `active` a boolean that indicates whether the path so far has been matched. For `<akc-location>` this always will be true after the app has fully initialised.
* `params` further down the `<akc-route>` chain the `out-route.params`. property will contain an object of the matched parameters from the route. For this element it will always contain the empty object (ie {});
* `query` will contain an object representation of the search parameters from the url.

Note - changes are atomic.  That is if the url changes, all of the above properties of the `route` object will set before any observer on the object or one of its properties sees a change.

`<akc-location>` will respond to an `akc-location` event and re-read the url. It will also fire this event just after it has updated `route` or the address bar

Three input properties (ie they are not notified) can be given to `akc-location`.  These are:-
* `useHashAsPath` if present this property signifies that `<akc-location` should only use hash paths part of the url
* `urlSpaceRegex` can be used to tell the router to capture clicks for urls that match the regex and apply routing for them. Note, this is just a pass through to `<iron-location>`
* `dwellTime` a timer which if the url changes within that time from the previous change this change is replaced on the history stack rather than pushing a new entry. 

## `<akc-route>` element

This element provides a matcher to segments of a url.  It is designed to exist in a chain with other `<akc-route>` elements, each one taking in a `route` object on its `inRoute` property consuming part of the url and exposing a different `route` object on an `outRoute` property. Two other properties define how this transformation is to take place:-
* `ifMatched` is a optional preview switch which is a string consisting of a pair of strings seperated by a `':'`.  If `ifMatched` is present then the string to the left of the colon represents a parameter name and the string to the right a value.  If that parameter is present in incoming route **and** has the value given, that matching con proceed (see next property).  If it doesn't match then no matching will take place and the `outRoute.active` value will be set to `false`. If `ifMatched` is not present or an empty string, then this element will act as though `ifMatched` matched.
* `match` is a string property which consists of a `'/'` seperated list of `segments` matching eqivalent `'/'` seperated segments of a url.  The initial `'/'` is manditory and will cause a warning to be given if not present since an initial `'/'` in the path that this `<akc-route>` is trying to match will nearly always be present (**even** if the previous `<akc-route>` in the chain consumed the remainder of the url and only **unless** the previous `<akc-route>`'s' `match` parameter contains a trailing `'/'`).  A trailing `'/'` in the `match` property means **only** match if the entire url is consumed by this element. If the property is missing all together then it is assumed to contain a single '/'.  See below for how that is interpreted

When `inRoute` changes an `<akc-route>` element processes the changes by looking at the `path` portion of the route and seeing if it can match it with the `match` property. Subject to `inRoute`'s `active` property being `true`  and subject to possible the pre-check defined by a `ifMatched` property, if this match succeeds the `outRoute` property which contain an adjusted copy of `inRoute`. The **only** change to `outRoute` if the match doesn't succeed is its `active` property will be set `false` if it wasn't already set so.

The `match` consumes part of the url based on the number of segments it has and how may segments are provided in the `path` property of `inRoute`. Each segment can either be a literal string that is being matched in the url, or if it starts with a ':' character means it is a parameters which will be extracted from the url and placed within the `params` property of the `outRoute`.  An empty literal segment will only match an empty segment, a parameterised segment will match any string of characters up to the next '/' (or end of string) including the empty string. 

Each matched segment where the `match` property defines a parameter will be added to the `outRoute.params` object with the key defined by the `match` property name. If the matched portion of the url consists solely of the digits "0" to "9" (they will be in string form) the paramater will be converted to an integer before being placed in the `params` property. 

As a route matches as described above the part of the url matched is removed from the `path` part of the url in `outRoute`. The main point to be made is that the removed part is  **before** a slash. **If** the last match was the end of the url, **and** `inRoute.path` is not already just a '/' **and** the `match` property did not end in a traling slash (or was a single '/' all on its own) then the `outRoute.path` becomes a single '/'

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
<akc-location route="{{route}}"></akc-location>
<akc-route
  in-route="{{route}}"
  match="/:page"
  out-route="{{subRoute}}"></akc-route>
<iron-pages selected="[[page]]" attr-for-selected="name">
  <main-menu name="menu"></main-menu>
  <appointment-management name="appointments" route="{{subRoute}}"></appointment-management>
  <my-reports name="reports" route="{{subRoute}}"></my-reports>
</iron-pages>
```

The first objective is to use different url's to switch pages. In the above scenario we need an observer on the combination of `subRoute.active` and `subRoute.params.page`. we can check for `subRoute.active` being `true` and  `subRoute.params.page` being `''` in order to set `page` to `'menu'`. At the top level this structure is fine, but at levels down (for instance in the `<my-reports>` element the exact same structure will be needed to match a menu at url /reports and a date reporting element at /reports/bydate ).  This is the reason for propagating one time a trailing `'/'`).

The reason for `ifMatched` is to provide support for the case where an `<akc-route>` element inside one of the two elements above (`appointment-management` and `my-reports`) can differenciate between a change meant for them or a change meant for the other url.  For instance the change from 0 to -1 in the third segment of the url could be related to change related to reports or a change related to appointments.  By using `ifMached` on the `<akc-route>` element inside either `<appointment-management>` or inside `<my-reports>`  It can be sure its meant for them.
