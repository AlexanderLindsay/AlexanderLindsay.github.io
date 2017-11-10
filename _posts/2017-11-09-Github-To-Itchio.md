---
layout: post
title: Github to Itch.io
category: programming
tags: 
    - Github
    - Itch.io
    - Game Off 2017
    - VSTS
    - Docker
---

[Github](https://github.com/) and [Itch.io](https://itch.io/) announced a [Game Jam](https://itch.io/jam/game-off-2017) for this month of November and I decided to participant. However, instead of actually working on a game for the jam, I spent my time creating a dev pipeline from Github through Visual Studio Team Services (VSTS) into [Itch.io](https://itch.io/). So what does that mean and why does it matter?

First of all, what do I mean when I say an integration between Github and Itch? In simple terms, when I commit a change into my games github branch it shows up it itch without needing any interaction from me. A commit to github sends a webhook notice to VSTS, which kicks off a build, that creates an artifact for a release, which is then passed to itch. This is important because I only have to worry about it once. I can focus on my game and the pipeline takes care of the rest. Admittedly, it probably doesn't make sense to learn how to set this up for a game jam with a limited time limit, but I will be ready for the next game jam :)

So how did I set this up?

## Step 1 - Github -> VSTS

This step is pretty straight forward. I just followed the instructions outlined in this [documentation](https://docs.microsoft.com/en-us/vsts/build-release/actions/ci-build-github).

The basic steps are as follows:

1. Create a build in VSTS
1. Pick your github project as the source
1. Login and authorize VSTS when prompted
1. Create your build (with artifacts)

## Step 2 - VSTS -> Itch.io

There are a lot more moving parts for this step, but the basics are to create a release in VSTS that takes the artifacts from the build in step 1 and deploys them to Itch.io using [butler](https://itch.io/docs/butler/), which is Itch.io's CLI tool. In order to do this, we will need a VSTS private Agent that has butler installed. Lucky, it is pretty easy to setup a private Agent.

    A VSTS Agent is a server that is registered with VSTS so that VSTS can give it tasks to do. A private agent is an agent that you control and manager, which is contrasted with a hosted agent that microsoft controls and manages.

The route I choose for the private agent, and to be clear there are other ways to accomplish this, was to create a [Docker](https://www.docker.com/) container for the agent and put it into a [Azure Container Instance](https://azure.microsoft.com/en-us/services/container-instances/). If you don't know what I mean by Docker, or container, or [Azure](https://azure.microsoft.com/en-us/), or Azure Container Instance then let me do a super quick explanation. 

* Container are packages that wrap your code in all that it needs to work
* Docker is an application for managing, creating, and running those packages
* Azure is microsoft's cloud platform
* Azure Container Instance is a way to run a single container easily in Azure

I think that is all you need to get through what I did, but that was an incomplete explanation.

Anyway, first things first. Lets create a container for our agent with butler installed.

## Step 2a - Dockerfile

To create a container for Docker we user a Dockerfile. This tells Docker which container we are starting from and what changes we need to make to it. Than Docker can use it to build a new container. Here is what I used for the agent.

```Dockerfile
# Microsoft has a base image for vsts-agents and that is what we are using to base our container on
FROM microsoft/vsts-agent:ubuntu-16.04

# Download butler\set execute permissions on the butler file
RUN echo Downloading butler... \
 && curl -sL https://dl.itch.ovh/butler/linux-amd64/head/butler -o /usr/bin/butler \
 && chmod +x /usr/bin/butler
# run butler -V to output butler version for error checking
RUN /usr/bin/butler -V

# Add butler to the path to allow it to be run and key/value pair to the environment variables to tell vsts that it has the butler capability
ENV butler=/usr/bin/butler \
    PATH="/usr/bin/butler:${PATH}"
```

You can see the details on the [microsoft base image](https://hub.docker.com/r/microsoft/vsts-agent/) on docker. Additionally, if you don't want to create your own container, the container I created is available on [docker hub](https://hub.docker.com/r/amllindsay/vsts-agent-itch-butler/) as well. The docker image will need to be someplace that Azure can access it for the next step.

Which brings us to...

## Step 2b - Azure

Once the container/image exists, we now need to run the image to create the VSTS agent. I choose to use Azure Container Instance because it seemed easy and I have Azure bucks to burn.

All we need to do is create a container in Azure and give it the environmental variables for connecting to VSTS. Note that giving the VSTS information this way puts it in plain text in Azure, so anyone who has access to Azure would be able to get it. As far as I can tell there wasn't anyway to not do that at the moment.

This [Documentation](https://docs.microsoft.com/en-us/azure/container-instances/container-instances-quickstart) from microsoft does a pretty good job running through the steps. Basically, open up the Azure command prompt and do the following:

```
az group create --name myResourceGroup --location eastus
```

Then use that resource group to create the container.

```
az container create --name mycontainer --image amllindsay/vsts-agent-itch-butler --resource-group myResourceGroup -e VSTS_ACCOUNT=[Put your VSTS account name here] VSTS_TOKEN=[Put your VSTS token here]
```

Get your VSTS token by going to picking the Security item under the Profile menu. From there navigate to Security -> Personal Access Tokens. Create a token with only `Agent Pools (read, manage)`.

With that done, you should now have a new Agent available in the VSTS Agent Queues.

## Step 3 - Creating the Release

The final step is creating a release in VSTS that runs on the new agent and calls the butler push command. To do that we will need to give butler our itch.io credentials. The Itch.io [documentation](https://itch.io/docs/butler/login.html) outlines how to access our credentials.

To pass them to the agent, add them as a secret release variable in VSTS and then echo them into a file in a release task. Then the file can be used to give the butler CLI the credentials.

Here is the task I used to accomplish all this. Note that I have three variables I am passing in alongside the credentials. The user name, game name and channel. The [butler documentation](https://itch.io/docs/butler/pushing.html) describes what these values should be. I put them as variables in the release rather than hard coding them in the task itself to allow more flexibility.

```
echo $(BUTLER_API_KEY) > ./token.txt
butler push  ./Github-Integration-CI/Game $(itchUser)/$(itchGame):$(itchChannel) -i ./token.txt
```

And with that, we now have a Github -> Itch.io integration!

Now I have to go and figure out what game I want to make for the game jam...