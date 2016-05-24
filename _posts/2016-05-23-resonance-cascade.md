---
layout: post
title: Resonance Cascade
category: programming
tags: 
    - F#
    - C#
---

Recently, I have made a few small programs in F# to get a feel for it. So far, I like F#, particular the type inference. Not that the immutability is anything to sneeze at either. However, I don't want to spend this blog talking about F#, instead I want to talk about the effect of learning F# has had on how I code in other languages.

> If you are looking for a good resource for learning F# check out [F# for fun and profit](https://fsharpforfunandprofit.com/).

That fact that learning more about F# has influenced my though process in other languages is not really unexpected. In fact, that is often stated as a [reason](https://programmers.stackexchange.com/questions/136133/why-should-i-learn-a-new-programming-language) to learn new languages. Learning JavaScript increased my level of comfort with delegates in C# and I belive that knowing some Python made me more comfortable using `var` in C#. Still, I think it is interesting and perhaps useful to note what I am applying, or trying to apply in other languages.

The first trait I am applying to my code post F# is an increase in the use of list manipulation as a tool to solve problems. I used `LINQ` pretty heavily before, but generally only for data from a database or other datasources. Recently, I have lists and `LINQ` for some additional tasks. The reason I credit F# with this change has to do with the ease of dealing with lists in F# (It's down right *schematic*).

Additionally, I have really missed the F# type system in C#. Specifically, I keep expecting treating anonymous objects in C# to work like types in F# and then realizing I can't pass the objects from method to method and keep the type unless I create an actual type. F# makes creating new types straight forward and uncomplicated, while in C#, I hesitate in doing so. I hesitate because a new class in C# generally means a new file for that class and an expectation that the class can be used in more than one place. Maybe this is a job for [nested classes](https://stackoverflow.com/questions/1083032/why-would-i-ever-need-to-use-c-sharp-nested-classes)? I have generally considered nested classes to be a poor decision. In fact, I still initially dismissed that option with little thought but reconsidered it for this blog post.

This is interesting to me, that learning F# has made me questions some assumptions and choices I was making when coding in C#. An illustrations of the benefits to learning new programming (and I guess blogging*).

So, when learning a new programming language, prepare for unforseen consequences.

*Now that is two blogging tropes down:
    ✓ First post about how the blog was created
    ✓ mentioning the benefits of blogging  
