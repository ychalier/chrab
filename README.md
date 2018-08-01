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

The server then starts at boot, as a service (`chrab.service`). To access the logs, use the command:

    sudo journalctl -fu chrab.service

