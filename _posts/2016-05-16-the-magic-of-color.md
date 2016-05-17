---
layout: post
title: The Magic of Color Matrices
category: programming
tags: 
    - Xamarin
    - Project Oxford
    - OCR
---

![Carcassonne]({{ site.baseurl }}/assets/Carcassonne.png)

Look at that. It is a picture of the [world record-setting carcassonne game][carcassonne]. 

That is impressive and I wonder how they reached the center of the table.

Anyway.

In this blog post I am going to discuss some experiments I did creating an app to OCR the titles of [Magic][magic] cards to get the prices. If you aren't familiar with Magic: The Gathering, it is a collectable card game. That may not explain it enough. For the purpose of this blog post, all you need to know is that you buy cards for the game that other people might want to trade or buy from you, which is all not related to the game in any way.

So, I don't consider myself an advent Magic player, but I have ended up with lots of cards anyway and I wanted to know which ones were worth anything. There are [many][tcg] [many][mtg] sites that list the prices of cards. I didn't want to type in all those card titles.

So I made an app! *Because that was less typing*.

That was a joke, but it might actually be true. hmm

I expected the hard part to be the code, but that didn't turn out to be the case. I created a Xamarin project in Visual Studio and used [Project Oxford][oxford], which is Microsoft's machine learning apis (looks like it might be called cognitive services now? That sounds slightly sinister).

That was fairly straight forward and the only tricky bit was the indirectness if the project is a shared project. I created a shared project but I only implemented an android version because that matches my phone.

Here is the part of the code that calls into the Microsoft api:

```c#
public async void ShowImage(string apiKey, byte[] data)
{
    using (var ms = new MemoryStream(data))
    {
        var client = new VisionServiceClient(apiKey);
        var regions = await client.RecognizeTextAsync(ms);
        var builder = new StringBuilder();
        regions.Regions
            .SelectMany(r => r.Lines)
            .Aggregate(builder, (b, line) =>
            {
                line.Words.Aggregate(b, (lb, word) => lb.Append(word.Text + " "));
                return b.AppendLine();
            });
            
        var title = regions.Regions
            .FirstOrDefault()?.Lines
            .FirstOrDefault()?.Words
            .Aggregate("", (str, word) => str + " " + word.Text)?.Trim();
            
        content.Text = builder.ToString();
        titleLabel.Text = title;

        if (!string.IsNullOrWhiteSpace(title))
        {
            CallFetchCardData(title);
        }
    }

    var source = ImageSource.FromStream(() => new MemoryStream(data));
    image.Source = source;
}
```

The part I spend the most time on was actually getting this

![AkoumHellkite]({{ site.baseurl }}/assets/AkoumHellkite.png)

to turn into

![AlteredAkoumHellkite]({{ site.baseurl }}/assets/AkoumHellkiteApp.png)

so that the OCR would pick up the text.

It turns out you do this using a [matrix][matrix] transformation to transform the colors.

```c#
public Bitmap AdjustImageForOCR(Bitmap bitmap)
{
    var adjusted = Bitmap.CreateBitmap(bitmap.Width, bitmap.Height, Bitmap.Config.Argb8888);
    var canvas = new Canvas(adjusted);
    var paint = new Paint();

    var matrixOne = new ColorMatrix(new float[]
    {
        -.3f, -.59f, -.11f, 0, 255,
        -.3f, -.59f, -.11f, 0, 255,
        -.3f, -.59f, -.11f, 0, 255,
        0, 0, 0, 1, 0
    });

    var matrixTwo = new ColorMatrix(new float[]
    {
        1.4f, 0, 0, 0, 102,
        0, 1.4f, 0, 0, 102,
        0, 0, 1.4f, 0, 102,
        0, 0, 0, 1, 0
    });

    var matrixThree = new ColorMatrix(new float[]
    {
        1, 0, 0, 0, 50,
        0, 1, 0, 0, 50,
        0, 0, 1, 0, 50,
        0, 0, 0, 1, 0
    });

    var matrixInvert = new ColorMatrix(new float[]
    {
        -1, 0, 0, 0, 255,
        0, -1, 0, 0, 255,
        0, 0, -1, 0, 255,
        0, 0, 0, 1, 0
    });

    var cm = new ColorMatrix();
    cm.PostConcat(matrixOne);
    cm.PostConcat(matrixTwo);
    cm.PostConcat(matrixThree);
    cm.PostConcat(matrixInvert);
    var f = new ColorMatrixColorFilter(cm);

    paint.SetColorFilter(f);
    canvas.DrawBitmap(bitmap, 0, 0, paint);
    return adjusted;
}
```

If that looks hacky as hell, that is because it is. I used a [paint.Net plugin] to play around with the numbers to get it work.

It only works on that one test image. I really need to spend some more time with this to see if I can get it to work in more conditions.

Oh, I used [DeckBrew][brew] to get the pricing information once I had the card title.

[carcassonne]: https://motherboard.vice.com/read/largest-carcassonne-game-ever
[magic]: http://magic.wizards.com/
[tcg]: http://www.tcgplayer.com/
[mtg]: http://www.mtgprice.com/
[oxford]: https://www.microsoft.com/cognitive-services/
[matrix]: https://developer.android.com/reference/android/graphics/ColorMatrix.html
[paint]: http://forums.getpaint.net/index.php?/topic/27423-color-matrix-adjustment-plugin/
[brew]: https://deckbrew.com/