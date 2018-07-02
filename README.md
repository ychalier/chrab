# sraberry
NodeJS server that runs on a Raspberry Pi.

## contribution

Please make your changes on your personal and properly named branch, then PR to the branch `dev`. Do not update `prod` unless you perfectly know what you are doing. We will keep branch `master` for general information about the project, and possibly a GitHub Pages webpage to present the project when we'll reach our goal.

See this (private) [Trello board](https://trello.com/b/atZzWEwe/sraberry) to remain updated on developmment progress.

## RPI setup

First, we need to correct the **date** for HTTPS features and timestamps. After many failed
attemps, here is a solution (very sloppy, but it works):

    sudo date -s "$(wget -qSO- --max-redirect=0 google.com 2>&1 | grep Date: | cut -d' ' -f5-8)Z"

This command is in [date.sh](date.sh). Then use cron tasks to execute it regularly (every
minute for example). Use this command to edit the tasks:

    crontab -e

And then add the following line to the document:

    1 * * * * /home/pi/sraberry.date.sh

Then, we need to make it so the **server starts at boot**. Server start is achieved by the
script [start.sh](start.sh), so we just edit the rc.local:

    sudo nano /etc/rc.local

And add this line at the beginning:

    /home/pi/sraberry/start.sh

Finally, as the process is detached, we can connect its ouput using [output.sh](output.sh).
Basically, this script just retrieve the PID of the main process executing the server,
and then tails its output (which is redirected to /tmp/log in the starting command).
