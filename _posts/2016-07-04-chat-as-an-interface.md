---
layout: post
title: Chat as an Interface
category: thoughts
---

I was working on the podcast playing [Discord](https://discordapp.com) bot that I mentioned [last week]({% post_url 2016-06-27-discordant-streams %}), which you can find [here](https://github.com/AlexanderLindsay/PodcastPlayerBot), and I was trying to create an interface for it. Since it is a bot that runs in a discord server the interface it uses is based on users typing at it. And it sort of sucks.

It isn't that typing as interface sucks in general, command line interfaces can be really powerful. The problem is that chat isn't built as a command line. The loss of the command history is fairly massive, but also all the commands to the bot really clutter up the chat. Not to mention that picking and playing podcasts is pretty bad for this interface. The users has to get the bot to list the episodes of the podcast they want, which might require some sort of paging mechanism, and then tell the bot to play a specific episode. And that doesn't even including stoping the podcast or listing out which podcast is currently playing. The bot just spits out text and the user has to enter it back in.

I remember reading a blog post recently that discussed some user interfaces currently heavily used in China (I can't find the exact post but [this](http://dangrover.com/blog/2014/12/01/chinese-mobile-app-ui-trends.html#chatasui) might serve in its stead). I was suprised to learn that the messaging app converts the text into buttons that the user can interact with. It seemed strange at the time, but frankly, that is genius. If you put that into users private chats with the bot it sort of solves all these problems.

Now, if you excuse me, I am off to play some [Duskers](http://duskers.misfits-attic.com/) and command some bots around derelict spaceships with a command line interface.