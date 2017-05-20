---
layout: post
title: MVC Partial Views in Bootstrap Modals
category: programming
tags: 
    - bootstrap
    - ASP.NET MVC
    - ASP.NET Core
---

I couldn't think of a joke for this one. At least none that I was partial to.

If you want to view all the code for this post it is in this GitHub [repository][repository].

The partial views in [ASP.NET MVC][aspnet] are quite handy for organizing code. They allow pieces of HTML to be reused, including databinding.

> Here is a quick explanation, without going to far down the rabbit hole. Views are razor files, a code/html file that .NET compiles into plan HTML server-side. Normal views link with a layout page and return a full HTML page. Partial views just return a snippet of HTML.

[Bootstrap][bootstrap] modals and other forms of dialogs work pretty well conceptually with partial views. They are not as tied to the pages they appear on and may end up being used on multiple pages. Modals can also hold content that needs to be loaded on demand. Display details for items in a list, for example, can be one common use of a modal.

Setting up a modal to load a partial view is actually pretty straight forward, there are just a few potential hiccups that can be easily avoided if one knows about them. 

First, some requirements. I am assuming an ASP.NET MVC site with a bootstrap NuGet package. If you are using ASP.NET Core then the bootstrap NuGet package is replaced by a bootstrap bower package, but really just be sure you have bootstrap. You will also need to get bootstrap on the page itself, you can get help with that at [bootstrap's site][bootstrap].

If the partial view doesn't yet exist, then let's create it. I am going to create a partial view called `ModalContent.cshtml`. We can cover what goes in the view a bit later. Then create a method on a controller that returns the partial view. For this simple sample, I just used the `HomeController`.

```c#
public ActionResult ModalAction(int Id)
{
    ViewBag.Id = Id;
    return PartialView("ModalContent");
}
```

With those prerequisites out-of-the-way, add a bootstrap modal to the page.

{% gist 9dc6cea58e4f2c710da58813d3305760 %}

That is just the default bootstrap modal definition, it just happens to be devoid of content. Note that the Id is `modal-container`.

Then we add a link to the partial view and link it to the modal. There is some divergence here between ASP.NET Core and older ASP.NET. The tag helpers in Core really make it easier.

Here is old way.

{% gist f9ff7bc339e73fc33f7dd26a97389bee %}

Here is the new way.

```HTML
<a asp-action="ModalAction" asp-controller="Home" asp-route-id="1" data-target="#modal-container" data-toggle="modal">Open Modal</a>
```

Both versions accomplish the same thing. They create an anchor tag that links to the controller action that returns the partial view and they contain a hook to the modal. The `data-toggle="modal"` attribute is used by the bootstrap javascript to add a click event to the anchor tag that opens the modal. The `data-target` attribute tells the bootstrap JavaScript which modal to open.

> It is important to note here that Bootstrap version 3.3 deprecated the auto fetch feature and some additional JavaScript will be needed once it is removed. In earlier versions, however, it handles everything for you. The reason version 3.3 removes the capability was that they determined it was out of scope for what is primarily a CSS framework. You can read more about the issue [here][remote].

What we have now should work, however the modal will be blank as we don't have anything in the partial view. So lets fix that.

{% gist bb91af715826f6a321a946e8f5ddc395 %}

It is just the basic modal content, nothing fancy.

![modal sample]({{ site.baseurl }}/assets/ModalSample.png)

We are not quite done yet, there is still the issue of refreshing the content of the modal. As it stands, the partial view is requested once, the first time it is opened. After that the modal just displays the previously fetched html.

A simple but crude way to fix this issue is to reset the modal when it is closed so that bootstrap recreates it next time it is opened.

{% gist f025550030d69bca903c780bb789ba78 %}

> I want to note that this relies on bootstrap recreating the modal if it can't find the `bs.modal` data attribute.

If the modal shouldn't be cleared every time than this bit of JavaScript could be changed to only clear the modal if some criteria was met.

If you are using a version of bootstrap that no longer has the html fetching built in then add the following JavaScript to page. It recreates what bootstrap was doing.

{% gist f0944a68d187e409480d79b43ebc9430 %}

This was taken straight from the bootstrap 4 docs. Also, since this bit of JavaScript is called every time the modal is opened, we won't need to clear the modal on close.

That should give us what we set out for, a bootstrap modal that displays partial views. There are couple additional features that we could add, for example, using a form or knockout in the modal. I can take a look at those features at a later date. 

You could say that this leaves us with just a partial view.

Sorry, sorry, I will let myself out.

.

.

.

.

.

.

Wait, this is my blog.

[bootstrap]: https://getbootstrap.com
[aspnet]: https://www.asp.net/mvc
[remote]: https://github.com/twbs/bootstrap/pull/14034
[repository]: https://github.com/AlexanderLindsay/BootstrapModalPartialView
