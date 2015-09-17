#/bin/bash

# xhost +
export DISPLAY=:0
xhost +localhost
GNOME_SHELL_JS=/home/vjeko/dev/gnome-shell-js-new gnome-shell --replace
