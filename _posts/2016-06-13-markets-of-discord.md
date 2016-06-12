---
layout: post
title: Markets of Discord
category: programming
tags: 
    - Discord
    - Bot
    - C#
---

I was reading [this][MSDN] MSDN article on prediction markets and found myself thinking that this would make a good game. (maybe I should get [Offworld Trading Company](http://www.offworldgame.com/).) I think a bot would work really well for this. It would allow for the players to be engaged at a low level over a long period of time instead of commiting to a short burst of intense focus. It wasn't too long ago that [Discord](https://discordapp.com/developers/docs/intro) released their offical bot API, so this seemed like a good fit.

So what are prediction markets and what would a bot that offered one look like?

I am no expert on prediction markets, I have only read that article, but a simple explanation would be to use a simulated stock market (*can I call it mock stock? wait no, come back.*) to try and predict events. The idea is, that if you get experts, convince them to take the simulation seriously throught the use of a monetary incentive (oh look, capitilism), you will end up with a higher price for it's stock. There are a couple formulas that are used to drive the simulation. Let's take a look at those, but first we need to discuss what fields we need for the formulas.

![Formulas]({{ site.baseurl }}/assets/PredictionMarketFormulas.png)
> Image taken from the [MSDN] article

Markets have only two pieces of information that the formulas care about:
- liquidity
- number of shares sold for each stock

From that starting point the price and probabilty can be computed and who bought what for how much is just book keeping.

Now, you may be wondering what liquidity means in this context. Liquidity controls the speed at which the cost of shares changes as the shares are bought or sold. Larger values of liquidity lowers the amount buying a single share changes the prices. Note that liquidty can't be `0` and that `100` is a good starting value.

I don't want to waste to much time with the formulas here, the [article][MSDN] talks about them more if you want a more of an explanation. I am just going to list them

#### Cost

```c#
public double Cost(IEnumerable<int> holdings, double liquidity)
{
    var sum = holdings.Aggregate(0.0, (accum, holding) =>
    {
        return accum + Math.Exp(holding / liquidity);
    });
    return liquidity * Math.Log(sum);
}
```

#### Change in Cost

```c#
public double CalculateChange(IEnumerable<int> beginningHoldings, IEnumerable<int> endingHoldings, double liquidity)
{
    var startingCost = Cost(beginningHoldings, liquidity);
    var endingCost = Cost(endingHoldings, liquidity);
    return endingCost - startingCost;
}
```

#### Current Prices

```c#
public IEnumerable<double> CurrentPrices(IEnumerable<int> holdings, double liquidity)
{
    return holdings.Select((holding, index) =>
    {
        var array = holdings.ToArray();
        array[index]++;
        return CalculateChange(holdings, array, liquidity);
    });
}
```

#### Probabilities

```c#
public IEnumerable<double> Probabilities(IEnumerable<int> holdings, double liquidity)
{
    var denom = 0.0;
    foreach(var holding in holdings)
    {
        denom += Math.Exp(holding / liquidity);
    }

    return holdings.Select(holding =>
    {
        return Math.Exp(holding / liquidity) / denom;
    });
}
```

So the article mentions that this set of formulas are called the `Logarithmic Market Scoring Rule (LMSR)`, which means that I might want to add some other rule sets in the future. So I put those methods in a `LogarithmicMarketScoringRule` that implements `IMarkerScoringRule`. This should at least give me a starting point should I decide to add more rule sets.

### Simulation

That takes care of the math. Now there still several pieces missing from making this a work as a discord bot. First, let us finish off the simulation with a couple objects.

The most important object is the `Market`. This will represent a predictive marker and hold all the data associated with it.

```c#
public class Market
{
    public int Id { get; set; }
    public string Name { get; set; }
    public double Liquidity { get; set; }
    public bool IsRunning { get; set; }

    public virtual ICollection<Stock> Stocks { get; set; }
    public virtual ICollection<Player> Players { get; set; }
}
```

The IsRunning flag will allow us to keep track of if the market is open. When the market is open we are not going to allow new stocks to be added. Additionally, once transactions will not be allowed when the market is closed.

Next is the `Stock` class.

```c#
public class Stock
{
    public int Id { get; set; }
    public int MarketId { get; set; }
    public virtual Market Market { get; set; }
    public string Name { get; set; }
    public int NumberSold { get; set; }

    [NotMapped]
    public double CurrentPrice { get; set; }
    [NotMapped]
    public double CurrentProbability { get; set; }
}
```

Note the `NotMapped` attributes on the `CurrentPrice` and `CurrentProbability` properties. We are going to be storing the data in the database using Entity Framework, but we don't need to keep the CurrentPrice and CurrentProbability in the database as that will get recommuted as needed. Later, I might decide to create a different Model that has a `Stock` along with it's price and probability, but for now this will work.

The only thing of note in the `Player` class is the `Shares`, which represents the number of stocks of various types that the player has bought.

```c#
public class Player
{
    public int Id { get; set; }
    public int MarketId { get; set; }
    public virtual Market Market { get; set; }
    public string Name { get; set; }
    public double Money { get; set; }
    public virtual ICollection<Share> Shares { get; set; }
}
```

The `Share` class itself is very simple.

```c#
public class Share
{
    public int Id { get; set; }
    public int StockId { get; set; }
    public virtual Stock Stock { get; set; }
    public int Amount { get; set; }
}
```

Now that we have the data classes and the formulas taken care of, lets combine them. I created a MarketSimulator class to handle the simulation.

```c#
public class MarketSimulator
{
    private Market Market { get; set; }
    private MarketContext Context { get; set; }

    private IMarketScoringRule Rule { get; set; }

    public MarketSimulator(MarketContext context, int marketId)
        : this(new LogarithmicMarketScoringRule(), context, marketId)
    { }

    public MarketSimulator(IMarketScoringRule rule, MarketContext context, int marketId)
    {
        Rule = rule;

        Context = context;
        Market = Context.Markets.FirstOrDefault(m => m.Id == marketId);
        if (Market == null)
        {
            throw new ArgumentException("No marker found with Id " + marketId);
        }
    }

    public async Task Start()
    {
        Market.IsRunning = true;
        await Context.SaveChangesAsync();
    }

    public async Task Stop()
    {
        Market.IsRunning = false;
        await Context.SaveChangesAsync();
    }

    public async Task AddStockAsync(Stock stock)
    {
        if (Market.IsRunning)
        {
            throw new InvalidOperationException("Can't add stocks once the market is running");
        }
        Market.Stocks.Add(stock);
        stock.MarketId = Market.Id;
        Context.Stocks.Add(stock);
        await Context.SaveChangesAsync();
    }

    public async Task AddPlayerAsync(Player player)
    {
        Market.Players.Add(player);
        player.MarketId = Market.Id;
        Context.Players.Add(player);
        await Context.SaveChangesAsync();
    }

    private Player GetPlayer(int playerId)
    {
        var slayer = Market.Players.FirstOrDefault(p => p.Id == playerId);
        if (slayer == null)
        {
            throw new ArgumentException("No player found with Id " + playerId);
        }

        return slayer;
    }

    private Stock GetStock(int stockId)
    {
        var stock = Market.Stocks.FirstOrDefault(s => s.Id == stockId);
        if (stock == null)
        {
            throw new ArgumentException("No stock found with Id " + stockId);
        }

        return stock;
    }

    public async Task<TransactionResult> Buy(int playerId, int stockId, int amount)
    {
        if (!Market.IsRunning)
        {
            throw new InvalidOperationException("The market must be running to buy stocks");
        }

        var player = GetPlayer(playerId);
        var stock = GetStock(stockId);

        return await TransactionAsync(player, stock, amount);
    }

    public async Task<TransactionResult> Sell(int playerId, int stockId, int amount)
    {
        if (!Market.IsRunning)
        {
            throw new InvalidOperationException("The market must be running to sell stocks");
        }

        var player = GetPlayer(playerId);
        var stock = GetStock(stockId);

        return await TransactionAsync(player, stock, -1 * amount);
    }

    private async Task<TransactionResult> TransactionAsync(Player player, Stock stock, int amount)
    {
        var result = new TransactionResult
        {
            Player = player.Name,
            Stock = stock.Name
        };

        if(amount == 0)
        {
            result.Success = false;
            result.Message = "Amount to sell or buy can't be zero";
        }

        var startingHoldings = Market.Stocks.Select(s => s.NumberSold);
        var endingHoldings = Market.Stocks.Select(s =>
        {
            if (s.Id == stock.Id)
            {
                return s.NumberSold + amount;
            }
            else
            {
                return s.NumberSold;
            }
        });

        var cost = Rule.CalculateChange(startingHoldings, endingHoldings, Market.Liquidity);

        if (player.Money < cost)
        {
            result.Success = false;
            result.Message = string.Format("Not enough money to buy shares. Cost: {0}", cost);
            return result;
        }

        var currentShare = player.Shares.FirstOrDefault(s => s.StockId == stock.Id);
        if (currentShare == null)
        {
            currentShare = new Share { StockId = stock.Id, Amount = 0 };
            player.Shares.Add(currentShare);
        }

        currentShare.Amount += amount;
        stock.NumberSold += amount;
        player.Money -= cost;

        await Context.SaveChangesAsync();
        result.Success = true;
        result.Value = cost;
        return result;
    }

    public IEnumerable<Stock> ListStocks()
    {
        var holdings = Market.Stocks.Select(stock => stock.NumberSold);
        var prices = Rule.CurrentPrices(holdings, Market.Liquidity);
        var probability = Rule.Probabilities(holdings, Market.Liquidity);

        return Market.Stocks
            .Zip(prices, (stock, price) => new Stock
            {
                Id = stock.Id,
                Name = stock.Name,
                NumberSold = stock.NumberSold,
                CurrentPrice = price
            })
            .Zip(probability, (stock, p) =>
            {
                stock.CurrentProbability = p;
                return stock;
            });
    }

    public IEnumerable<Player> ListPlayers()
    {
        return Market.Players.Select(player => new Player
        {
            Id = player.Id,
            Name = player.Name,
            Money = player.Money,
            Shares = player.Shares.Select(share => new Share
            {
                Id = share.Id,
                StockId = share.StockId,
                Stock = share.Stock,
                Amount = share.Amount
            }).ToList()
        });
    }
}
```

There is a lot of code there, but most of the actual interesting stuff is in the `TransactionAsync` method and all that does is use the rule set to calculate the change in the cost and then check to see if the player can afford it or not.

The `ListStocks` method has to add in the current prices and current probabilities to each stock by again using the rule set to get those values. It then fills in the unmapped fields on the `Stock` object.

### Testing

So we still don't have gotten to the discord bot part of the project, but we also don't know if what we have will work or not. It should be fairly easy to add unit tests to the `LogarithmicMarketScoringRule` as it doesn't depend on anything else. Likewise, the `MarketSimulator` shouldn't be too bad to create test for as the rule set and the context are taken as arguments to the constructor. However, I haven't created an interface for the context so when I add unit tests I will have to do that first.

But I don't want to create unit tests right this second. Instead, we are going to create a simple console app.

```c#
static void Main(string[] args)
{
    AsyncContext.Run(() => MainAsync(args));
}

static async void MainAsync(string[] args)
{
    using(var context = new MarketContext())
    {
        var market = context.Markets.FirstOrDefault();
        if (market == null)
        {
            market = new Market() { Liquidity = 100.0, IsRunning = false };
            context.Markets.Add(market);
            context.SaveChanges();
            context.Entry(market).Reload();
        }

        var simulator = new MarketSimulator(context, market.Id);

        var loop = true;

        while(loop)
        {
            Console.Write("> ");
            var line = Console.ReadLine();
            var parts = line.Split(' ');

            if(parts.Length > 0)
            {
                loop = await RunCommand(parts, simulator);
            }
        }
    }
}
```

> Note: [Discord.Net](https://github.com/RogueException/Discord.Net), which is what I am going to use for the Discord client, uses [AsyncEx](https://github.com/StephenCleary/AsyncEx) already so I used AsyncContext to deal with the async methods I created in the `MarketSimulator` class.

First, we get or create a `Market` and then pass that market to the `MarketSimulator`. Next we just loop on console lines, parsing them and taking action as needed.

```c#
static async Task<bool> RunCommand(string[] command, MarketSimulator simulator)
{
    switch (command[0].ToLowerInvariant())
    {
        case "exit":
            return false;
        case "list":
            var target = "all";
            if(command.Length >= 2)
            {
                target = command[1].ToLowerInvariant();
            }
            List(simulator, target);
            break;
        case "add":
            if (command.Length < 2)
            {
                Console.WriteLine("Add requires additional parameters");
                return false;
            }
            await Add(simulator, command.Skip(1));
            break;
        case "start":
            await simulator.Start();
            break;
        case "stop":
            await simulator.Stop();
            break;
        case "buy":
            await Buy(simulator, command.Skip(1));
            break;
        case "sell":
            await Sell(simulator, command.Skip(1));
            break;
        case "clear":
            Console.Clear();
            break;
        default:
            Console.WriteLine("Unknown command.");
            break;                
    }

    return true;
}
```

The `RunCommand` method turns the strings entered on the command line into the action to take. There are also `List`, `Add`, `Buy`, and `Sell` helper methods.

```c#
static void List(MarketSimulator simulator, string target)
{
    switch (target)
    {
        case "stocks":
            Console.WriteLine("Stocks");

            var stocks = simulator.ListStocks();
            foreach(var stock in stocks)
            {
                Console.WriteLine("Stock {0} ({1}):", stock.Name, stock.Id);
                Console.WriteLine("Shares Owned: {0}", stock.NumberSold);
                Console.WriteLine("Current Price: {0:C}", stock.CurrentPrice);
                Console.WriteLine("Probability: {0:F4}", stock.CurrentProbability);
                Console.WriteLine("-----------------");
            }

            Console.WriteLine("End Stocks");
            break;
        case "players":
            Console.WriteLine("Players");

            var players = simulator.ListPlayers();
            foreach(var player in players)
            {
                Console.WriteLine("Player {0}", player.Name);
                Console.WriteLine("Funds: {0:C}", player.Money);
                Console.WriteLine("Shares: {0}", player.Shares.Aggregate("",
                    (str, share) => str += string.Format("{0}:{1}|", share.Stock.Name, share.Amount)));
            }

            Console.WriteLine("End Players");
            break;
        case "all":
            List(simulator, "stocks");
            List(simulator, "players");
            break;
        default:
            Console.WriteLine("Unknown list target.");
            break;
    }
}

static async Task Add(MarketSimulator simulator, IEnumerable<string> arguments)
{
    var target = arguments.First();
    switch (target)
    {
        case "player":
            await simulator.AddPlayerAsync(new Player()
            {
                Name = "TestPlayer",
                Money = 500.0
            });
            break;
        case "stock":
            await simulator.AddStockAsync(new Stock()
            {
                Name = "TestStock",
                NumberSold = 0
            });
            break;
        default:
            Console.WriteLine("Invalid target for add.");
            break;
    }
}

static async Task Buy(MarketSimulator simulator, IEnumerable<string> arguments)
{

    if (arguments.Count() < 3)
    {
        Console.WriteLine("Invalid arguments for buy");
        return;
    }

    int playerId;
    int stockId;
    int amount;

    if(
        !int.TryParse(arguments.ElementAt(0), out playerId) ||
        !int.TryParse(arguments.ElementAt(1), out stockId) ||
        !int.TryParse(arguments.ElementAt(2), out amount))
    {
        Console.WriteLine("Invalid arguments for buy");
        return;
    }

    var result = await simulator.Buy(playerId, stockId, amount);
    if (result.Success)
    {
        Console.WriteLine("Player {0} bought {1} {2} of stock {3} for {4:C}", 
            result.Player, amount, amount == 1 ? "share" : "shares", result.Stock, result.Value);
    }else
    {
        Console.WriteLine("Player {0} failed to buy {1} {2} of stock {3} because: {4}",
            result.Player, amount, amount == 1 ? "share" : "shares", result.Stock, result.Message);
    }
}

static async Task Sell(MarketSimulator simulator, IEnumerable<string> arguments)
{

    if (arguments.Count() < 3)
    {
        Console.WriteLine("Invalid arguments for sell");
        return;
    }

    int playerId;
    int stockId;
    int amount;

    if (
        !int.TryParse(arguments.ElementAt(0), out playerId) ||
        !int.TryParse(arguments.ElementAt(1), out stockId) ||
        !int.TryParse(arguments.ElementAt(2), out amount))
    {
        Console.WriteLine("Invalid arguments for sell");
        return;
    }

    var result = await simulator.Sell(playerId, stockId, amount);
    if (result.Success)
    {
        Console.WriteLine("Player {0} sold {1} {2} of stock {3} for {4:C}",
            result.Player, amount, amount == 1 ? "share" : "shares", result.Stock, -1 * result.Value);
    }
    else
    {
        Console.WriteLine("Player {0} failed to sell {1} {2} of stock {3} because: {4}",
            result.Player, amount, amount == 1 ? "share" : "shares", result.Stock, result.Message);
    }
}
```

We are going to have to be doing similar things when we make the Discord bot, so we should pay attention to what works and doesn't work with this first approximation.

Anyway, with that we have something we can run on the console. 

[MSDN]: https://msdn.microsoft.com/en-us/magazine/mt707531