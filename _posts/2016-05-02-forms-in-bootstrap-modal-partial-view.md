---
layout: post
title: MVC Partial Views in Bootstrap Modals With Forms
category: programming
tags: 
    - bootstrap
    - ASP.NET MVC
    - ASP.NET Core
---

This is a follow-up to the previous post on [Bootstrap Modals and Partial Views]({% post_url 2016-04-25-bootstrap-modals-and-razor %}).  That post discussed how to get a bootstrap modal to load a partial view. in this post we will add a form to that partial view/modal. 

The code is still located in this [repository][repository] on GitHub.

So the last post left us with a bootstrap modal with the content dynamically loaded from a partial view. 
Here is the partial view:

```html
<div class="modal-header">
    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
        <span aria-hidden="true">&times;</span>
    </button>
    <h4 class="modal-title">Basic Modal</h4>
</div>
<div class="modal-body">
    Your content goes here.
</div>
<div class="modal-footer">
    <button type="button" class="btn btn-success" data-dismiss="modal">OK</button>
    <button type="button" class="btn btn-default" data-dismiss="modal">NO</button>
</div>
```

If we add a form to that we get this:

```html
<div id="target">
    <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
        </button>
        <h4 class="modal-title">Form Modal</h4>
    </div>
    @using (Ajax.BeginForm("PostModal", "Home",
        new AjaxOptions
        {
            HttpMethod = "POST",
            InsertionMode = InsertionMode.ReplaceWith,
            UpdateTargetId = "target"
        }))
    {
        @Html.AntiForgeryToken()
        <div class="modal-body">
            <div class="form-horizontal">
                Hello World!
                I am a Form!
            </div>
        </div>
        <div class="modal-footer">
            <button type="submit" class="btn btn-success">OK</button>
            <button type="button" class="btn btn-default" data-dismiss="modal">NO</button>
        </div>
    }
</div>
```

The same thing in ASP.NET Core MVC is:

```html
<div id="target">
    <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
        </button>
        <h4 class="modal-title">Form Modal</h4>
    </div>
    <form asp-action="PostModal" asp-controller="Home" data-ajax="true" data-ajax-method="POST" data-ajax-mode="REPLACE-WITH" data-ajax-update="#target">
        <div class="modal-body">
            <div class="form-horizontal">
                Hello World!
                I am a Form!
            </div>
        </div>
        <div class="modal-footer">
            <button type="submit" class="btn btn-success">OK</button>
            <button type="button" class="btn btn-default" data-dismiss="modal">NO</button>
        </div>
    </form>
</div>
```

The key bit is using wrapping the modal content in the #target div. This allows the ajax form post, which ASP.NET's unobtrusive ajax handles for us, to replace the content of the modal with the results of the form. Also the buttons are wrapped in the form to allow the OK button to submit the form without any additional JavaScript.

To get the `Ajax.BeginForm` or `data-ajax="true"` to work, we to install the Microsoft jQuery unobtrusive ajax package. There is a [Microsoft.jQuery.Unobtrusive.Ajax][unobtrusive] NuGet package for that purpose. If you are using ASP.NET Core you can get the new version from [bower][bower]. You could also recreate it, either version, yourself it you were so inclined, but that is out of scope for this blog post.

Now that we have added the form to the partial view, we need to change the controller to return the correct response. First, create an action that corresponds with action used by the form.

```c#
[HttpPost]
[ValidateAntiForgeryToken]
public ActionResult PostModal()
{
    return PartialView("ModalFormContent");
}
```

This enables the form modal to work, but posting the form will just return the form. If we want the modal to close once the form is posted successfully than we will need a new partial view. A `CloseModal` partial view. In that partial view we will add some JavaScript to close the modal.

```html
<script type="text/JavaScript">
    $(function () {
        $('#modal-container').modal('hide');
    });
</script>
```

The script will be auto run when the ajax result is loaded as html.

Then we change the action method to return this partial view.

```c#
[HttpPost]
[ValidateAntiForgeryToken]
public ActionResult PostModal()
{
    // If there was an error in the form modal you can still return the other view to leave the modal open
    return PartialView("CloseModal");
}
```

Now, this is pretty good. We have a form that can post and close the modal. However, what if this was a modal for adding an item to a list?

We can add some more JavaScript to the `CloseModal` view to accomplish this.

```html
@model BootstrapModalPartialViewCore.Models.CloseModal

@if (Model.ShouldClose)
{
    <script type="text/JavaScript">
        $(function () {
            $('#modal-container').modal('hide');
        });
    </script>
}

@if (Model.FetchData)
{
    <script type="text/JavaScript">
        $(function () {
            $.ajax({
                method: "GET",
                datatype: "text/plain",
                url: "@Model.Destination",
                cache: false
            }).done(function (result) {
                $("#@Model.Target").html(result);
                @if (!string.IsNullOrWhiteSpace(Model.OnSuccess))
                {
                    <text>
                    var onSuccess = @Model.OnSuccess;
                    if(typeof onSuccess === 'function'){
                        onSuccess();
                    }
                    </text>
                }
            });
        });
    </script>
}
```

We need a `CloseModal` modal to store several parameters. Particular the url to call and what to do with the result of the call and what method to call when it succeeds. One of the many reasonable variants of this would be to just call a method instead of calling the ajax directly. I choose this method as it allows me to put not have any extra JavaScript on the page, unless I add a `onSuccess` or `onFailure` functions.

```c#
public class CloseModal
{
    public bool ShouldClose { get; set; }
    public bool FetchData { get; set; }
    public string Destination { get; set; }
    public string Target { get; set; }
    public string OnSuccess { get; set; }
}
```

There are a couple of things to dislike about this. One, it feels wrong to add JavaScript after the main page has loaded. Two, this ties the html and JavaScript pretty closely with the c#. For example, if you need to change the id of the modal, or end up with multiple modals on the page (which I wouldn't really do with this setup), then you will need to change it in several places.

Just some things to worry about if you choose this method.

Anyway, we need to change the controller to pass the `CloseModal` to the partial view.

```c#
[HttpPost]
[ValidateAntiForgeryToken]
public ActionResult PostModal()
{
    var closeModal = new CloseModal
    {
        ShouldClose = true,
        FetchData = true,
        Destination = Url.Action("List"),
        Target = "list",
        OnSuccess = "success"
    };

    return PartialView("CloseModal", closeModal);
}
```

[repository]: https://github.com/AlexanderLindsay/BootstrapModalPartialView
[unobtrusive]: https://www.nuget.org/packages/Microsoft.jQuery.Unobtrusive.Ajax/
[bower]: http://bower.io/search/?q=jquery-ajax-unobtrusive