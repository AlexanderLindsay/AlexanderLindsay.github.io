---
layout: post
title: What is good about Mithril?
category: programming
tags: 
    - JavaScript
    - TypeScript
    - Mithriljs
    - Knockoutjs
---

I talked about [Mithril](http://mithril.js.org/) briefly in my last post, but I want to delve into why I like it a bit more. 

First, a quick explanation on what Mithril is. The Mithril site has the following to say on the subject.

> # What is Mithril?
> Mithril is a client-side MVC framework - a tool to organize code in a way that is easy to think about and to maintain.

The [site](http://mithril.js.org/) has more information as well some awesome articles like this [one](https://lhorie.github.io/mithril-blog/module-partial-application.html) on partial module application or this [one](https://lhorie.github.io/mithril-blog/what-is-a-view-model.html) on view models. Give them a read if you have time.

But I digress.

While Mithril is a client-side MVC framework, I think that description is a little misleading. Most of what Mithril gives you out of the box is the view, the rest is just recommend practices. That might sound like a bad thing but its not. It gives you a lot of flexibility.

The Mithril site [itself](http://mithril.js.org/getting-started.html#notes-on-architecture) talks about how `m.prop` is just a simple getter setter function that could be replaced by any other getter setter function.

The crucial part here is none of the functionality is hidden from you. I have used [knockout](http://knockoutjs.com/) alot and I really like it, but debugging can be a pain if you aren't careful. Which isn't a knock on knockout perse, but it is a leaky abstraction that tries to pretend it isn't. That means you have to learn some of the hidden stuff sometimes. *I remember that I had a devil of a time creating a jquery modal binding.*

With Mithril, almost all the complixity is created by you in creating the views. There isn't werid loops or dependencies hidden in observables. It just runs the view method and prints the results.

The only cavet I have to say about Mithril, as that you have to let it control the HTML it has control of. If you try and change it from outside Mithril, it is just going to get overwritten when Mithril redraws.