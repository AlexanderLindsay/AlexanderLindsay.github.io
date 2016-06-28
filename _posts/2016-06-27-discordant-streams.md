---
layout: post
title: Discordant Streams
category: programming
tags: 
    - Discord
    - Bot
    - C#
    - Discord.Net
    - NAudio
---

So I am apparently on a [Discord](https://discordapp.com) bot kick.

In this post I am going to explain how I managed to make a discord bot that can stream a file from a url using [NAudio](https://github.com/naudio/NAudio) and [Discord.Net](https://github.com/RogueException/Discord.Net).

I started by looking at the streaming example in the NAudio samples, which you can find [here](https://github.com/naudio/NAudio/blob/master/NAudioDemo/Mp3StreamingDemo/MP3StreamingPanel.cs).
The sample is built for a windows form application and so we can ignore alot of it. The key pieces to note is there are two parts to streaming from a url. First, there is a section that runs in a new thread and downloads the file into a `BufferedWaveProvider`. Secondly, there is a section that runs in the current thread and passes the same `BufferedWaveProvider` into a `WaveOut` class that creates the sounds. Additionally, the sample makes use of a custom stream implementation, `ReadFullyStream`, which reads from the `HttpResponse` stream.

> Mark Heath a developer on NAudio wrote a [blog post](https://mark-dot-net.blogspot.com/2011/05/how-to-play-back-streaming-mp3-using.html) on this sample would be useful to read.

The important part of `ReadFullyStream` is the `Read` method.

```c#
public override int Read(byte[] buffer, int offset, int count)
{
    int bytesRead = 0;
    while (bytesRead < count)
    {
        int readAheadAvailableBytes = readAheadLength - readAheadOffset;
        int bytesRequired = count - bytesRead;
        if (readAheadAvailableBytes > 0)
        {
            int toCopy = Math.Min(readAheadAvailableBytes, bytesRequired);
            Array.Copy(readAheadBuffer, readAheadOffset, buffer, offset + bytesRead, toCopy);
            bytesRead += toCopy;
            readAheadOffset += toCopy;
        }
        else
        {
            readAheadOffset = 0;
            readAheadLength = sourceStream.Read(readAheadBuffer, 0, readAheadBuffer.Length);
            if (readAheadLength == 0)
            {
                break;
            }
        }
    }
    pos += bytesRead;
    return bytesRead;
}
```

The difference between this and the default `C#` `Read` method is that the `ReadFullyStream` version only doesn't return the requested number of bytes if the stream has ended. The spec of the default `Read` method lets the number of bytes read be less than the number requested.

Quote [MSDN](https://msdn.microsoft.com/en-us/library/system.io.stream.read(v=vs.110).aspx):

> An implementation is free to return fewer bytes than requested even if the end of the stream has not been reached.

Getting the requested number of bytes is important because we need a full audio frame to work with.

Since we are going to be sending the audio to Discord, I can ignore the `WaveOut` part of the sample for now. That leaves the `BufferedWaveProvider`, or the `StreamMp3` method. *Comments are from the orignal source.*

```c#
private void StreamMp3(object state)
{
    fullyDownloaded = false;
    var url = (string)state;
    webRequest = (HttpWebRequest)WebRequest.Create(url);
    HttpWebResponse resp;
    try
    {
        resp = (HttpWebResponse)webRequest.GetResponse();
    }
    catch(WebException e)
    {
        if (e.Status != WebExceptionStatus.RequestCanceled)
        {
            ShowError(e.Message);
        }
        return;
    }
    var buffer = new byte[16384 * 4]; // needs to be big enough to hold a decompressed frame

    IMp3FrameDecompressor decompressor = null;
    try
    {
        using (var responseStream = resp.GetResponseStream())
        {
            var readFullyStream = new ReadFullyStream(responseStream);
            do
            {
                if (IsBufferNearlyFull)
                {
                    Debug.WriteLine("Buffer getting full, taking a break");
                    Thread.Sleep(500);
                }
                else
                {
                    Mp3Frame frame;
                    try
                    {
                        frame = Mp3Frame.LoadFromStream(readFullyStream);
                    }
                    catch (EndOfStreamException)
                    {
                        fullyDownloaded = true;
                        // reached the end of the MP3 file / stream
                        break;
                    }
                    catch (WebException)
                    {
                        // probably we have aborted download from the GUI thread
                        break;
                    }
                    if (decompressor == null)
                    {
                        // don't think these details matter too much - just help ACM select the right codec
                        // however, the buffered provider doesn't know what sample rate it is working at
                        // until we have a frame
                        decompressor = CreateFrameDecompressor(frame);
                        bufferedWaveProvider = new BufferedWaveProvider(decompressor.OutputFormat);
                        bufferedWaveProvider.BufferDuration = TimeSpan.FromSeconds(20); // allow us to get well ahead of ourselves
                        //this.bufferedWaveProvider.BufferedDuration = 250;
                    }
                    int decompressed = decompressor.DecompressFrame(frame, buffer, 0);
                    //Debug.WriteLine(String.Format("Decompressed a frame {0}", decompressed));
                    bufferedWaveProvider.AddSamples(buffer, 0, decompressed);
                }

            } while (playbackState != StreamingPlaybackState.Stopped);
            Debug.WriteLine("Exiting");
            // was doing this in a finally block, but for some reason
            // we are hanging on response stream .Dispose so never get there
            decompressor.Dispose();
        }
    }
    finally
    {
        if (decompressor != null)
        {
            decompressor.Dispose();
        }
    }
}
```

There is alot of code in that one method, so lets look at some pieces individually.

The beginning part of the method just gets the response stream from the url. Then then the `buffer`, `decompressor`, and the `readFullyStream` are initialized and the loop is started. Within the loop there is a check to prevent trying to put data into a full buffer. The meat of the loop, however, is the following:

```c#
if (decompressor == null)
{
    // don't think these details matter too much - just help ACM select the right codec
    // however, the buffered provider doesn't know what sample rate it is working at
    // until we have a frame
    decompressor = CreateFrameDecompressor(frame);
    bufferedWaveProvider = new BufferedWaveProvider(decompressor.OutputFormat);
    bufferedWaveProvider.BufferDuration = TimeSpan.FromSeconds(20); // allow us to get well ahead of ourselves
    //this.bufferedWaveProvider.BufferedDuration = 250;
}
int decompressed = decompressor.DecompressFrame(frame, buffer, 0);
bufferedWaveProvider.AddSamples(buffer, 0, decompressed);
```

First, it checks to see if a `IMp3FrameDecompressor` exists and creates one if it doesn't. At the same time as it creates the `IMp3FrameDecompressor`, it also creates the `BufferedWaveProvider` using the output format from the `IMp3FrameDecompressor`. That is a point that deserves emphasizing, the `BufferedWaveProvider` requires an output format and gets it from the `IMp3FrameDecompressor`.

`CreateFrameDecompressor` is fairly simple.

```c#
private static IMp3FrameDecompressor CreateFrameDecompressor(Mp3Frame frame)
{
    WaveFormat waveFormat = new Mp3WaveFormat(frame.SampleRate, frame.ChannelMode == ChannelMode.Mono ? 1 : 2,
        frame.FrameLength, frame.BitRate);
    return new AcmMp3FrameDecompressor(waveFormat);
}
```

Anyway, once it has been assured that the `IMp3FrameDecompressor` and `BufferedWaveProvider` exists, the frame is decompressed and added to the buffer, ready to be played somehow.

----

I created a `Speaker` class to encapslate all this NAudio stuff. The basically structure is the same as the NAudio sample with some additional complications having to do with having Discord play the sounds.

Here is the `Speaker` equivalent of `StreamMp3`.

```c#
public void Load(Uri url, Action<string> reportError)
{
    ThreadPool.QueueUserWorkItem(delegate
    {
        var webRequest = (HttpWebRequest)WebRequest.Create(url);
        HttpWebResponse resp;
        try
        {
            resp = (HttpWebResponse)webRequest.GetResponse();
        }
        catch (WebException e)
        {
            if (e.Status != WebExceptionStatus.RequestCanceled)
            {
                reportError(e.Message);
            }
            return;
        }
        var buffer = new byte[16384 * 4];

        lock (dowloadingLock)
        {
            IsDownloading = true;
        }

        IMp3FrameDecompressor decompressor = null;

        try
        {
            using (var responseStream = resp.GetResponseStream())
            {
                var readFullyStream = new ReadFullyStream(responseStream);

                Mp3Frame frame;
                List<Mp3Frame> frames = Enumerable.Range(0, 10).Select(i => Mp3Frame.LoadFromStream(readFullyStream)).ToList();

                while (frames.Select(f => new { SampleRate = f.SampleRate, ChannelMode = f.ChannelMode }).Distinct().Count() != 1)
                {
                    frames.RemoveAt(0);
                    frames.Add(Mp3Frame.LoadFromStream(readFullyStream));
                }

                bool keepPlaying;

                do
                {
                    if (ShouldPauseBuffering(provider))
                    {
                        Thread.Sleep(500);
                    }
                    else
                    {
                        try
                        {
                            if (frames.Any())
                            {
                                frame = frames.First();
                                frames.RemoveAt(0);
                            }
                            else
                            {
                                frame = Mp3Frame.LoadFromStream(readFullyStream);
                            }
                        }
                        catch (EndOfStreamException)
                        {
                            // reached the end of the MP3 file / stream

                            lock (dowloadingLock)
                            {
                                IsDownloading = false;
                            }

                            lock (finishedLock)
                            {
                                IsDoneDownloading = true;
                            }
                            break;
                        }
                        catch (WebException)
                        {
                            // probably we have aborted download from the GUI thread

                            lock (finishedLock)
                            {
                                IsDoneDownloading = true;
                            }
                            break;
                        }
                        if (decompressor == null)
                        {
                            decompressor = CreateFrameDecompressor(frame);
                        }

                        if(frame == null)
                        {
                            lock (finishedLock)
                            {
                                IsDoneDownloading = true;
                            }

                            lock (dowloadingLock)
                            {
                                IsDownloading = false;
                            }
                            break;
                        }

                        int decompressed = decompressor.DecompressFrame(frame, buffer, 0);
                        if (provider == null)
                        {
                            provider = new BufferedWaveProvider(decompressor.OutputFormat);
                            provider.BufferDuration = TimeSpan.FromSeconds(20);
                        }
                        provider.AddSamples(buffer, 0, decompressed);
                    }

                    lock (dowloadingLock)
                    {
                        keepPlaying = IsDownloading;
                    }

                } while (keepPlaying);

                // was doing this in a finally block, but for some reason
                // we are hanging on response stream .Dispose so never get there
                decompressor.Dispose();
            }
        }
        finally
        {
            if (decompressor != null)
            {
                decompressor.Dispose();
            }
        }
    });
}
```

So first off, the whole content of the method is wrapped in a `ThreadPool.QueueUserWorkItem`. That is also used in the NAudio sample, but future up. I decided to move it into the `Speaker` class to hide it from the Discord side of things. I had to add locks around a couple booleans (I could have used `volatile` but decided against it) but the `BufferedWaveProvider` is already thread safe.

Most of the rest of the method is the same except for some code that discards frames before the loop. This was due to a problem I had with the output format. *Remember when I said the `BufferedWaveProvider` output format was important?* [This](https://stackoverflow.com/questions/36754560/naudio-select-the-proper-frame-for-acmmp3framedecompressor) helped me figure out what the deal was, but basically anything that is not audio in the stream can cause the `OutFormat` of the first frame to not match the next frame. This mismatch trips up NAudio.

The fix is to throw out frames that don't match the next frame untill you find a string of matching frames. Ten frames was a number suggested by that stackoverflow post, and I haven't tried to figure out if there is a better number. It would probably be a good idea to take that number and store it in a configuration file.

----

The next half of streaming audio is actually playing it. To that end, I created a `Play` method on the `Speaker` class.

```c#
public void Play(int channelCount, Action<byte[], int, int> addToBuffer)
{
    lock (playingLock)
    {
        if (IsPlaying)
            return;

        IsPlaying = true;
    }

    ThreadPool.QueueUserWorkItem(delegate
    {
        var outFormat = new WaveFormat(48000, 16, channelCount);
        var keepPlaying = true;

        while (provider == null)
        {
            Thread.Sleep(500);
        }

        using (var resampler = new MediaFoundationResampler(provider, outFormat))
        {
            resampler.ResamplerQuality = 60;

            do
            {
                lock (playingLock)
                {
                    if (!IsPlaying)
                    {
                        break;
                    }
                }

                int blockSize = outFormat.AverageBytesPerSecond / 50;
                byte[] adjustedBuffer = new byte[blockSize];
                int byteCount;

                if ((byteCount = resampler.Read(adjustedBuffer, 0, blockSize)) > 0)
                {
                    if (byteCount < blockSize)
                    {
                        // Incomplete Frame
                        for (int i = byteCount; i < blockSize; i++)
                            adjustedBuffer[i] = 0;
                    }

                    lock (playingLock)
                    {
                        if (IsPlaying)
                        {
                            addToBuffer(adjustedBuffer, 0, blockSize); // Send the buffer to Discord
                        }
                    }
                }

                lock (finishedLock)
                {
                    keepPlaying = !IsDoneDownloading;
                }

                keepPlaying = keepPlaying || provider.BufferedBytes > 0;

            } while (keepPlaying);
        }
    });
}
```

The issue here was that Discord requires the audio to be in a specific format, so we have to send the bytes through a `MediaFoundationResampler`. The Discord.Net [documentation](http://rtd.discord.foxbot.me/en/docs-dev/features/voice.html) has an example in a non streaming context.

```c#
public void SendAudio(string filePath)
{
    var channelCount = _client.GetService<AudioService>().Config.Channels; // Get the number of AudioChannels our AudioService has been configured to use.
    var OutFormat = new WaveFormat(48000, 16, channelCount); // Create a new Output Format, using the spec that Discord will accept, and with the number of channels that our client supports.
    using (var MP3Reader = new Mp3FileReader(filePath)) // Create a new Disposable MP3FileReader, to read audio from the filePath parameter
    using (var resampler = new MediaFoundationResampler(MP3Reader, OutFormat)) // Create a Disposable Resampler, which will convert the read MP3 data to PCM, using our Output Format
    {
            resampler.ResamplerQuality = 60; // Set the quality of the resampler to 60, the highest quality
            int blockSize = OutFormat.AverageBytesPerSecond / 50; // Establish the size of our AudioBuffer
            byte[] buffer = new byte[blockSize];
            int byteCount;

            while((byteCount = resampler.Read(buffer, 0, blockSize)) > 0) // Read audio into our buffer, and keep a loop open while data is present
            {
                    if (byteCount < blockSize)
                    {
                            // Incomplete Frame
                            for (int i = byteCount; i < blockSize; i++)
                                    buffer[i] = 0;
                    }
                    _vClient.Send(buffer, 0, blockSize); // Send the buffer to Discord
            }
    }

}
```

You can see that I referenced this heavily when creating the `Play` method. The other main difference is that I abstraced out the Discord.Net audio client to a action method that is passed in. This removes dependenices on Discord from the Speaker class.

Here is how the Discord.Net bot uses the speaker class.

```c#
var speaker = new Speaker();

speaker.Load(url,
    (error) =>
    {
        Reply(e, $"Error playing audio: {error}").Wait();
    });

speaker.Play(channelCount,
    (b, offset, count) =>
    {
        audio.Send(b, offset, count);
    });
```

I hope you have found this post interesting and/or useful. I will now post the full class for the speaker class as it is not yet up on github.

```c#
using NAudio.Wave;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Threading;

namespace PodcastPlayerDiscordBot
{
    public class Speaker
    {
        private object dowloadingLock = new object();
        private object finishedLock = new object();
        private object playingLock = new object();

        private bool IsDownloading { get; set; }
        private bool IsDoneDownloading { get; set; } = false;
        private bool IsPlaying { get; set; }

        private BufferedWaveProvider provider { get; set; } = null;

        public Speaker() { }

        public void Stop()
        {
            provider.ClearBuffer();

            lock (dowloadingLock)
            {
                IsDownloading = false;
            }
            lock(playingLock)
            {
                IsPlaying = false;
            }
        }

        public bool IsSpeaking()
        {
            var temp = false;

            lock (playingLock)
            {
                temp = IsPlaying;
            }

            return temp;
        }

        public void Play(int channelCount, Action<byte[], int, int> addToBuffer)
        {
            lock (playingLock)
            {
                if (IsPlaying)
                    return;

                IsPlaying = true;
            }

            ThreadPool.QueueUserWorkItem(delegate
            {
                var outFormat = new WaveFormat(48000, 16, channelCount);
                var keepPlaying = true;

                while (provider == null)
                {
                    Thread.Sleep(500);
                }

                using (var resampler = new MediaFoundationResampler(provider, outFormat))
                {
                    resampler.ResamplerQuality = 60;

                    do
                    {
                        lock (playingLock)
                        {
                            if (!IsPlaying)
                            {
                                break;
                            }
                        }

                        int blockSize = outFormat.AverageBytesPerSecond / 50;
                        byte[] adjustedBuffer = new byte[blockSize];
                        int byteCount;

                        if ((byteCount = resampler.Read(adjustedBuffer, 0, blockSize)) > 0)
                        {
                            if (byteCount < blockSize)
                            {
                                // Incomplete Frame
                                for (int i = byteCount; i < blockSize; i++)
                                    adjustedBuffer[i] = 0;
                            }

                            lock (playingLock)
                            {
                                if (IsPlaying)
                                {
                                    addToBuffer(adjustedBuffer, 0, blockSize); // Send the buffer to Discord
                                }
                            }
                        }

                        lock (finishedLock)
                        {
                            keepPlaying = !IsDoneDownloading;
                        }

                        keepPlaying = keepPlaying || provider.BufferedBytes > 0;

                    } while (keepPlaying);
                }
            });
        }

        public void Load(string url, Action<string> reportError)
        {
            Load(new Uri(url), reportError);
        }

        public void Load(Uri url, Action<string> reportError)
        {
            ThreadPool.QueueUserWorkItem(delegate
            {
                var webRequest = (HttpWebRequest)WebRequest.Create(url);
                HttpWebResponse resp;
                try
                {
                    resp = (HttpWebResponse)webRequest.GetResponse();
                }
                catch (WebException e)
                {
                    if (e.Status != WebExceptionStatus.RequestCanceled)
                    {
                        reportError(e.Message);
                    }
                    return;
                }
                var buffer = new byte[16384 * 4];

                lock (dowloadingLock)
                {
                    IsDownloading = true;
                }

                IMp3FrameDecompressor decompressor = null;

                try
                {
                    using (var responseStream = resp.GetResponseStream())
                    {
                        var readFullyStream = new ReadFullyStream(responseStream);

                        Mp3Frame frame;
                        List<Mp3Frame> frames = Enumerable.Range(0, 10).Select(i => Mp3Frame.LoadFromStream(readFullyStream)).ToList();

                        while (frames.Select(f => new { SampleRate = f.SampleRate, ChannelMode = f.ChannelMode }).Distinct().Count() != 1)
                        {
                            frames.RemoveAt(0);
                            frames.Add(Mp3Frame.LoadFromStream(readFullyStream));
                        }

                        bool keepPlaying;

                        do
                        {
                            if (ShouldPauseBuffering(provider))
                            {
                                Thread.Sleep(500);
                            }
                            else
                            {
                                try
                                {
                                    if (frames.Any())
                                    {
                                        frame = frames.First();
                                        frames.RemoveAt(0);
                                    }
                                    else
                                    {
                                        frame = Mp3Frame.LoadFromStream(readFullyStream);
                                    }
                                }
                                catch (EndOfStreamException)
                                {
                                    // reached the end of the MP3 file / stream

                                    lock (dowloadingLock)
                                    {
                                        IsDownloading = false;
                                    }

                                    lock (finishedLock)
                                    {
                                        IsDoneDownloading = true;
                                    }
                                    break;
                                }
                                catch (WebException)
                                {
                                    // probably we have aborted download from the GUI thread

                                    lock (finishedLock)
                                    {
                                        IsDoneDownloading = true;
                                    }
                                    break;
                                }
                                if (decompressor == null)
                                {
                                    decompressor = CreateFrameDecompressor(frame);
                                }

                                if(frame == null)
                                {
                                    lock (finishedLock)
                                    {
                                        IsDoneDownloading = true;
                                    }

                                    lock (dowloadingLock)
                                    {
                                        IsDownloading = false;
                                    }
                                    break;
                                }

                                int decompressed = decompressor.DecompressFrame(frame, buffer, 0);
                                if (provider == null)
                                {
                                    provider = new BufferedWaveProvider(decompressor.OutputFormat);
                                    provider.BufferDuration = TimeSpan.FromSeconds(20);
                                }
                                provider.AddSamples(buffer, 0, decompressed);
                            }

                            lock (dowloadingLock)
                            {
                                keepPlaying = IsDownloading;
                            }

                        } while (keepPlaying);

                        // was doing this in a finally block, but for some reason
                        // we are hanging on response stream .Dispose so never get there
                        decompressor.Dispose();
                    }
                }
                finally
                {
                    if (decompressor != null)
                    {
                        decompressor.Dispose();
                    }
                }
            });
        }

        private bool ShouldPauseBuffering(BufferedWaveProvider provider)
        {
            return provider != null &&
               provider.BufferLength - provider.BufferedBytes
               < provider.WaveFormat.AverageBytesPerSecond / 4;
        }

        private static IMp3FrameDecompressor CreateFrameDecompressor(Mp3Frame frame)
        {
            WaveFormat waveFormat = new Mp3WaveFormat(frame.SampleRate, frame.ChannelMode == ChannelMode.Mono ? 1 : 2,
                frame.FrameLength, frame.BitRate);
            return new AcmMp3FrameDecompressor(waveFormat);

        }
    }
}
```