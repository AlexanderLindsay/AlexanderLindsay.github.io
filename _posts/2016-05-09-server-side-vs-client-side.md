---
layout: post
title: Ruminations on ASP.NET MVC and JavaScript Frameworks
category: programming
tags: 
    - knockoutjs
    - mithriljs
    - ASP.NET MVC
---

After the previous two posts (you can find part one [here]({% post_url 2016-04-25-bootstrap-modals-and-razor %}) and part two [here]({% post_url 2016-05-02-forms-in-bootstrap-modal-partial-view.md %})) I've been thinking about the best way to integrate ASP.NET MVC with client side frameworks like [knockout.js](http://knockoutjs.com/). With unobtrusive ajax and the `Ajax.BeginForm` or `Ajax.ActionLink` you can use very little JavaScript to create sites that behave nominally like a heavy client side app. Unless you are doing a single page app, are there benefits in using JavaScript frameworks?

Yes. At least I think so. [Maybe? I don't know.](https://www.youtube.com/watch?v=x5Za8HggalY)

Let's take a look at an example. Say you want to use [Select2](https://select2.github.io/) and add some more functionality to a select list. If you are already using knockout then you just include the [select2 binding](https://github.com/select2/select2/wiki/Knockout.js-Integration) and you are good to go. But if you weren't already using knockout, is this enough of a reason to start? Using select2 is simple enough, especially if you are filling the option list server-side using Razor. Just take the id of the select and there you go.

```javascript
$(document).ready(function() {
  $(".js-example-basic-single").select2();
});
```

> Example from the select 2 documentation: [https://select2.github.io/examples.html](https://select2.github.io/examples.html)

Even if you are doing something fancy, like loading the data using ajax, select2 itself will handle it for you. So if all you are doing is adding in select2, I don't think I would bother adding in knockout.

I find this sort of upsetting. I like how knockout reduces or eliminates the need to put ids everywhere in the html. I feel like that easy gets out of control. Now Razor will add ids for you, but then you have to get those ids to the JavaScript which can also get messy. I think there is a line somewhere when it becomes useful to add knockout, but one select2 is not it.

One approach might be to just use knockout instead of the Razor and partial views. If you create web api controllers, or normal controllers that return JSON, then knockout can handle things.The knockout components make this an appealing option. The Razor partial views are just html and need to make server requests to change things. The knockout components are html and JavaScript bundled and can make changes client side. If you are creating something that doesn't need server-side processing then the components make sense.

Still, there is a cost to using a lot of JavaScript. It has too be maintained, sent to the client, and run on the client. These aren't deal breakers, but if you can accomplish your task with just Razor and partial views I would lean that direction.

I have only been talking about knockout here, but there are countless JavaScript frameworks. [Ember.js](http://emberjs.com/) and [Angular.js](https://angularjs.org/) are two popular ones. Ember seems to want to control the entire stack, which sort of conflicts a bit with ASP.NET MVC. Angular focuses more on the HTML and basically replaces Razor. Those are completely inadequate descriptions of those frameworks and you should take a look at them if you are curious.

I also want to mention [Mithril.js](http://mithril.js.org/), a lightweight JavaScript MVC framework. Even if you don't want to use Mithril, the [articles](https://lhorie.github.io/mithril-blog/) the site has written are worth reading. They discuss some of the reasoning behind Mithril's design. I particular liked this article on [complexity](https://lhorie.github.io/mithril-blog/decreasing-cognitive-load.html). That being said, there is substation overlap in functionality between Mithril and ASP.NET. If I was using Mithril with ASP.NET, I would let Mithril control pretty much all the HTML and just use web api controllers to supply the data.