---
layout: post
title: Markets of Discord Part Two
category: programming
tags: 
    - Discord
    - Bot
    - C#
    - Discord.Net
---

This post continues to chronicle my efforts to create a prediction market bot for [Discord](https://discordapp.com). Read part one [here]({% post_url 2016-06-13-markets-of-discord %}).

We last left our code ready to simulate a prediction market but with nothing to run it. So lets start on the discord bot side of things. I am going to use [Discord.Net](https://github.com/RogueException/Discord.Net) to manage the connection to Discord. It is available on NuGet and has a nice Command package that makes mapping user input to actions a breeze.

Lets start with the main method, the entry method.

```c#
class Program
{
    static void Main(string[] args)
    {
        using (var context = new MarketContext())
        {
            var manager = new MarketsManager(context);
            var token = ConfigurationManager.AppSettings["token"];

            using (var bot = new Bot("PredictiveMarket", manager))
            {
                bot.Start(token);
            }
        }
    }
}
```

You may recognize the `MarketContext` from last time, but the `MarketsManager` and `Bot` are new. First, however, I want to take a look at the configuration setup a bit. `ConfigurationManager` is from `System.Configuration` and allows us to access the information stored in the `App.config` file. The token value, which is how the bot is linked to the bot [user account](https://discordapp.com/developers/docs/topics/oauth2) that you can setup for your bot, is stored in the AppSettings section of the file. The trick is that you don't want the token in source control. To that effect I created a `secrets.config` file, excluded it from source control, and put the token in that file. Then the `App.config` just needs to reference the `secrets.config` file.

#### App.Config

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <configSections>
    <section name="entityFramework" type="System.Data.Entity.Internal.ConfigFile.EntityFrameworkSection, EntityFramework, Version=6.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089" requirePermission="false" />
  </configSections>
  <appSettings configSource="secrets.config"></appSettings>
  <connectionStrings>
    <add name="DefaultConnection" connectionString="Data Source=(localdb)\ProjectsV13;Initial Catalog=PredictionMarket;Integrated Security=True" providerName="System.Data.SqlClient"/>
  </connectionStrings>
  <startup>
    <supportedRuntime version="v4.0" sku=".NETFramework,Version=v4.6" />
  </startup>
  <entityFramework>
    <defaultConnectionFactory type="System.Data.Entity.Infrastructure.SqlConnectionFactory, EntityFramework" />
    <providers>
      <provider invariantName="System.Data.SqlClient" type="System.Data.Entity.SqlServer.SqlProviderServices, EntityFramework.SqlServer" />
    </providers>
  </entityFramework>
</configuration
```

#### secrets.config
```xml
<?xml version="1.0" encoding="utf-8" ?>
<appSettings>
  <add key="token" value="faketokennotrealtokenputrealtokenhere"/>
</appSettings>
```

> To you need to figure out how to get the token or setup a bot in discord see this [video](https://www.youtube.com/watch?v=ey8woPqvRaI) by foxbot which does a pretty good job explain the steps and as well as just general information about creating a bot with Discord.Net.

We will get to `MarketsManager` later, but we should skip ahead to the class I so helpfully called `Bot`. The constructor of `Bot` creates the `DiscordClient` and adds a few settings, including an `OnLogMessage` handler which I copied from the sample [Discord.Net](https://github.com/RogueException/DiscordBot/blob/master/src/DiscordBot/Program.cs) app. Then the commands are configured. I settled on using `$market` as a prefix as it seemed unlikely to cause conflicts. Additionally, `AllowMentionPrefix` is set to true, which allows users to get the bot to respond by using Discords `@`ing syntax. Next there are some command handlers which we will get to.

In the `Start` method we have the `ExecuteAndWait` method that allows an asynchronous context within a synchronous one. Inside the discord client connects to discord using the token and then, purely optionally, says it is playing the game "Discord.Net" to let people know what is running the bot.

```c#
using Discord;
using Discord.Commands;
using PredictionMarketBot.InfoModels;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace PredictionMarketBot
{
    public class Bot : IDisposable
    {
        private DiscordClient Client { get; set; }
        private MarketsManager Manager { get; set; }

        public Bot(string appName, MarketsManager manager)
        {
            Manager = manager;

            Client = new DiscordClient(c =>
            {
                c.AppName = appName;
                c.MessageCacheSize = 0;
                c.LogLevel = LogSeverity.Info;
                c.LogHandler = OnLogMessage;
            });

            Client.UsingCommands(c =>
            {
                c.CustomPrefixHandler = (msg) =>
                {
                    if (msg.User.IsBot)
                        return -1;

                    var isMatch = Regex.IsMatch(msg.Text, @"^\$market");
                    if (isMatch)
                        return 7;

                    return -1;
                };
                c.AllowMentionPrefix = true;
                c.HelpMode = HelpMode.Public;
                c.ExecuteHandler = OnCommandExecuted;
                c.ErrorHandler = OnCommandError;
            });

            CreateCommands();
        }

        public void Start(string token)
        {
            Client.ExecuteAndWait(async () =>
            {
                while (true)
                {
                    try
                    {
                        await Client.Connect(token);
                        Client.SetGame("Discord.Net");
                        break;
                    }
                    catch (Exception ex)
                    {
                        Client.Log.Error($"Login Failed", ex);
                        await Task.Delay(Client.Config.FailedReconnectDelay);
                    }
                }
            });
        

        /* Commands and Command handlers */

        /* IDisposable stuff */
    }
}
```

Rather than go through all the command code right here *(I am going to post the code on github within a day or so)*, but I do want to explain the basic structure.

```c#
var service = Client.GetService<CommandService>();

service.CreateCommand("predict")
    .Description("predicts the outcome of an event")
    .Do(async (e) =>
    {
        var simulator = GetSimulator(e);
        if (simulator == null)
            return;

        var market = simulator.GetMarketInfo();

        var result = simulator.Predict();

        var msg = $"**{market.Description}** {result.Name} ({result.CurrentProbability:P})";
        await Client.Reply(e, msg);
    });
```

That is a simple command that returns the markets current prediction. You can see how the fluent api of the Discord.Net Commands package makes it really easy to work with. Just use `Client.GetService<CommandService>()` to retrieve the service we defined in the constructor and then add commands to it. `CreateCommand` takes the keyword for the command. You can add aliases with the `Alias` method , parameters with the `Parameter` method and a description displayed by the help command with the `Description` method. The `Do` method is just as simple, it contains the action of the command. The lambda inside takes a `CommandEventArg` which contains all the information from discord.

The `Reply` method is a simple extension method that calls `SendMessage` on the channel the user sent the message in.

```c#
public static Task Reply(this DiscordClient client, CommandEventArgs e, string text)
    => Reply(client, e.User, e.Channel, text);

public async static Task Reply(this DiscordClient client, User user, Channel channel, string text)
{
    if (text != null)
    {
        await channel.SendMessage(text);
    }
}
```

The final piece of the puzzel is the `MarketsManager` class and `GetSimulator` method. Basically, they link the server the command is being sent from to a market. I ended up modifying the code from [part one]({% post_url 2016-06-13-markets-of-discord %}) a bit, and one of the pieces was adding in links to the discord server on markets and links to the discord user on the player.

I plan on posing the code on github in a few days with a good readme and I will add a link here once I do. 