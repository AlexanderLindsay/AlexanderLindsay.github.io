---
layout: post
title: Using F# to create a Electron App with multiple windows
category: programming
tags: 
    - F#
    - Electron
    - Fable
---

I like working in [F#][fsharp] and have been trying to use it more . I like the mindset that it forces on me, getting me to break things down into small pieces and/or thinking about things as a list of transformations. So, when I needed an [Electron][electron] app I wanted to see if I could do so using F#. I already knew [Fable][fable] was a thing, which allows you to write F# that is compiles to javascript, so I hoped I could use that for electron.

Long story short, you can! In fact there is sample showing you how to do so on the fable [github][fable sample] and a [template][template].

    A couple quick notes before I continue, I found that I had to run `dotnet restore` when changing paket dependencies to get the new dependencies to get picked up. I am not sure if that is because I was using vscode or some interference with dotnet core, but if intellisense isn't cooperating, try `dotnet restore`.

The main reason I was creating an Electron app is that I wanted to create multiple windows. *The other reason being that I am familiar with using html/css/js to create UI, though since I am going to be using Fable/Elmish that is a tiny bit undercut.* Creating multiple windows is pretty easy in Electron, even with Fable.

```fsharp
    // set some options
    let options = createEmpty<BrowserWindowOptions>
    options.titleBarStyle <- Some "hidden"
    options.resizable <- Some true
    options.show <- Some false
    options.height <- Some 230.
    options.width <- Some 370.
    options.title <- Some "Window Title"

    //create the window
    let window = remote.BrowserWindow.Create(options)

    // hold onto window reference some how
    // in this case I am storing it in a model
    let id = model.nextWindowId
    model.windows.Add(id, shipWindow)

    window.on("close", unbox (fun () ->
        // on close of the window remove reference
        RemoveWindow id
    )) |> ignore

    window.once("ready-to-show", (fun () -> 
        // show the window when it is ready to be shown
        window.show() |> ignore
    )) |> ignore

    //remove the file menu from the window
    window.setMenu(unbox null)

    //load the url you want the window to display
    window.loadURL(sprintf "%s%s" Browser.location.href url)
```

However, getting the window to display isn't the hard part. Now that we have all these separate windows, how do they communicate with each other? [Electron][https://electronjs.org/docs/faq#how-to-share-data-between-web-pages] offers two ways, using local storage or the electron IPC. However, I am working on a game and need a game loop. 

Some research indicated that the Electron [Main Process][https://github.com/electron/electron/issues/3363] would be a bad place to put a game loop. So I ended up creating a F# asp.net core [signalr][signalr] project. Then the Main Process spawns a child process that runs the server.

```fsharp
type ISpawnOptions =
    abstract cwd: string with get, set

// method to create the server process, called in the Electron Main Process startup
// the child process reference will have stick around like the Main Browser Window
let createServerProcess directory dll =
    printfn "Starting Server"

    let options = createEmpty<ISpawnOptions>
    options.cwd <- directory

    let cmd = "dotnet"
    let args = new ResizeArray<string>([ dll ])
    let c = childProcess.spawn (command = cmd, args = args, options = Some options )
    c.stdout.pipe Node.Globals.process.stdout |> ignore
    c.stderr.on("data", (fun data ->
        eprintfn "Server Error: %s" data
    )) |> ignore
    c.on("error", (fun error ->
        printfn "Server Error: %s" error
    )) |> ignore
    c.on("close", (fun _ ->
        printfn "Server Exited"
        child <- Option.None
    )) |> ignore
    c
```

Then connect to the signalr server from the renderer windows and everything can stay updated. However, getting signalr to work with Fable was a bit of pain. I had to use [ts2fable][ts2fable] to create types for the signalr typescript files as they didn't exist yet. This still required some manually editing as some of the translations don't work. But once the types are defined, use the following code to connect.

```fsharp
[<Import("*", from="@aspnet/signalr")>]
let signalR: obj = jsNative

// the !! and ? allow for what amounts to dynamic typing in F#, allowing you to get a know type from the unknown
let logLevel: ILogger.LogLevel = !!signalR?LogLevel?Information

// use the connection builder to setup the connection
// I think this syntax is nicer than the BrowserWindow options
let connectionBuilder : HubConnectionBuilder = 
    !! (createNew signalR?HubConnectionBuilder $ ())
let connection =
    connectionBuilder
        .withUrl(hubUrl)
        .configureLogging(logLevel)
        .build()

// Then start the connection
connection.start()
|> Promise.either 
    (fun _ -> !^(Browser.console.log("Connected"))) 
    (fun err -> !^(Browser.console.error(err.ToString())))
|> ignore
```

If this post feels a bit like a code dump, that is because it is. Sorry. I took to long from when I worked on this to when I wrote it up and I have lost the exact knowledge of the pain points I ran into. I want to get back into blogging, so hopefully I can write more complete posts. So if anything in this post isn't clear, please leave a comment and I can try to provide clarification.

Within the signalr server I used the [MailboxProcessor][mailbox] to run the game loop, but I think that deserves its own post.

[fsharp]: https://fsharp.org/
[electron]: https://electronjs.org/
[fable]: http://fable.io/
[fable sample]: https://github.com/fable-compiler/samples-electron
[template]: https://github.com/fable-compiler/fable-templates/blob/master/electron/Content/README.md
[signalr]: https://docs.microsoft.com/en-us/aspnet/core/signalr/introduction?view=aspnetcore-2.1
[ts2fable]: https://github.com/fable-compiler/ts2fable
[mailbox]: https://fsharpforfunandprofit.com/posts/concurrency-actor-model/