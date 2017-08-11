---
layout: post
title: Getting a Library Card
category: programming
---
## Or How to install Jekyll (and Ruby) on Bash on Windows

When I was trying to get this blog up and running, I decided to try and install Jekyll on Bash on Windows rather than directly on Windows. This seemed like a good idea as Jekyll doesn't technically support Windows.

I thought that this was going to be super simple, apt-get install jekyll, or something.
I was wrong.
At this point I should caution the reader that I am not a regular user of linux and so wasn't really sure what I was doing.

I am not going to go into install Bash on Windows as that is out of scope for this blog. You can find a set of step by step instructions [here][bash install]. The only thing to note is that it may take a while for the update to appear once you switch on developer mode and move to the fast track.

So the first step in getting Jekyll installed is to install Ruby, [You can view the requirements for Jekyll on their site.][jekyll install]. This is also the hardest step.

The [Ruby][ruby install] site gives the following install instructions:

``` console
$ sudo apt-get install ruby-full
```

However, that installs version 1.9.3 while Jekyll needs v2 or above, at least if you want to use Jekyll 3, and I want the latest version :). 

To get Ruby 2.3.0 installed I first installed rbenv and used rbenv to install the correct rbenv. I followed the steps outlined in this [blog][rails]. The blog is for install ruby on rails and I only followed the steps up to installing rbenv and ruby. The blog states a 30 minute time frame, but the steps for installing rbenv and ruby didn't take that long.

If you were wondering rbenv is a ruby version manager. It seems that it keeps version of ruby in a hidden folder and then adjusts the path as needed to supply the wanted ruby version. You can read more about it on the project's github [page][rbenv].

So, if you are following along, you should have ruby 2.3.0 installed and can check by running 'ruby -v' on the command line. If you refer back to the [jekyll installation guide][jekyll install], you will see that there are some other requirements. Gems come with ruby and python and nodejs are only needed for Jekyll 2, and we are going to install jekyll 3.

However, I found that there are a few more requirements to getting jekyll to install correctly, we need make and gcc.

``` console
$ apt-get install make gcc
```

Now we should be able to install jekyll.

``` console
$ gem install jekyll
```

And then lets test it.

``` console
jekyll -v
```

And so ends the post.

[bash install]: https://blogs.msdn.microsoft.com/commandline/2016/04/06/bash-on-ubuntu-on-windows-download-now-3/
[jekyll install]: https://jekyllrb.com/docs/installation/
[ruby install]: https://www.ruby-lang.org/en/documentation/installation/#apt
[rails]: https://gorails.com/setup/ubuntu/14.04
[rbenv]: https://github.com/rbenv/rbenv
