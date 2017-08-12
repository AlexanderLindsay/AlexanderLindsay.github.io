---
layout: post
title: Starting A Game Project
category: programming
tags: 
    - F#
    - Creating Games
---

My sister asked me to help them get started on create a computer game and as I started the process of helping them I realized that the coding sessions would make good blog posts, which I have not been creating as of late. So, this is my attempt to chronicle our foray into creating games as well as restart my blog.

The first step of the process of creating a game, or really any programming project, is figuring out what your goals are. Are you trying to end up with a finished product or are you more interested in the journey? There are a lot of ways one can skip to the part or problem that you find interesting and want to solve. For making games programs like [Unity](https://unity3d.com/), [Game Maker](https://www.yoyogames.com/gamemaker), or [Twine](https://twinery.org/) can help you make the game rather than a game engine. The more ambitious the game the more likely using some tool is the correct choice. Still, doing things from scratch can be a valid choice. We choose to start from scratch, in part because I like doing that and in part because we didn't want to learn how to use Unity or Game Marker.

The next choice is what language and what IDE. This doesn't matter that much, just choose a programming language that fits your needs, has good documentation or other source of information, and that you know well or want to learn. For an IDE, just use one that works with the programming language that you choose. I choose F#, because it is my current hammer, and Visual Studio Code, which I find to be a easy to use and customize light weight free open source editor. *buzzword combo (x2)*

The next step is to set up your coding environment. In this case that might install [F#](http://fsharp.org/), [Visual Studio Code](https://code.visualstudio.com/), and [Git](https://git-scm.com/). [This instruction](https://docs.microsoft.com/en-us/dotnet/fsharp/get-started/get-started-vscode) set got us up and running. However, instead of creating a `classlib` project, we created a `console`. 

Once you have the project created, make sure it runs. To run the project, you first need to build it with the Ionide-FAKE extension: `Ctrl-Shift-P` to bring up the Visual Studio Code commend pallet and than `FAKE: Build`. Than use the terminal to run the exe in the build folder. If it doesn't run, be sure that all the prerequisites are met. (We missed the install of the Microsoft Build Tools 2015 on our first attempt, so check that and the Path variables).

Ok, now that all that stuff is out of the way, let's create a simple game loop and get something on the screen.

When you created the `console` project, a `GameProject.fs` file, where `GameProject` is the name you used to create the project, was created with the following bit of code:

```fsharp
module GameProject

[<EntryPoint>]
let main argv =
    printfn "%A" argv
    0 // return an integer exit code
```

Right now all it does is echo out the command line arguments passed to the executable file and than exit. Not really a good game as is.

So what does a game need to be a game? Actually that is too broad of a question. What are the most basic mechanism of a computer game? That is probably also to broad of a question, but the answer is accept user input, modify the state, draw the state, and repeat until the user exits. In order to accomplish those things we need a state object, a function to draw the state, a function to update the state, and a function to tie all that together.

To start with, create the game state object. Add it above the `module GameProject` line.

```fsharp
type GameState = 
    {
        shouldContinue: bool;
        display: char;
    }
```

`display` is the character that we are going to write to the console and `shouldContinue` is how we are going to signal that the application should exit.

We will handle drawing next.

```fsharp
    let drawState state =
        System.Console.Clear()
        System.Console.Write state.display
```

We are going to skip the input functions and setup the game loop next, which should give us some context for how the input handler should work.

```fsharp
    let rec gameLoop state =
        drawState state
        let stateChange = getInput()
        let state' = 
            match stateChange with
                | Some key -> act key state
                | None -> state
        match state'.shouldContinue with
            | true -> gameLoop state'
            | false -> state'
```

A couple things here. One, it is a recursive function. Two, it calls two functions we haven't defined yet, `act` and `getInput`, where the output of `getInput` is passed to the `act` function. Three, the loop exists when `shouldContinue` equals false by returning the ending state.

Before we go back for the input, lets modify the entry point.

```fsharp
    [<EntryPoint>]
    let main argv =
        let state = 
            {
                shouldContinue = true;
                display = 'W';
            }
        gameLoop state |>ignore
        0 // return an integer exit code
```

Since we aren't doing anything with the gameLoop return value, we pass it to `ignore`.

For the input and modification functions, lets start with the data that passes between them. Basically, we want to turn the information we get from the user into something that are game understands.

```fsharp
type GameKeys =
     Q
    |W
    |E
```

In this case, we are creating a [union](https://fsharpforfunandprofit.com/posts/discriminated-unions/) type that has three cases. For right now, they are just named after the key that was pressed, but eventually they will be more tied to an action. The game doesn't need to know that the user pressed `A`; the game needs to know that the user wanted to go left. But we can keep the simple version for now.

At this point, the two functions should be pretty clear.

```fsharp
    let getInput() =
        let key = System.Console.ReadKey(true)
        match key.Key with
            | System.ConsoleKey.Q -> Some GameKeys.Q
            | System.ConsoleKey.W -> Some GameKeys.W
            | System.ConsoleKey.E -> Some GameKeys.E
            | _ -> None

    let act key state =
        match key with
            | GameKeys.W -> {state with display = 'W';}
            | GameKeys.E -> {state with display = 'E';}
            | GameKeys.Q -> {state with shouldContinue = false;}
            | _ -> state
```

With those in place, you should now have a functional game(?)!

Here is the final file, if you wanted to see all of it in one place. Notice that I added an equal sign on the `module` line and indented everything underneath it.

```fsharp
namespace GameProjectNamespace

type GameState =
    {
        shouldContinue: bool;
        display: char;
    }

type GameKeys =
     Q
    |W
    |E

module GameProject =
    let getInput() =
        let key = System.Console.ReadKey(true)
        match key.Key with
            | System.ConsoleKey.Q -> Some GameKeys.Q
            | System.ConsoleKey.W -> Some GameKeys.W
            | System.ConsoleKey.E -> Some GameKeys.E
            | _ -> None

    let act key state =
        match key with
            | GameKeys.W -> {state with display = 'W';}
            | GameKeys.E -> {state with display = 'E';}
            | GameKeys.Q -> {state with shouldContinue = false;}
            | _ -> state

    let drawState state =
        System.Console.Clear()
        System.Console.Write state.user

    let rec gameLoop state =
        drawState state
        let stateChange = getInput()
        let state' = 
            match stateChange with
                | Some key -> act key state
                | None -> state
        match state'.shouldContinue with
            | true -> gameLoop state'
            | false -> state'

    [<EntryPoint>]
    let main argv =
        let state = 
            {
                shouldContinue = true;
                display = 'W';
            }
        gameLoop state |>ignore
        0 // return an integer exit code
```