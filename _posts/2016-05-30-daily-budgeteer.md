---
layout: post
title: Daily Budgeteer
category: programming
tags: 
    - Electron
    - JavaScript
    - TypeScript
    - Mithriljs
    - Semantic-UI
---

![If you tilt your head, it almost looks like a face. Pareidolia is strange (and yes I looked that up).]({{ site.baseurl }}/assets/DailyBudgeteer.png)

I just released [version 1.2.0](https://github.com/AlexanderLindsay/dailybudgeteer/releases/tag/v1.2.0) of my budget management program [Daily Budgeteer](https://github.com/AlexanderLindsay/dailybudgeteer). This latest version adds categories to expenses, a graph that shows the spending in each category for that last two weeks, and upgraded to electron 1.2.0. The idea for the program came from [this blog post by Alex Recker](http://alexrecker.com/our-new-sid-meiers-civilization-inspired-budget/), but his is a website and main is a desktop app. The central conceit of the app is that it converts recurring expenses and incomes into an estimated amount per day. This makes it easier to reason about how much one can reasonably spend on any given day and still save money.

But I didn't write this blog post just to say that, what I wanted to talk about revolves around some of the technology choices I made when creating the app.

When I started the app I had two main goals:
    
* To release something useable and to some degree finished 
* To work with several technologies I was unfamiliar with but wanted to check out

I started with wanting to use [Mithril.js](http://mithril.js.org/) for something beyond simple experiments. This lead me to decide to do the app with [Electron](http://electron.atom.io/) as that would allow me to create a desktop app that used a JavaScript library. On top of that, I decided to use [TypeScript](https://www.typescriptlang.org/) instead of just JavaScript. Then I choose [Semantic-UI](http://semantic-ui.com/) for the CSS Framework because it wasn't [Bootstrap](https://getbootstrap.com/).

Now I just threw a lot of nouns out there with out an explanation. Sorry. However, the point is not what technology I was using but how I decided to use it.

There was some dependency chaining going on, but mostly I picked things that I wanted to try. This lead to some issues. I was trying to learn to many things at once, and this made it harder to track down issues because I didn't know where to look for the problem. I think the main culprit in the mix is TypeScript. I really like TypeScript, but I was not familiar enough with it, especially in the Node.js environment, to debug the issues that appeared. Mixing and matching TypeScript's `imports` with normal `requires` can get pretty confusing.

> Note: They improved TypeScript's [documentation](https://www.typescriptlang.org/docs/handbook/modules.html) on the subject of modules and imports after I had my struggles. It is really helpful now.

However, the main issue that I think can occur with this type of approach is not using each tool on its terms. Let me explain with an example.

I was trying to create a Semantic-UI dropdown for the categories which could be cleared. Since I was using Mithril, I started with this:

```JavaScript
    m("div.field", [ 
        m("select[id='category'].ui.selection.dropdown", 
            { 
                config: ViewHelpers.createDropdown({ sortSelect: true }), 
                onchange: ViewHelpers.withNumber("value", args.select), value: args.selectedValue 
            }, 
            ViewHelpers.writeOptions(args.selectedValue, ctrl.categoryOptions())) 
    ])
```

This creates a dropdown, but I was having real trouble getting all it to clear back to the placeholder. Now, the problem is that Semantic-UI really wants the html and not a select element.

```JavaScript
    m("div.field", [ 
        m("div.ui.selection.dropdown[id='category']", 
            { 
                onchange: ViewHelpers.withNumber("value", args.select), value: args.selectedValue 
                config: ViewHelpers.createDropdown({ 
                    sortSelect: true, 
                    placeholder: ctrl.defaultText 
                }) 
            }, 
            [ 
                m("input[type='hidden']", { 
                    value: ctrl.getSelectedValue(args.selected.id()), name: "category", 
                    onchange: ViewHelpers.withNumber("value", ctrl.pickCategory.bind(this, args.select)) 
                }), 
                m("i.dropdown.icon"), 
                displayText, 
                m("div.menu", ctrl.categoryOptions().map(co => { 
                    return m("div.item", { "data-value": co.value }, co.text); 
                })) 
            ] 
        ) 
    ]), 
```

Since I was working with TypeScript, Mithril, and Semantic-UI, I didn't pay enough attention to the Semantic-UI doc to really grok the vision Semantic-UI had for how to use it. I was still trying to use the select element for the dropdown because I thought that was how it should be. That put me into some conflict with Semantic-UI.

It is never fun to fight the things that are suppose to be helping you, and I was really starting to dislike Semantic-UI. However, now I have a little more understanding of what it is attempting to do and I think it works pretty well. In fact since most of Semantic-UI is `div`s and `classes` it works really well with Mithril. Still, I am not sure I would pick it for a different project, but that is mostly for some other choices it makes that aren't relevant here.

I think the main lesson that I take from all of it is this: At least learn the central tenet of the tools you are using before you start. I had already spent a bunch of time researching Mithril and had a way easier time using that. Thought a lot of that is better attributed to the creator of Mithril, who clearly spent a lot of time and thought making it easy to use and understand. 